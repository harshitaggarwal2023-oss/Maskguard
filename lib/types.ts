export type MaskLabel = 'with_mask' | 'without_mask';

export interface Detection {
  box: [number, number, number, number]; // x, y, w, h in source-frame pixel space
  label: MaskLabel;
  confidence: number;
}

export interface DetectionResult {
  detections: Detection[];
  inference_ms: number;
}

export interface TrainingHistory {
  accuracy: number[];
  loss: number[];
  val_accuracy: number[];
  val_loss: number[];
}

export interface SessionStats {
  framesProcessed: number;
  maskedFrameFaces: number;
  unmaskedFrameFaces: number;
  lastDetectionAt: number | null;
}
