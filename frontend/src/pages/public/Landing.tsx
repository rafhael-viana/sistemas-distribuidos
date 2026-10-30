import { Link, useNavigate } from 'react-router-dom'
import { LockOpen, ShieldCheck, Activity, Brain, Monitor } from 'lucide-react'
import { Logo } from '../../components/Logo'

export function Landing() {
  const navigate = useNavigate()
  return (
    <div style={{ background: '#fff' }}>
      <header className="landing-nav">
        <Logo size={24} />
        <nav>
          <a href="#sobre" className="hide-sm">Sobre Nós</a>
          <a href="#metodologia" className="hide-sm">Metodologia</a>
          <a href="#privacidade" className="hide-sm">Privacidade</a>
          <Link to="/login" className="btn btn-soft">Entrar</Link>
          <Link to="/cadastro" className="btn btn-primary">Criar conta</Link>
        </nav>
      </header>

      <section className="landing-hero">
        <div>
          <span className="pill no-dot">
            <ShieldCheck size={12} /> Sua privacidade é nossa prioridade absoluta
          </span>
          <h1>Sua jornada mais saudável e produtiva começa aqui.</h1>
          <p className="lead">
            Profissionais de TI enfrentam diariamente longas jornadas, altos níveis de estresse, risco de burnout e
            desafios ergonômicos. Unimos produtividade, saúde e bem-estar em um só lugar de maneira 100% segura.
          </p>
          <div className="row gap-12 mt-24" style={{ background: '#f7f3fd', borderRadius: 12, padding: '14px 16px', maxWidth: 470 }}>
            <div className="icon-circle" style={{ margin: 0, flexShrink: 0 }}>
              <LockOpen size={15} />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>Garantia de Anonimato</div>
              <div className="small muted" style={{ lineHeight: 1.5 }}>
                Suas respostas individuais nunca são compartilhadas com gestores. O RH só visualiza dados anonimizados e
                agregados da equipe.
              </div>
            </div>
          </div>
          <button className="btn btn-primary btn-lg mt-24" onClick={() => navigate('/cadastro')}>
            Começar Agora
          </button>
        </div>
        <HeroVisual />
      </section>

      <section id="metodologia" className="landing-section">
        <h2>Metodologia</h2>
        <p className="muted" style={{ maxWidth: 640, lineHeight: 1.6 }}>
          Check-ins curtos e periódicos medem carga de trabalho, estresse, fadiga cognitiva e technostress. Cada resposta
          gera uma devolutiva pessoal e alimenta indicadores agregados para o RH.
        </p>
        <div className="grid grid-3 mt-24">
          {[
            { icon: Activity, t: 'Check-ins periódicos', d: '3 perguntas rápidas, duas vezes por semana, no seu canal preferido.' },
            { icon: Brain, t: 'Devolutivas pessoais', d: 'Insights e dicas personalizadas a partir das suas respostas.' },
            { icon: Monitor, t: 'Ergonomia e foco', d: 'Lembretes de pausa ativa e dicas para reduzir a fadiga visual.' },
          ].map(({ icon: Icon, t, d }) => (
            <div key={t} className="card">
              <div className="icon-circle"><Icon size={16} /></div>
              <div className="card-title">{t}</div>
              <p className="small muted mt-8" style={{ lineHeight: 1.5 }}>{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="privacidade" className="landing-section" style={{ paddingTop: 0 }}>
        <h2 id="sobre">Privacidade em primeiro lugar</h2>
        <p className="muted" style={{ maxWidth: 640, lineHeight: 1.6 }}>
          A MindSync segue a LGPD: você decide o que compartilhar, pode exportar seus dados ou pedir a exclusão a qualquer
          momento, e o RH só vê grupos com no mínimo 5 participantes.
        </p>
      </section>

      <footer className="landing-footer">
        DESENVOLVIDO DE ACORDO COM A LGPD E RESOLUÇÕES DE SAÚDE OCUPACIONAL
        <div className="links">
          <a href="#privacidade">Política de Privacidade</a>
          <span>•</span>
          <a href="#privacidade">Termos de Uso</a>
        </div>
      </footer>
    </div>
  )
}

// Ilustração no lugar da foto do protótipo: parede de monitores com ondas neon em tons de roxo.
function HeroVisual() {
  return (
    <div className="hero-visual">
      <svg viewBox="0 0 400 360" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} aria-hidden>
        <defs>
          <linearGradient id="wave" x1="0" x2="1">
            <stop offset="0" stopColor="#22d3ee" />
            <stop offset=".5" stopColor="#f0abfc" />
            <stop offset="1" stopColor="#a78bfa" />
          </linearGradient>
        </defs>
        <rect x="70" y="18" width="260" height="6" rx="3" fill="#fde68a" opacity=".85" />
        {[
          [24, 80],
          [150, 70],
          [276, 80],
          [24, 200],
          [150, 190],
          [276, 200],
        ].map(([x, y], i) => (
          <g key={i}>
            <rect x={x} y={y} width="100" height="100" rx="8" fill="#1e1035" stroke="#7c3aed" strokeOpacity=".6" />
            <path
              d={`M${x + 6} ${y + 60} q 22 -40 44 0 t 44 0`}
              fill="none"
              stroke="url(#wave)"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <rect x={x + 8} y={y + 10} width="40" height="5" rx="2" fill="#a78bfa" opacity=".6" />
            <rect x={x + 8} y={y + 20} width="26" height="5" rx="2" fill="#a78bfa" opacity=".35" />
          </g>
        ))}
        <path d="M20 330 C 120 250, 280 360, 380 270" fill="none" stroke="url(#wave)" strokeWidth="2" opacity=".6" />
      </svg>
    </div>
  )
}
