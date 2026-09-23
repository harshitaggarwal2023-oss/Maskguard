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
_cascade_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
face_cascade = cv2.CascadeClassifier(_cascade_path)


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

    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    faces = face_cascade.detectMultiScale(
        gray, scaleFactor=1.1, minNeighbors=5, minSize=(60, 60)
    )

    detections: List[Detection] = []

    if len(faces) > 0:
        crops = []
        boxes = []
        for (x, y, w, h) in faces:
            x, y = max(0, x), max(0, y)
            face = frame[y : y + h, x : x + w]
            if face.size == 0:
                continue
            face_rgb = cv2.cvtColor(face, cv2.COLOR_BGR2RGB)
            face_rgb = cv2.resize(face_rgb, (224, 224))
            face_arr = img_to_array(face_rgb)
            face_arr = preprocess_input(face_arr)
            crops.append(face_arr)
            boxes.append((int(x), int(y), int(w), int(h)))

        if crops:
            batch = np.array(crops, dtype=np.float32)
            preds = model.predict(batch, verbose=0)

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
