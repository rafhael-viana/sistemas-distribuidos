interface LineChartProps {
  values: number[]
  max: number
  labels?: string[]
  height?: number
  grid?: boolean
  dot?: boolean
}

// Gráfico de linha simples em SVG, no estilo dos cards do protótipo.
export function LineChart({ values, max, labels, height = 110, grid = true, dot = false }: LineChartProps) {
  const w = 400
  const pad = 6
  const step = (w - pad * 2) / Math.max(values.length - 1, 1)
  const points = values.map((v, i) => [pad + i * step, height - pad - (v / max) * (height - pad * 2)] as const)
  const d = points.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const last = points[points.length - 1]

  return (
    <div>
      <svg viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" style={{ width: '100%', height }}>
        {grid &&
          [0.25, 0.5, 0.75, 1].map((f) => (
            <line key={f} x1="0" x2={w} y1={height * f - 1} y2={height * f - 1} stroke="#eef0f4" strokeWidth="1" />
          ))}
        <path d={d} fill="none" stroke="#7c3aed" strokeWidth="2.2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        {dot && last && <circle cx={last[0]} cy={last[1]} r="3" fill="#7c3aed" />}
      </svg>
      {labels && (
        <div className="chart-axis">
          {labels.map((l) => (
            <span key={l}>{l}</span>
          ))}
        </div>
      )}
    </div>
  )
}
