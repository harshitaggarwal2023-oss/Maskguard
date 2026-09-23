export default function AvatarMockup({ masked = true }: { masked?: boolean }) {
  const accent = masked ? '#0FA3A0' : '#E8735C';
  return (
    <svg viewBox="0 0 240 240" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label={masked ? 'Illustrated avatar wearing a mask, detected' : 'Illustrated avatar without a mask, detected'}>
      <circle cx="120" cy="120" r="118" fill="#FCFCFA" stroke="#E4E7EC" />
      {/* face */}
      <ellipse cx="120" cy="128" rx="52" ry="60" fill="#F3D9C4" />
      {/* hair */}
      <path d="M68 108c0-38 24-62 52-62s52 24 52 62c-10-14-30-8-52-8s-42-6-52 8Z" fill="#3B2E2A" />
      {/* eyes */}
      <circle cx="100" cy="120" r="4" fill="#1F2430" />
      <circle cx="140" cy="120" r="4" fill="#1F2430" />
      {masked ? (
        <path
          d="M78 150c14 20 70 20 84 0v22c-14 16-70 16-84 0Z"
          fill="#FFFFFF"
          stroke={accent}
          strokeWidth="2"
        />
      ) : (
        <path d="M104 158q16 12 32 0" stroke="#1F2430" strokeWidth="3" strokeLinecap="round" fill="none" />
      )}
      {/* bounding box */}
      <rect
        x="52"
        y="58"
        width="136"
        height="146"
        rx="14"
        stroke={accent}
        strokeWidth="3"
        fill="none"
        strokeDasharray={masked ? undefined : '6 6'}
      />
      {/* label chip */}
      <rect x="52" y="34" width={masked ? 78 : 92} height="26" rx="13" fill={accent} />
      <text x={masked ? 91 : 98} y="51" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="12" fontWeight="600" fill="#FCFCFA">
        {masked ? 'Mask · 97%' : 'No Mask · 94%'}
      </text>
    </svg>
  );
}
