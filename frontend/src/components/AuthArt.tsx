import type { ReactNode } from 'react'

// Painel roxo à esquerda das telas de login e cadastro.
export function AuthArt({ children, swirls = false }: { children: ReactNode; swirls?: boolean }) {
  return (
    <div className="auth-art">
      {swirls && (
        <>
          <Swirl style={{ top: -60, left: -40, width: 280 }} />
          <Swirl style={{ bottom: 40, right: -30, width: 90 }} />
        </>
      )}
      <div className="copy">{children}</div>
      <div className="copyright">© 2026 MindSync. Todos os direitos reservados.</div>
    </div>
  )
}

function Swirl({ style }: { style: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 200 200" className="orb" style={style} aria-hidden>
      <defs>
        <linearGradient id="sw" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f5d0fe" />
          <stop offset=".5" stopColor="#c084fc" />
          <stop offset="1" stopColor="#7c3aed" />
        </linearGradient>
      </defs>
      {[0, 1, 2, 3].map((i) => (
        <ellipse
          key={i}
          cx="100"
          cy="100"
          rx={80 - i * 8}
          ry={34 - i * 3}
          fill="none"
          stroke="url(#sw)"
          strokeWidth="14"
          transform={`rotate(${-30 + i * 28} 100 100)`}
          opacity={0.9 - i * 0.12}
        />
      ))}
    </svg>
  )
}
