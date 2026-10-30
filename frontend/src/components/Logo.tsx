interface LogoProps {
  variant?: 'light' | 'dark'
  size?: number
}

// Logotipo "MindSync" com a linha de batimento cardíaco sob o texto.
export function Logo({ variant = 'dark', size = 22 }: LogoProps) {
  const color = variant === 'light' ? '#fff' : '#0f172a'
  return (
    <div className="logo" style={{ display: 'inline-flex', flexDirection: 'column', color, lineHeight: 1 }}>
      <span style={{ fontSize: size, letterSpacing: '-0.01em' }}>
        <b style={{ fontWeight: 700 }}>Mind</b>
        <span style={{ fontWeight: 300 }}>Sync</span>
      </span>
      <svg viewBox="0 0 120 10" style={{ width: size * 3.3, height: size * 0.4, marginTop: 1 }} aria-hidden>
        <circle cx="2" cy="5" r="1.6" fill={color} />
        <path d="M2 5h48l3-4 4 8 3-6 2 2h56" fill="none" stroke={color} strokeWidth="1" />
        <circle cx="118" cy="5" r="1.6" fill={color} />
      </svg>
    </div>
  )
}
