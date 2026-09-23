"""
MaskGuard — Inference Microservice (internal only)

This service is NOT meant to be exposed to the public internet. It should be
bound to localhost / an internal Docker network and reached exclusively
through the Node.js gateway (backend-node), which handles auth, rate
limiting, and input validation before anything reaches this service.

Responsibilities:
  - Load the pre-trained MobileNetV2 mask classifier + label encoder once at
    startup (no retraining, no architecture changes).
  - Accept a single JPEG frame, run face detection (OpenCV DNN face
    detector, with a Haar cascade fallback), crop + preprocess each face to
    224x224 using MobileNetV2's preprocess_input, and classify it.
  - Return bounding boxes + labels + confidence. The frame itself is never
    written to disk and never persisted anywhere — it lives in memory for
    the duration of the request only.
"""

import io
import os
import pickle
import time
from typing import List

import cv2
import numpy as np
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from tensorflow.keras.applications.mobilenet_v2 import preprocess_input
from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing.image import img_to_array

MODEL_DIR = os.path.join(os.path.dirname(__file__), "model")
MODEL_PATH = os.path.join(MODEL_DIR, "mask_detector.h5")
ENCODER_PATH = os.path.join(MODEL_DIR, "label_encoder.pickle")
HISTORY_PATH = os.path.join(MODEL_DIR, "training_history.pickle")

# Internal shared-secret so this service only accepts calls that came
# through the Node gateway (defense in depth even though it should never be
# publicly reachable at all).
INTERNAL_TOKEN = os.environ.get("INTERNAL_SERVICE_TOKEN", "")

MAX_IMAGE_BYTES = 2 * 1024 * 1024  # 2MB hard cap per frame
CONFIDENCE_FLOOR = 0.0

app = FastAPI(title="MaskGuard Inference Service", docs_url=None, redoc_url=None)

print("[maskguard-inference] loading model from", MODEL_PATH)
model = load_model(MODEL_PATH)
with open(ENCODER_PATH, "rb") as f:
    label_encoder = pickle.load(f)
print("[maskguard-inference] classes:", list(label_encoder.classes_))

with open(HISTORY_PATH, "rb") as f:
    training_history = pickle.load(f)

# Face detector: OpenCV's bundled Haar cascade. Lightweight, no extra model
# download required, good enough for a single front-facing webcam subject.
cv2.setNumThreads(1)
_cascade_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
face_cascade = cv2.CascadeClassifier(_cascade_path)

# Warmup model once at startup to avoid first-request initialization delay
try:
    _dummy = np.zeros((1, 224, 224, 3), dtype=np.float32)
    _ = model(_dummy, training=False)
except Exception as e:
    print("[maskguard-inference] warmup warning:", e)


class Detection(BaseModel):
    box: List[int]  # [x, y, w, h]
    label: str
    confidence: float


class InferenceResponse(BaseModel):
    detections: List[Detection]
    inference_ms: float


def _check_internal_token(request: Request) -> None:
    if not INTERNAL_TOKEN:
        return  # not configured -> skip (dev mode); Node gateway is still the only caller in practice
    provided = request.headers.get("x-internal-token", "")
    if provided != INTERNAL_TOKEN:
        raise HTTPException(status_code=403, detail="forbidden")


@app.get("/health")
def health():
    return {"status": "ok", "model_loaded": model is not None}


@app.get("/training-history")
def get_training_history(request: Request):
    _check_internal_token(request)
    # training_history.pickle is a plain dict of per-epoch lists
    return JSONResponse(content=training_history)


@app.post("/infer", response_model=InferenceResponse)
async def infer(request: Request):
    _check_internal_token(request)

    body = await request.body()
    if len(body) == 0:
        raise HTTPException(status_code=400, detail="empty payload")
    if len(body) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=413, detail="frame too large")

    start = time.time()

    file_bytes = np.frombuffer(body, dtype=np.uint8)
    frame = cv2.imdecode(file_bytes, cv2.IMREAD_COLOR)
    if frame is None:
        raise HTTPException(status_code=400, detail="invalid image payload")

    # Downscale safeguard if frame exceeds 480px in either dimension
    orig_h, orig_w = frame.shape[:2]
    max_dim = 480
    scale = 1.0
    detect_frame = frame
    if max(orig_h, orig_w) > max_dim:
        scale = max_dim / float(max(orig_h, orig_w))
        detect_w = int(orig_w * scale)
        detect_h = int(orig_h * scale)
        detect_frame = cv2.resize(frame, (detect_w, detect_h), interpolation=cv2.INTER_AREA)

    gray = cv2.cvtColor(detect_frame, cv2.COLOR_BGR2GRAY)
    faces = face_cascade.detectMultiScale(
        gray, scaleFactor=1.2, minNeighbors=4, minSize=(30, 30)
    )

    detections: List[Detection] = []

    if len(faces) > 0:
        crops = []
        boxes = []
        for (x, y, w, h) in faces:
            # Rescale coordinates back to original frame dimensions
            if scale != 1.0:
                orig_x = int(x / scale)
                orig_y = int(y / scale)
                orig_box_w = int(w / scale)
                orig_box_h = int(h / scale)
            else:
                orig_x, orig_y, orig_box_w, orig_box_h = int(x), int(y), int(w), int(h)

            orig_x, orig_y = max(0, orig_x), max(0, orig_y)
            face = frame[orig_y : orig_y + orig_box_h, orig_x : orig_x + orig_box_w]
            if face.size == 0:
                continue
            face_rgb = cv2.cvtColor(face, cv2.COLOR_BGR2RGB)
            face_rgb = cv2.resize(face_rgb, (224, 224), interpolation=cv2.INTER_LINEAR)
            face_arr = img_to_array(face_rgb)
            face_arr = preprocess_input(face_arr)
            crops.append(face_arr)
            boxes.append((orig_x, orig_y, orig_box_w, orig_box_h))

        if crops:
            batch = np.array(crops, dtype=np.float32)
            # Direct tensor execution is much faster than model.predict on CPU
            preds = model(batch, training=False).numpy()

            for box, pred in zip(boxes, preds):
                # Binary output: pred is either shape (2,) softmax or (1,) sigmoid
                if pred.shape[-1] == 2:
                    class_idx = int(np.argmax(pred))
                    confidence = float(np.max(pred))
                else:
                    class_idx = int(pred[0] > 0.5)
                    confidence = float(pred[0]) if class_idx == 1 else float(1 - pred[0])

                label = str(label_encoder.inverse_transform([class_idx])[0])
                detections.append(
                    Detection(box=list(box), label=label, confidence=round(confidence, 4))
                )

    inference_ms = round((time.time() - start) * 1000, 2)
    return InferenceResponse(detections=detections, inference_ms=inference_ms)
