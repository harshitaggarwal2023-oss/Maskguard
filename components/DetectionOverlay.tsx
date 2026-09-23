'use client';

import { useEffect, useRef } from 'react';
import { Detection } from '@/lib/types';

interface SmoothedBox {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  confidence: number;
  targetX: number;
  targetY: number;
  targetW: number;
  targetH: number;
  targetConfidence: number;
  lastSeen: number;
}

const LERP = 0.28; // smoothing factor so boxes glide rather than jump between frames
const STALE_MS = 600; // drop a box if no matching detection arrives for this long

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

/**
 * Draws bounding boxes on a canvas positioned over the <video> element.
 * Detections arrive discretely (per inference response) but are animated
 * continuously via requestAnimationFrame + linear interpolation, so boxes
 * glide between positions instead of snapping.
 */
export default function DetectionOverlay({
  videoRef,
  detections,
  sourceWidth,
  sourceHeight,
}: {
  videoRef: React.RefObject<HTMLVideoElement>;
  detections: Detection[];
  sourceWidth: number;
  sourceHeight: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boxesRef = useRef<SmoothedBox[]>([]);
  const detectionsRef = useRef<Detection[]>(detections);
  detectionsRef.current = detections;

  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;

    const draw = () => {
      raf = requestAnimationFrame(draw);
      const rect = video.getBoundingClientRect();
      if (canvas.width !== rect.width || canvas.height !== rect.height) {
        canvas.width = rect.width;
        canvas.height = rect.height;
      }
      if (!sourceWidth || !sourceHeight) return;

      const scaleX = rect.width / sourceWidth;
      const scaleY = rect.height / sourceHeight;

      // reconcile latest detections into the smoothed box list (nearest-match by position)
      const now = performance.now();
      const incoming = detectionsRef.current;
      const used = new Set<number>();

      incoming.forEach((d) => {
        const [x, y, w, h] = d.box;
        let best = -1;
        let bestDist = Infinity;
        boxesRef.current.forEach((b, i) => {
          if (used.has(i)) return;
          const dist = Math.hypot(b.targetX - x, b.targetY - y);
          if (dist < bestDist) {
            bestDist = dist;
            best = i;
          }
        });

        if (best !== -1 && bestDist < 160) {
          const b = boxesRef.current[best];
          b.targetX = x;
          b.targetY = y;
          b.targetW = w;
          b.targetH = h;
          b.targetConfidence = d.confidence;
          b.label = d.label;
          b.lastSeen = now;
          used.add(best);
        } else {
          boxesRef.current.push({
            x,
            y,
            w,
            h,
            targetX: x,
            targetY: y,
            targetW: w,
            targetH: h,
            label: d.label,
            confidence: d.confidence,
            targetConfidence: d.confidence,
            lastSeen: now,
          });
        }
      });

      boxesRef.current = boxesRef.current.filter((b) => now - b.lastSeen < STALE_MS);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      boxesRef.current.forEach((b) => {
        b.x = lerp(b.x, b.targetX, LERP);
        b.y = lerp(b.y, b.targetY, LERP);
        b.w = lerp(b.w, b.targetW, LERP);
        b.h = lerp(b.h, b.targetH, LERP);
        b.confidence = lerp(b.confidence, b.targetConfidence, LERP);

        const isMasked = b.label === 'with_mask';
        const color = isMasked ? '#0FA3A0' : '#E8735C';
        const fillColor = isMasked ? 'rgba(15,163,160,0.10)' : 'rgba(232,115,92,0.10)';

        const rx = b.x * scaleX;
        const ry = b.y * scaleY;
        const rw = b.w * scaleX;
        const rh = b.h * scaleY;

        ctx.lineWidth = 2.5;
        ctx.strokeStyle = color;
        ctx.fillStyle = fillColor;
        const radius = 14;
        ctx.beginPath();
        ctx.roundRect(rx, ry, rw, rh, radius);
        ctx.fill();
        ctx.stroke();

        const label = `${isMasked ? 'Mask' : 'No Mask'} · ${Math.round(b.confidence * 100)}%`;
        ctx.font = '600 13px Inter, sans-serif';
        const textWidth = ctx.measureText(label).width;
        const chipW = textWidth + 20;
        const chipH = 26;
        const chipX = rx;
        const chipY = Math.max(0, ry - chipH - 6);

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.roundRect(chipX, chipY, chipW, chipH, 13);
        ctx.fill();

        ctx.fillStyle = '#FCFCFA';
        ctx.fillText(label, chipX + 10, chipY + 17);
      });
    };

    draw();
    return () => cancelAnimationFrame(raf);
  }, [videoRef, sourceWidth, sourceHeight]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden="true"
    />
  );
}
