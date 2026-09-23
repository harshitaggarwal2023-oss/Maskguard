'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import DetectionOverlay from './DetectionOverlay';
import ConsentModal from './ConsentModal';
import StatsPanel from './StatsPanel';
import GlassCard from './GlassCard';
import { getSocket } from '@/lib/socket';
import { Detection, DetectionResult, SessionStats } from '@/lib/types';

const TARGET_FPS = 8;
const JPEG_QUALITY = 0.65;

type CameraState = 'idle' | 'consent' | 'requesting' | 'active' | 'denied' | 'unsupported';

export default function WebcamFeed() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const captureCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isProcessingRef = useRef(false);

  const [cameraState, setCameraState] = useState<CameraState>('idle');
  const [detections, setDetections] = useState<Detection[]>([]);
  const [videoDims, setVideoDims] = useState({ width: 0, height: 0 });
  const [sourceDims, setSourceDims] = useState({ width: 480, height: 360 });
  const [connectionStatus, setConnectionStatus] = useState<
    'idle' | 'connecting' | 'connected' | 'error'
  >('idle');
  const [inferenceMs, setInferenceMs] = useState<number | null>(null);
  const [stats, setStats] = useState<SessionStats>({
    framesProcessed: 0,
    maskedFrameFaces: 0,
    unmaskedFrameFaces: 0,
    lastDetectionAt: null,
  });

  useEffect(() => {
    if (typeof navigator !== 'undefined' && !navigator.mediaDevices?.getUserMedia) {
      setCameraState('unsupported');
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    isProcessingRef.current = false;
    const socket = getSocket();
    socket.disconnect();
    setConnectionStatus('idle');
    setCameraState('idle');
  }, []);

  useEffect(() => stopCamera, [stopCamera]);

  const handleAllow = useCallback(async () => {
    setCameraState('requesting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 960 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setVideoDims({
          width: videoRef.current.videoWidth,
          height: videoRef.current.videoHeight,
        });
      }
      setCameraState('active');

      const socket = getSocket();
      setConnectionStatus('connecting');
      socket.connect();

      socket.off('detection_result');
      socket.off('connect');
      socket.off('ready');
      socket.off('disconnect');
      socket.off('connect_error');
      socket.off('error_message');

      socket.on('connect', () => setConnectionStatus('connected'));
      socket.on('ready', () => setConnectionStatus('connected'));
      socket.on('disconnect', () => {
        setConnectionStatus('idle');
        isProcessingRef.current = false;
      });
      socket.on('connect_error', () => {
        setConnectionStatus('error');
        isProcessingRef.current = false;
      });
      socket.on('error_message', () => {
        isProcessingRef.current = false;
      });
      socket.on('detection_result', (result: DetectionResult) => {
        isProcessingRef.current = false;
        setDetections(result.detections);
        setInferenceMs(result.inference_ms);
        setStats((prev) => {
          const masked = result.detections.filter((d) => d.label === 'with_mask').length;
          const unmasked = result.detections.filter((d) => d.label === 'without_mask').length;
          return {
            framesProcessed: prev.framesProcessed + 1,
            maskedFrameFaces: prev.maskedFrameFaces + masked,
            unmaskedFrameFaces: prev.unmaskedFrameFaces + unmasked,
            lastDetectionAt: Date.now(),
          };
        });
      });

      if (!captureCanvasRef.current) {
        captureCanvasRef.current = document.createElement('canvas');
      }

      intervalRef.current = setInterval(() => {
        const video = videoRef.current;
        const canvas = captureCanvasRef.current;
        if (!video || !canvas || video.readyState < 2) return;
        if (isProcessingRef.current) return;

        // Downscale capture canvas to max 480px dimension to prevent high latency & memory overload
        const MAX_DIM = 480;
        const vw = video.videoWidth || 640;
        const vh = video.videoHeight || 480;
        const scale = Math.min(1, MAX_DIM / Math.max(vw, vh));
        const targetW = Math.round(vw * scale);
        const targetH = Math.round(vh * scale);

        canvas.width = targetW;
        canvas.height = targetH;
        setSourceDims((prev) => (prev.width !== targetW || prev.height !== targetH ? { width: targetW, height: targetH } : prev));

        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(video, 0, 0, targetW, targetH);

        isProcessingRef.current = true;
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              isProcessingRef.current = false;
              return;
            }
            blob.arrayBuffer().then((buf) => {
              if (socket.connected) {
                socket.emit('frame', buf);
                // Watchdog: release in-flight lock after 1.5s in case network packet is dropped
                setTimeout(() => {
                  isProcessingRef.current = false;
                }, 1500);
              } else {
                isProcessingRef.current = false;
              }
            }).catch(() => {
              isProcessingRef.current = false;
            });
          },
          'image/jpeg',
          JPEG_QUALITY
        );
      }, 1000 / TARGET_FPS);
    } catch (err) {
      setCameraState('denied');
    }
  }, []);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <GlassCard className="relative overflow-hidden p-0" strong>
        <div className="relative aspect-video w-full overflow-hidden rounded-xl2 bg-ink/5">
          <video
            ref={videoRef}
            muted
            playsInline
            className="h-full w-full object-cover"
            style={{ transform: 'scaleX(-1)' }}
          />
          {cameraState === 'active' && (
            <div style={{ transform: 'scaleX(-1)' }} className="absolute inset-0">
              <DetectionOverlay
                videoRef={videoRef}
                detections={detections}
                sourceWidth={sourceDims.width}
                sourceHeight={sourceDims.height}
              />
            </div>
          )}

          {cameraState !== 'active' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
              {cameraState === 'unsupported' && (
                <p className="text-sm text-inkmuted">
                  Your browser doesn't support camera access. Try a recent version of Chrome,
                  Edge, Firefox, or Safari.
                </p>
              )}
              {cameraState === 'denied' && (
                <>
                  <p className="text-sm text-inkmuted">
                    Camera access was denied. You can re-enable it from your browser's site
                    settings, then try again.
                  </p>
                  <button
                    onClick={() => setCameraState('consent')}
                    className="rounded-full bg-accent px-5 py-2 text-sm font-medium text-surface"
                  >
                    Try again
                  </button>
                </>
              )}
              {(cameraState === 'idle' || cameraState === 'consent' || cameraState === 'requesting') && (
                <motion.button
                  onClick={() => setCameraState('consent')}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="rounded-full bg-accent px-6 py-3 text-sm font-medium text-surface shadow-glow"
                  disabled={cameraState === 'requesting'}
                >
                  {cameraState === 'requesting' ? 'Requesting camera…' : 'Start live detection'}
                </motion.button>
              )}
            </div>
          )}
        </div>
      </GlassCard>

      <StatsPanel stats={stats} connectionStatus={connectionStatus} inferenceMs={inferenceMs} />

      <ConsentModal
        open={cameraState === 'consent'}
        onAllow={handleAllow}
        onCancel={() => setCameraState('idle')}
      />
    </div>
  );
}
