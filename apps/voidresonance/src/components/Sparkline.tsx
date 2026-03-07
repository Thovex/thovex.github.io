interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  fillColor?: string;
}

export function Sparkline({ data, width = 200, height = 40, color = '#7ec8e3', fillColor }: SparklineProps) {
  if (data.length < 2) return null;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const padding = 2;
  const chartW = width - padding * 2;
  const chartH = height - padding * 2;

  const points = data.map((v, i) => {
    const x = padding + (i / (data.length - 1)) * chartW;
    const y = padding + chartH - ((v - min) / range) * chartH;
    return `${x},${y}`;
  });

  const line = points.join(' ');
  const fill = fillColor ?? color.replace(')', ', 0.15)').replace('rgb', 'rgba');
  const areaPath = `M${points[0]} ${points.slice(1).map(p => `L${p}`).join(' ')} L${padding + chartW},${padding + chartH} L${padding},${padding + chartH} Z`;

  return (
    <svg width={width} height={height} className="sparkline-svg">
      <path d={areaPath} fill={fill} />
      <polyline points={line} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      {/* Current value dot */}
      {data.length > 0 && (() => {
        const lastX = padding + ((data.length - 1) / (data.length - 1)) * chartW;
        const lastY = padding + chartH - ((data[data.length - 1] - min) / range) * chartH;
        return <circle cx={lastX} cy={lastY} r="2.5" fill={color} />;
      })()}
    </svg>
  );
}
