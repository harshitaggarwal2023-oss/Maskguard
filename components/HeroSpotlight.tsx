'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import GradientMesh from './GradientMesh';

/**
 * The hero, with the face-targeted cursor-spotlight reveal.
 *
 * Layout intent (top → bottom, no overlap):
 *   [top ~14%]  Heading "Watch it detect / before your eyes"
 *   [gap]       Empty band (enforced at runtime — see headingRef measurement)
 *   [~45%–75%]  Illustrated face + reveal ellipse (FACE_ZONE)
 *   [~78%]      "Mask Detected · 97%" chip
 *   [bottom]    Bottom-left paragraph, bottom-right CTA block
 *
 * COLLISION-PROOFING (this file's key invariant):
 *   The heading uses responsive fluid type (text-5xl → text-8xl) and a custom
 *   display font, so its rendered height varies by viewport width AND shifts
 *   after webfont load. A hard-coded percentage for FACE_ZONE.cy cannot
 *   guarantee non-overlap.
 *
 *   Instead we MEASURE the heading's real bottom edge (relative to the hero
 *   section) at runtime and treat `bottom + HEADING_SAFETY_GAP` as a hard
 *   pixel floor for:
 *     - the top edge of the reveal ellipse   (faceCy - faceRy)
 *     - the top edge of the "Mask Detected" chip
 *     - the top edge of the detection ring
 *   If the configured FACE_ZONE would place any of these above the floor,
 *   we push them down to the floor.
 *
 *   STABILITY (why this file used to flicker):
 *     The heading has an entrance animation (`hero-anim hero-reveal`,
 *     staggered by animationDelay 0.25s / 0.42s). If we observed the heading
 *     with a ResizeObserver from mount, the observer would fire dozens of
 *     times *during* that entrance animation — every one of those firings
 *     would nudge `headingFloorPx`, which would nudge `faceCy`, which would
 *     shift the reveal ellipse out from under the (still) cursor. Visible
 *     symptom: hover the face → reveal flashes on → disappears ~1s later
 *     even though the pointer never moved.
 *
 *     Fix: the ResizeObserver is only attached AFTER the heading's entrance
 *     animation has settled. We detect "settled" via `animationend` on the
 *     later of the two staggered spans, with a hard fallback timer as a
 *     safety net for browsers that don't fire animationend (reduced-motion,
 *     interrupted animations, etc.). Before settling we still take one
 *     initial measurement (so the floor is roughly correct on first paint),
 *     and we still re-measure on genuine `window.resize` and on
 *     `document.fonts.ready`. After settling we take one authoritative
 *     measurement and *then* wire up the ResizeObserver for future real
 *     layout changes (dynamic content, dev-tools zoom, etc.).
 *
 * The interaction (unchanged):
 *   1. Two illustrations exist — a "no mask" base (background) and a "mask
 *      fitted" reveal (foreground). The reveal starts fully masked-out
 *      (invisible); a canvas-generated radial-gradient mask is applied to it.
 *   2. On mousemove we track cursor position, smooth it with a per-frame
 *      lerp (0.10) so the spotlight glides rather than snapping.
 *   3. The spotlight only *reveals the mask* when the (smoothed) cursor is
 *      inside a normalized ellipse over the illustrated face (FACE_ZONE,
 *      possibly shifted down by the collision guard above).
 *   4. When the cursor is close-but-not-quite over the face, an extra
 *      12% "magnetic pull" toward the face center is blended on top of the
 *      lerp so the target feels generous.
 *   5. The reveal glow's SHAPE is defined ENTIRELY by the radial gradient's
 *      alpha stops (fully opaque near the cursor, fading to fully transparent
 *      at SPOTLIGHT_R). We deliberately do NOT clip the gradient to the
 *      FACE_ZONE ellipse — clipping produced a hard-edged blue oval where
 *      the still-partially-opaque gradient was chopped off at the ellipse
 *      boundary. FACE_ZONE is still used to GATE activation (via the
 *      proximity value computed from magnetR), so the glow only paints when
 *      the cursor is near the face — but it paints as a soft circle with no
 *      geometric boundary, not as a clipped shape.
 *   6. Entering the face zone triggers a one-shot gradient-ring detection
 *      pulse and a "Mask Detected · 97%" chip fade-in.
 *
 * Recalibrating FACE_ZONE against new artwork:
 *   Flip DEBUG_FACE_ZONE to true — the ellipse renders as a dashed outline
 *   so you can see exactly where it sits relative to the face. Adjust cx,
 *   cy, rx, ry (all 0..1 fractions of the hero section box) until the
 *   dashed ring hugs the face. If the whole illustration moves, adjust
 *   HERO_BG_Y first, then re-hug the face with the FACE_ZONE numbers.
 */

// Where the background illustration is anchored vertically inside the hero
// section. 50% = perfectly centered (original). Higher % pushes it down.
// Set to 78% here so the face sits BELOW the heading instead of behind it.
const HERO_BG_Y = '78%';

// Face zone, normalized 0..1 relative to the hero section's rendered box
// (NOT the viewport). This is the *desired* placement; the runtime guard
// may push cy downward at small viewports so the ellipse never overlaps
// the heading.
const FACE_ZONE = { cx: 0.5, cy: 0.6, rx: 0.14, ry: 0.17 };
const SPOTLIGHT_R = 200;

// --- HOTSPOT FIX -----------------------------------------------------------
// ROOT CAUSE of the "giant blue oval" bug: the old detection indicator
// (`detectionRingRef`) was sized directly from FACE_ZONE — width
// `rx*2*100%` (28% of the hero) and height `ry*2*100%` (34% of the hero).
// Those two values are NOT equal, so the element was an ELLIPSE, not a
// circle, and already close to a third of the hero's size before any
// animation ran. Its `detectPulse` keyframe then scaled that already-huge
// box up to 1.35×. The teal→purple gradient on it is what read as "blue."
// None of this was a scaling *bug* exactly — it was oversized *by
// definition*, which is why clipping/gradient tweaks wouldn't have fixed it.
//
// Fix: replace it with a small, fixed-diameter, always-circular hotspot
// (width === height, border-radius: 9999px), positioned at the same
// (collision-guarded) face-zone center as before. Its glow is clipped to
// 120% of its own size, its ripple is capped at 1.5×, and its idle pulse
// never exceeds scale(1.08) — all via transform/opacity only (GPU-safe).
const HOTSPOT_D = 64; // px — fixed diameter; never derived from FACE_ZONE.

// Minimum breathing room in pixels between the heading's bottom edge and
// the top of anything in the face zone (chip, ring, ellipse).
const HEADING_SAFETY_GAP = 40;

// How long to wait, worst-case, before we assume the heading's entrance
// animation has settled and it's safe to attach the ResizeObserver. Must be
// >= (max animationDelay on a hero-reveal span) + (duration of hero-anim
// keyframe). The staggered delays are 0.25s and 0.42s; the underlying
// keyframe animation in globals.css runs ~0.7s. 1400ms leaves headroom.
const HEADING_SETTLE_FALLBACK_MS = 1400;

// Set to `true` while calibrating a new illustration — draws the face
// ellipse as an outlined debug overlay so you can see where it lands.
const DEBUG_FACE_ZONE = false;

export default function HeroSpotlight() {
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const revealRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLDivElement>(null);
  // Refs on the two staggered heading spans so we can listen for
  // `animationend` on the *later* one (the one with the biggest delay) and
  // treat that as the "entrance settled" signal.
  const headingLine1Ref = useRef<HTMLSpanElement>(null);
  const headingLine2Ref = useRef<HTMLSpanElement>(null);

  // Raw pointer position (last mousemove) and eased "smooth" position.
  // Refs so we don't retrigger React renders on every frame.
  const mouseRef = useRef({ x: -999, y: -999 });
  const smoothRef = useRef({ x: -999, y: -999 });
  const rafRef = useRef<number | null>(null);
  const sectionRectRef = useRef<DOMRect | null>(null);

  // Hard pixel floor for the top edge of the face zone / chip / ring,
  // measured from the heading at runtime. Mirrored into a ref so the
  // per-frame `tick()` can read it without re-subscribing to state.
  const [headingFloorPx, setHeadingFloorPx] = useState(0);
  const headingFloorRef = useRef(0);

  // React state we DO want to trigger re-renders on:
  //   - `isOverFace` for the chip/ring visibility
  //   - a monotonic `pulseKey` to re-mount the detect ring so its keyframe animation replays
  const [isOverFace, setIsOverFace] = useState(false);
  const [pulseKey, setPulseKey] = useState(0);
  const wasOverFaceRef = useRef(false);

  // --- Runtime measurement of heading bottom -------------------------------
  //
  // The floor is measured from the heading's rendered bottom edge. The
  // heading has a staggered entrance animation (`hero-anim hero-reveal`),
  // during which its bounding box can shift for ~1s after mount. If we
  // observed the heading with a ResizeObserver during that window, the
  // floor would fluctuate while the user was already hovering the face
  // and the reveal ellipse would slide out from under the cursor.
  //
  // So the lifecycle is:
  //   1. On mount: take ONE initial measurement (best-effort — the heading
  //      may not have laid out yet at its final size, but we want a
  //      non-zero floor immediately so the ellipse doesn't briefly appear
  //      inside the heading text on first paint).
  //   2. Listen for `animationend` on the later heading span (line 2 has
  //      the biggest delay, so it settles last). When it fires, take an
  //      authoritative measurement — this is the value we trust.
  //   3. Fallback: if animationend never fires (reduced-motion,
  //      interrupted animation, span was removed / re-parented, etc.),
  //      trigger the same "settled" path after HEADING_SETTLE_FALLBACK_MS.
  //   4. Once settled, and ONLY once settled, attach the ResizeObserver
  //      to the heading. From now on the observer's callbacks reflect real
  //      layout changes (dev-tools zoom, dynamic content, etc.) rather
  //      than the transient entrance animation.
  //   5. Always: `window.resize` and `document.fonts.ready` re-measure,
  //      regardless of settle state. Those are genuine reasons the
  //      heading's bottom edge would move.
  useEffect(() => {
    const measure = () => {
      const section = sectionRef.current;
      const heading = headingRef.current;
      if (!section || !heading) return;
      const sRect = section.getBoundingClientRect();
      const hRect = heading.getBoundingClientRect();
      // hRect.bottom is viewport-relative; convert to section-relative.
      const bottomInSection = hRect.bottom - sRect.top;
      const floor = Math.max(0, bottomInSection + HEADING_SAFETY_GAP);
      // Only publish if it actually changed — avoids pointless re-renders
      // when nothing has moved (the observer / resize handler can fire
      // even when the measured value is byte-identical to what we had).
      if (floor !== headingFloorRef.current) {
        headingFloorRef.current = floor;
        setHeadingFloorPx(floor);
      }
    };

    // 1. Initial best-effort measurement.
    measure();

    // 5a. Genuine viewport changes → always re-measure.
    window.addEventListener('resize', measure);

    // 5b. Webfont swap → text height shifts once the display font is ready.
    type FontFaceSetLike = { ready: Promise<unknown> };
    const fonts = (document as unknown as { fonts?: FontFaceSetLike }).fonts;
    if (fonts && typeof fonts.ready?.then === 'function') {
      fonts.ready.then(measure).catch(() => {
        /* ignore — measure() already ran on mount */
      });
    }

    // 2 + 3 + 4. Settle detection.
    //
    // We consider the heading "settled" when either:
    //   (a) the later heading span dispatches `animationend`, or
    //   (b) HEADING_SETTLE_FALLBACK_MS elapses,
    // whichever comes first. `settled` guards against running the settle
    // path twice.
    let settled = false;
    let ro: ResizeObserver | null = null;

    const onSettled = () => {
      if (settled) return;
      settled = true;

      // Take one authoritative measurement now that the entrance animation
      // has finished and the heading's box is at its final size.
      measure();

      // From this point on, real layout changes (not the entrance
      // animation) should still update the floor. Attach the observer
      // *now*, not on mount.
      if (typeof ResizeObserver !== 'undefined' && headingRef.current) {
        ro = new ResizeObserver(measure);
        ro.observe(headingRef.current);
        // Note: we intentionally do NOT observe sectionRef here. The
        // section's height is driven by `100dvh` / `minHeight: 640px` —
        // both of those only change on genuine viewport events, which
        // `window.resize` already covers. Observing the section would
        // re-introduce the same class of spurious firings we just fixed.
      }
    };

    // Prefer the second (later) heading line for animationend, since it
    // has the larger animationDelay. Fall back to line 1 if line 2 isn't
    // mounted for some reason.
    const settleTarget = headingLine2Ref.current ?? headingLine1Ref.current;
    // A single element can run multiple named animations from the same
    // class (e.g. `hero-anim` + `hero-reveal` may each declare their own
    // keyframes). `animationend` fires once per animation, so we count
    // firings and only trigger the settle path on the LAST one to avoid
    // measuring mid-animation if two animations are running in parallel.
    // Simplest correct approach: on the first animationend, schedule the
    // settle for the next frame — by then any sibling animations on the
    // same element have also finished (they were all triggered by the
    // same mount and share the same delay+duration budget within a few
    // ms) or the fallback timer will catch them.
    let animEndHandler: ((e: AnimationEvent) => void) | null = null;
    if (settleTarget) {
      animEndHandler = () => {
        // rAF so any parallel animations on the same node get a chance
        // to complete their own final frame before we measure.
        requestAnimationFrame(onSettled);
      };
      settleTarget.addEventListener('animationend', animEndHandler);
    }

    // 3. Fallback safety net — always fires, even if animationend never does.
    const fallbackTimer = window.setTimeout(onSettled, HEADING_SETTLE_FALLBACK_MS);

    return () => {
      window.removeEventListener('resize', measure);
      if (settleTarget && animEndHandler) {
        settleTarget.removeEventListener('animationend', animEndHandler);
      }
      window.clearTimeout(fallbackTimer);
      if (ro) ro.disconnect();
    };
  }, []);

  useEffect(() => {
    const section = sectionRef.current;
    const canvas = canvasRef.current;
    const reveal = revealRef.current;
    if (!section || !canvas || !reveal) return;

    // Size canvas to match the hero section (not the viewport) so
    // maskImage coordinates line up 1:1 with what the user sees.
    const resize = () => {
      const rect = section.getBoundingClientRect();
      sectionRectRef.current = rect;
      canvas.width = rect.width;
      canvas.height = rect.height;
    };
    resize();
    window.addEventListener('resize', resize);

    const onMove = (e: MouseEvent) => {
      const rect = sectionRectRef.current;
      if (!rect) return;
      // Pointer coords relative to the hero section — so face-zone math
      // stays correct even if the hero isn't flush with the viewport top.
      mouseRef.current.x = e.clientX - rect.left;
      mouseRef.current.y = e.clientY - rect.top;
    };
    section.addEventListener('mousemove', onMove);
    section.addEventListener('mouseleave', () => {
      mouseRef.current.x = -999;
      mouseRef.current.y = -999;
    });

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const tick = () => {
      const rect = sectionRectRef.current;
      if (!rect) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      // Desired ellipse in pixels from the FACE_ZONE constant.
      const faceRx = FACE_ZONE.rx * rect.width;
      const faceRy = FACE_ZONE.ry * rect.height;
      const faceCx = FACE_ZONE.cx * rect.width;
      let faceCy = FACE_ZONE.cy * rect.height;

      // Collision guard: if the ellipse's top edge (faceCy - faceRy) would
      // land above the measured heading floor, push the whole ellipse down
      // so its top edge sits exactly on the floor. Keeps rx/ry unchanged so
      // the interactive area stays the same size — we only translate it.
      const floor = headingFloorRef.current;
      if (floor > 0 && faceCy - faceRy < floor) {
        faceCy = floor + faceRy;
      }

      // Base lerp toward the raw cursor
      let targetX = mouseRef.current.x;
      let targetY = mouseRef.current.y;

      // Magnetic snap: if raw cursor is within ~1.6× the ellipse extent
      // of the face center, blend an additional small pull (12%) toward
      // the face center. Outside that, no pull.
      const dx = targetX - faceCx;
      const dy = targetY - faceCy;
      const magnetR = Math.max(faceRx, faceRy) * 1.6;
      const rawDist = Math.hypot(dx, dy);
      if (rawDist > 0 && rawDist < magnetR && targetX > -900) {
        const pullStrength = 0.12 * (1 - rawDist / magnetR);
        targetX = targetX + (faceCx - targetX) * pullStrength;
        targetY = targetY + (faceCy - targetY) * pullStrength;
      }

      // Per-frame lerp toward the target (post-pull)
      smoothRef.current.x += (targetX - smoothRef.current.x) * 0.1;
      smoothRef.current.y += (targetY - smoothRef.current.y) * 0.1;

      // Is the smoothed cursor inside the (possibly shifted) face ellipse?
      const sdx = (smoothRef.current.x - faceCx) / faceRx;
      const sdy = (smoothRef.current.y - faceCy) / faceRy;
      const inside = sdx * sdx + sdy * sdy <= 1;

      if (inside !== wasOverFaceRef.current) {
        wasOverFaceRef.current = inside;
        setIsOverFace(inside);
        if (inside) setPulseKey((k) => k + 1); // replay detect-ring pulse
      }

      // Paint the canvas mask. Clear first.
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Only paint the mask reveal when the cursor is within meaningful
      // range of the face — computed via the magnet radius above so it
      // fades in *before* the cursor is fully inside the ellipse and
      // there's no jarring "pop" at the ellipse edge. The reveal div's
      // opacity is also tweened by React state (see `isOverFace`).
      //
      // IMPORTANT: We do NOT clip this gradient to the FACE_ZONE ellipse.
      // Clipping produced a visible hard-edged blue oval — the radial
      // gradient still has meaningful alpha well before its outer stop,
      // so slicing it with `ctx.clip()` chops opaque pixels along the
      // ellipse boundary and leaves a solid oval silhouette. Instead, we
      // let the gradient's own alpha stops (ending at rgba(255,255,255,0)
      // at r = SPOTLIGHT_R) be the ONLY shape — a soft circular glow with
      // no geometric boundary. FACE_ZONE still gates WHERE the glow is
      // allowed to activate (via `proximity` above, which is derived from
      // magnetR = 1.6× the ellipse extent), so hover-anywhere-else on the
      // hero still shows nothing.
      const proximity = Math.min(1, Math.max(0, 1 - rawDist / (magnetR * 1.2)));
      if (proximity > 0.01 && smoothRef.current.x > -900) {
        // SECONDARY FIX: SPOTLIGHT_R was a fixed 200px, independent of how
        // large the face illustration actually renders at the current
        // viewport. On any hero narrower/shorter than the size that
        // constant was tuned for, a 400px-diameter glow is bigger than the
        // face itself — contributing to the "covers almost the entire
        // face" symptom. Clamp it to the face ellipse's own extent so the
        // glow can never visually outgrow the illustration it's revealing.
        const glowR = Math.min(SPOTLIGHT_R, Math.max(faceRx, faceRy));
        const grad = ctx.createRadialGradient(
          smoothRef.current.x,
          smoothRef.current.y,
          0,
          smoothRef.current.x,
          smoothRef.current.y,
          glowR
        );
        grad.addColorStop(0, `rgba(255,255,255,${1 * proximity})`);
        grad.addColorStop(0.4, `rgba(255,255,255,${1 * proximity})`);
        grad.addColorStop(0.6, `rgba(255,255,255,${0.75 * proximity})`);
        grad.addColorStop(0.75, `rgba(255,255,255,${0.4 * proximity})`);
        grad.addColorStop(0.88, `rgba(255,255,255,${0.12 * proximity})`);
        grad.addColorStop(1, 'rgba(255,255,255,0)');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(smoothRef.current.x, smoothRef.current.y, glowR, 0, Math.PI * 2);
        ctx.fill();
      }

      // Convert canvas → maskImage on the reveal div.
      try {
        const dataUrl = canvas.toDataURL();
        reveal.style.maskImage = `url(${dataUrl})`;
        (reveal.style as CSSStyleDeclaration & { webkitMaskImage: string }).webkitMaskImage =
          `url(${dataUrl})`;
      } catch {
        // toDataURL can throw during resize edge cases — ignore, next frame retries.
      }

      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('resize', resize);
      section.removeEventListener('mousemove', onMove);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // CSS `top` expressions for the ring and chip. Both use `max(<desired>,
  // <heading floor>)` so they are guaranteed to sit at or below the
  // measured heading floor, regardless of viewport size. We express the
  // desired position in the same units as before (% of hero) and the floor
  // in px (for the chip we also subtract the chip's own offset).
  const ringDesiredTopPct = FACE_ZONE.cy * 100; // ring center
  // Ring is centered on faceCy, so its top edge in px = center - ry*height.
  // Enforcing "top edge >= headingFloorPx" is equivalent to enforcing
  // "center >= headingFloorPx + ry*height". In CSS we express this with
  // calc + max against the actual rendered hero height.
  const ringTopExpr = `max(${ringDesiredTopPct}%, calc(${headingFloorPx}px + ${FACE_ZONE.ry * 100}%))`;

  // Chip sits ABOVE the ellipse's top edge (cy - ry) with a -34px offset
  // for the chip's own height. Floor for the chip's top edge is exactly
  // headingFloorPx; anything lower would collide with the heading.
  const chipDesiredTopExpr = `calc(${(FACE_ZONE.cy - FACE_ZONE.ry) * 100}% - 34px)`;
  const chipTopExpr = `max(${chipDesiredTopExpr}, ${headingFloorPx}px)`;

  return (
    <section
      ref={sectionRef}
      className="relative w-full overflow-hidden"
      style={{ height: '100dvh', minHeight: '640px' }}
    >
      {/* Layer 0 — animated gradient mesh (color source that "glows through" glass) */}
      <GradientMesh />

      {/* Layer 1 — the base illustration (no mask). Slow ken-burns zoom-out on load.
        background-position pushed to `center HERO_BG_Y` so the face anchors to the
        lower part of the hero, out from under the heading. */}
      <div
        className="hero-zoom absolute inset-0 z-10 bg-no-repeat"
        style={{
          backgroundImage: 'url(/hero-base.png)',
          backgroundSize: 'contain',
          backgroundPosition: `center ${HERO_BG_Y}`,
        }}
        aria-hidden="true"
      />

      {/* Layer 2 — the reveal illustration (mask fitted). Painted-through via canvas
        maskImage. Opacity tweens between 0/1 based on face proximity so the
        boundary at the ellipse edge softens instead of popping.
        Position matches the base layer exactly so the reveal registers pixel-perfect. */}
      <div
        ref={revealRef}
        className="pointer-events-none absolute inset-0 z-30 bg-no-repeat transition-opacity duration-[180ms] ease-out"
        style={{
          backgroundImage: 'url(/hero-reveal.png)',
          backgroundSize: 'contain',
          backgroundPosition: `center ${HERO_BG_Y}`,
          maskSize: '100% 100%',
          WebkitMaskSize: '100% 100%',
          maskRepeat: 'no-repeat',
          WebkitMaskRepeat: 'no-repeat',
          opacity: isOverFace ? 1 : 0.85,
        }}
        aria-hidden="true"
      />

      {/* Hidden working canvas (renders the mask, its dataURL is applied to the reveal div) */}
      <canvas ref={canvasRef} className="pointer-events-none absolute inset-0" style={{ display: 'none' }} />

      {/* Detection hotspot — small, always-circular (width === height,
        border-radius: 9999px), positioned at the same collision-guarded
        face-zone center the old ellipse used. Only a brief one-shot ripple
        remains here (transform/opacity only, GPU-accelerated) — no
        persistent glow or filled dot, so nothing sits visibly on the face
        once the ripple finishes. Re-mounted via `key` so it replays each
        time the cursor (re-)enters the face. */}
      <div
        key={pulseKey}
        aria-hidden="true"
        className="pointer-events-none absolute z-40"
        style={{
          left: `${FACE_ZONE.cx * 100}%`,
          top: ringTopExpr,
          width: `${HOTSPOT_D}px`,
          height: `${HOTSPOT_D}px`,
          transform: 'translate(-50%, -50%)',
        }}
      >
        {/* Ripple — one-shot, capped at scale(1.5) (i.e. 1.5× the hotspot),
          transform + opacity only. Fades fully to opacity 0, so it leaves
          nothing behind once it finishes. */}
        <div
          className="absolute inset-0 rounded-full border"
          style={{
            borderColor: 'rgba(14,165,160,0.6)',
            animation: isOverFace ? 'hotspotRipple 0.8s cubic-bezier(0.16,1,0.3,1) forwards' : 'none',
            opacity: 0,
          }}
        />
      </div>


      {/* "Mask Detected · 97%" chip — fades in ABOVE the face zone while
        the cursor is over it. `top` is clamped to `headingFloorPx` so the
        chip can never encroach on the heading, no matter how tall the
        heading renders at the current viewport width. */}
      <div
        className="glass-strong pointer-events-none absolute z-40 flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold text-ink shadow-glass transition-all duration-200 ease-out"
        style={{
          left: `${FACE_ZONE.cx * 100}%`,
          top: chipTopExpr,
          transform: `translate(-50%, ${isOverFace ? '0' : '6px'})`,
          opacity: isOverFace ? 1 : 0,
        }}
      >
        <span
          className="inline-block h-1.5 w-1.5 rounded-full"
          style={{ background: 'linear-gradient(135deg, #0EA5A0 0%, #6D5EF0 100%)' }}
        />
        Mask Detected · 97%
      </div>

      {/* Debug ellipse overlay — flip DEBUG_FACE_ZONE to `true` while
        calibrating a new illustration. Uses the same clamped `top`
        expression as the ring so the debug outline reflects the real,
        collision-guarded position. */}
      {DEBUG_FACE_ZONE && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute z-[70]"
          style={{
            left: `${FACE_ZONE.cx * 100}%`,
            top: ringTopExpr,
            width: `${FACE_ZONE.rx * 2 * 100}%`,
            height: `${FACE_ZONE.ry * 2 * 100}%`,
            transform: 'translate(-50%, -50%)',
            borderRadius: '50%',
            border: '2px dashed #E8735C',
            background: 'rgba(232,115,92,0.08)',
          }}
        />
      )}

      {/* Heading — anchored top-14% as before. Its actual bottom edge is
        measured at runtime (see the measurement effect at the top of this
        component) and used as a hard floor for the ellipse / ring / chip
        above, so no overlap is possible regardless of screen size or
        webfont swap.

        The two spans carry refs so the measurement effect can listen for
        `animationend` on the later (bigger-delay) span to know when the
        entrance animation has settled — at which point (and not before)
        it's safe to attach a ResizeObserver without the observer firing
        continuously during the entrance and destabilizing the floor. */}
      <div
        ref={headingRef}
        className="pointer-events-none absolute left-0 right-0 top-[14%] z-50 flex flex-col items-center px-5 text-center"
      >
        <h1 className="text-ink" style={{ lineHeight: 0.95 }}>
          <span
            ref={headingLine1Ref}
            className="hero-anim hero-reveal block font-display text-5xl font-normal italic sm:text-7xl md:text-8xl"
            style={{ letterSpacing: '-0.05em', animationDelay: '0.25s' }}
          >
            Watch it detect
          </span>
          <span
            ref={headingLine2Ref}
            className="hero-anim hero-reveal -mt-1 block text-5xl font-normal sm:text-7xl md:text-8xl"
            style={{ letterSpacing: '-0.08em', animationDelay: '0.42s' }}
          >
            before your <span className="gradient-text">eyes</span>
          </span>
        </h1>
      </div>

      {/* Bottom-left paragraph */}
      <div
        className="hero-anim hero-fade absolute bottom-14 left-10 z-50 hidden max-w-[260px] sm:block md:left-14"
        style={{ animationDelay: '0.7s' }}
      >
        <p className="text-sm leading-relaxed text-inkmuted">
          Every frame that reaches our model is analyzed in milliseconds — a MobileNetV2 network
          fine-tuned to recognize a mask before you&apos;ve even noticed the camera focus.
        </p>
      </div>

      {/* Bottom-right block: microcopy + primary CTA */}
      <div
        className="hero-anim hero-fade absolute bottom-10 left-5 right-5 z-50 flex max-w-full flex-col items-start gap-4 sm:bottom-24 sm:left-auto sm:right-10 sm:max-w-[260px] sm:gap-5 md:right-14"
        style={{ animationDelay: '0.85s' }}
      >
        <p className="text-xs leading-relaxed text-inkmuted sm:text-sm">
          Live detection, same-second results, powered by transfer learning. Nothing you show it
          is ever recorded or stored.
        </p>
        <Link
          href="/detect"
          className="rounded-full bg-brand-gradient px-7 py-3 text-sm font-medium text-white transition-all hover:scale-[1.03] hover:shadow-glow hover:brightness-110 active:scale-95"
        >
          Try Live Detection
        </Link>
      </div>
    </section>
  );
}
