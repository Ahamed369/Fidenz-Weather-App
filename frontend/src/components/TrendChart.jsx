/**
 * Minimal SVG sparkline for a city's next-24h temperature trend.
 * No charting library added on purpose — 8 data points doesn't justify the
 * bundle-size cost of recharts/chart.js; a hand-rolled polyline is simpler
 * to reason about and easier to explain live.
 */
export function TrendChart({ points, width = 220, height = 70 }) {
  if (!points || points.length === 0) return null;

  const temps = points.map((p) => p.temperatureC);
  const min = Math.min(...temps);
  const max = Math.max(...temps);
  const range = max - min || 1;
  const padding = 6;

  const coords = points.map((p, i) => {
    const x = padding + (i / (points.length - 1)) * (width - padding * 2);
    const y = height - padding - ((p.temperatureC - min) / range) * (height - padding * 2);
    return { x, y };
  });

  const path = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x} ${c.y}`).join(" ");

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <path d={path} fill="none" stroke="var(--accent-cool)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {coords.map((c, i) => (
        <circle key={i} cx={c.x} cy={c.y} r="2.5" fill="var(--accent-cool)" />
      ))}
      <text x={padding} y={12} fontFamily="var(--font-mono)" fontSize="10" fill="var(--text-muted)">
        {max}°C
      </text>
      <text x={padding} y={height - 2} fontFamily="var(--font-mono)" fontSize="10" fill="var(--text-muted)">
        {min}°C
      </text>
    </svg>
  );
}
