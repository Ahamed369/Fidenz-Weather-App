/**
 * A semicircular gauge (0-180deg) mapping a 0-100 comfort score to a
 * needle angle. Color interpolates from warm amber (low comfort) to
 * ice-cyan (high comfort) -- deliberately a *comfort* gradient, not a
 * temperature gradient, since the least comfortable city isn't always
 * the hottest one (it could be freezing + windy instead).
 */
export function ComfortGauge({ score, size = 140 }) {
  const clamped = Math.max(0, Math.min(100, score));
  const angle = (clamped / 100) * 180; // 0 = left, 180 = right
  const radius = size / 2 - 10;
  const cx = size / 2;
  const cy = size / 2;

  const toXY = (deg) => {
    const rad = (Math.PI * (180 - deg)) / 180;
    return { x: cx + radius * Math.cos(rad), y: cy - radius * Math.sin(rad) };
  };

  const needle = toXY(angle);
  const color = `color-mix(in srgb, var(--accent-warm) ${100 - clamped}%, var(--accent-cool) ${clamped}%)`;

  const arcPath = (startDeg, endDeg) => {
    const s = toXY(startDeg);
    const e = toXY(endDeg);
    return `M ${s.x} ${s.y} A ${radius} ${radius} 0 0 1 ${e.x} ${e.y}`;
  };

  return (
    <svg width={size} height={size / 1.7} viewBox={`0 0 ${size} ${size / 1.7 + 6}`}>
      <path d={arcPath(0, 180)} fill="none" stroke="var(--border)" strokeWidth="10" strokeLinecap="round" />
      <path d={arcPath(0, angle)} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round" />
      <line x1={cx} y1={cy} x2={needle.x} y2={needle.y} stroke="var(--text-primary)" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r="4" fill="var(--text-primary)" />
      <text
        x={cx}
        y={cy - 14}
        textAnchor="middle"
        fontFamily="var(--font-mono)"
        fontSize="22"
        fontWeight="600"
        fill="var(--text-primary)"
      >
        {clamped}
      </text>
    </svg>
  );
}
