/**
 * Animated gradient-mesh background layer.
 *
 * The "Apple product page" trick: put the saturated, animated color in a
 * blurred background layer, and let the glass panels above it stay mostly
 * neutral/translucent. What reads as "colorful" is the blur-through, not the
 * panels themselves — that's what keeps typography and UI feeling calm while
 * the page as a whole feels vivid.
 *
 * Each blob is a large heavily-blurred low-opacity radial and drifts on its
 * own timing (14s / 18s / 22s) via `.mesh-blob` in globals.css. Different
 * durations + delays = they don't sync, so the composite motion never
 * "resets" visibly. `prefers-reduced-motion` freezes them (see globals.css).
 *
 * `intensity` controls opacity for secondary uses (about-page header, CTA
 * band) so the mesh doesn't compete with the primary hero.
 */
export default function GradientMesh({
  intensity = 'full',
  className = '',
}: {
  intensity?: 'full' | 'soft';
  className?: string;
}) {
  const base = intensity === 'full' ? 1 : 0.55;
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
    >
      {/* Teal blob — top-left */}
      <div
        className="mesh-blob absolute rounded-full"
        style={{
          top: '-15%',
          left: '-10%',
          width: '55%',
          height: '55%',
          background: 'radial-gradient(circle at center, #0EA5A0 0%, rgba(14,165,160,0) 65%)',
          opacity: 0.55 * base,
          filter: 'blur(80px)',
          animationDuration: '14s',
          animationDelay: '0s',
        }}
      />
      {/* Violet blob — top-right */}
      <div
        className="mesh-blob absolute rounded-full"
        style={{
          top: '-5%',
          right: '-15%',
          width: '60%',
          height: '60%',
          background: 'radial-gradient(circle at center, #6D5EF0 0%, rgba(109,94,240,0) 65%)',
          opacity: 0.5 * base,
          filter: 'blur(90px)',
          animationDuration: '18s',
          animationDelay: '-3s',
        }}
      />
      {/* Coral blob — bottom-center (subtle warmth, matches the safety-color palette
        without ever appearing on a "no mask" element) */}
      <div
        className="mesh-blob absolute rounded-full"
        style={{
          bottom: '-20%',
          left: '30%',
          width: '50%',
          height: '50%',
          background: 'radial-gradient(circle at center, #E8735C 0%, rgba(232,115,92,0) 65%)',
          opacity: 0.28 * base,
          filter: 'blur(100px)',
          animationDuration: '22s',
          animationDelay: '-8s',
        }}
      />
      {/* Deep-violet blob — bottom-left */}
      <div
        className="mesh-blob absolute rounded-full"
        style={{
          bottom: '-10%',
          left: '-15%',
          width: '45%',
          height: '45%',
          background: 'radial-gradient(circle at center, #5142C4 0%, rgba(81,66,196,0) 65%)',
          opacity: 0.35 * base,
          filter: 'blur(85px)',
          animationDuration: '20s',
          animationDelay: '-5s',
        }}
      />
    </div>
  );
}
