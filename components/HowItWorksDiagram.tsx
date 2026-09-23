const nodes = [
  { label: 'Your webcam', sub: 'Frame captured in-browser' },
  { label: 'Node gateway', sub: 'Validated · rate-limited' },
  { label: 'Python inference', sub: 'MobileNetV2 classifier' },
  { label: 'Live overlay', sub: 'Box + label, animated back' },
];

export default function HowItWorksDiagram() {
  return (
    <svg
      viewBox="0 0 900 220"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Data flow diagram: webcam to Node gateway to Python inference service and back to a live overlay"
      className="w-full"
    >
      <defs>
        <marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
          <path d="M0,0 L10,5 L0,10 Z" fill="#0FA3A0" />
        </marker>
      </defs>

      {nodes.map((n, i) => {
        const x = 40 + i * 280;
        return (
          <g key={n.label}>
            <rect
              x={x}
              y="70"
              width="210"
              height="90"
              rx="18"
              fill="#FCFCFA"
              stroke="#E4E7EC"
              strokeWidth="1.5"
            />
            <circle cx={x + 30} cy={100} r="9" fill="#CFEFEC" />
            <circle cx={x + 30} cy={100} r="4" fill="#0FA3A0" />
            <text x={x + 50} y="105" fontFamily="Fraunces, serif" fontSize="16" fill="#1F2430">
              {n.label}
            </text>
            <text x={x + 20} y="132" fontFamily="Inter, sans-serif" fontSize="12" fill="#5B6472">
              {n.sub}
            </text>
            {i < nodes.length - 1 && (
              <line
                x1={x + 210}
                y1="115"
                x2={x + 270}
                y2="115"
                stroke="#0FA3A0"
                strokeWidth="2"
                markerEnd="url(#arrow)"
              />
            )}
          </g>
        );
      })}
    </svg>
  );
}
