import { useState } from 'react'
import { AlertCircle } from 'lucide-react'
import { PageHeader } from '../../components/PageHeader'

const TEAMS = ['Todas', 'Engenharia de Software', 'Produto & UI/UX', 'Infraestrutura', 'Marketing']
const PERIODS = ['Últimos 7 dias', 'Últimos 30 dias', 'Últimos 90 dias']
const WEEK = [62, 68, 78, 74, 76, 40, 46]

export function AdminDashboard() {
  const [team, setTeam] = useState('Todas')
  const [period, setPeriod] = useState('Últimos 30 dias')

  return (
    <>
      <PageHeader
        title="Dashboard Gerencial"
        subtitle="Indicadores agregados de saúde e bem-estar do seu ecossistema corporativo."
        right={<span className="pill">Acesso Administrativo</span>}
      />

      <div className="row between gap-16" style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 12, padding: '12px 16px' }}>
        <div className="row gap-12" style={{ alignItems: 'flex-start' }}>
          <AlertCircle size={16} color="#d97706" style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <div className="small" style={{ fontWeight: 700 }}>Privacidade &amp; Anonimato Garantidos</div>
            <div className="xs muted" style={{ lineHeight: 1.5 }}>
              Algumas equipes possuem menos de 5 respondentes ativos. Exibindo apenas dados agregados gerais para garantir a proteção de dados individuais.
            </div>
          </div>
        </div>
        <span className="badge badge-red" style={{ background: '#fde2e2', whiteSpace: 'nowrap' }}>Dados insuficientes para exibir com segurança</span>
      </div>

      <div className="row between mt-16 gap-12">
        <div className="row gap-8">
          <select className="select" style={{ width: 'auto', height: 32, fontSize: 12, fontWeight: 600 }} value={team} onChange={(e) => setTeam(e.target.value)}>
            {TEAMS.map((t) => <option key={t} value={t}>Equipes: {t}</option>)}
          </select>
          <select className="select" style={{ width: 'auto', height: 32, fontSize: 12, fontWeight: 600 }} value={period} onChange={(e) => setPeriod(e.target.value)}>
            {PERIODS.map((p) => <option key={p} value={p}>Período: {p}</option>)}
          </select>
        </div>
        <span className="xs muted">Última atualização: Hoje às 08:30h (Atualizado diariamente)</span>
      </div>

      <div className="grid grid-4 mt-16">
        <Kpi label="Bem-estar Médio" value="78.4%" delta="↑ 2.4%" desc="Média geral satisfatória" />
        <Kpi label="Estresse Ocupacional" value="32.1%" delta="↓ 1.2%" desc="Baixo risco de sobrecarga" />
        <Kpi label="Carga Percebida" value="Regular" delta="Estável" desc="Volume condizente com horas" />
        <Kpi label="Technostress" value="41.5%" delta="↑ 0.8%" desc="Fadiga de tela em monitoramento" />
      </div>

      <div className="grid grid-main-side mt-16" style={{ alignItems: 'start' }}>
        <div className="card">
          <div className="card-title" style={{ fontSize: 13 }}>Índice de Engajamento Semanal</div>
          <div className="xs muted">Média diária de preenchimento dos check-ins</div>
          <div className="bars mt-24">
            {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((d, i) => (
              <div key={d} className="bar">
                <div style={{ height: `${WEEK[i]}%` }} title={`${WEEK[i]}%`} />
                {d}
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="card-title" style={{ fontSize: 13 }}>Fatores de Atenção</div>
          <div className="stack gap-12 mt-16">
            <Factor color="var(--orange)" title="Sobrecarga de Tela (TI)" desc="Profissionais reportam maior cansaço visual às quintas-feiras." />
            <Factor color="var(--green)" title="Intervalos de Descanso" desc="Adesão de 82% à pausa de ergonomia sugerida." />
          </div>
        </div>
      </div>
    </>
  )
}

function Kpi({ label, value, delta, desc }: { label: string; value: string; delta: string; desc: string }) {
  return (
    <div className="card" style={{ padding: 14 }}>
      <div className="xs" style={{ color: 'var(--text-2)' }}>{label}</div>
      <div className="row gap-8 mt-8" style={{ alignItems: 'baseline' }}>
        <span style={{ fontSize: 22, fontWeight: 800 }}>{value}</span>
        <span className="xs" style={{ color: 'var(--green)', fontWeight: 600 }}>{delta}</span>
      </div>
      <div className="xs muted mt-8">{desc}</div>
    </div>
  )
}

function Factor({ color, title, desc }: { color: string; title: string; desc: string }) {
  return (
    <div className="row gap-8" style={{ alignItems: 'flex-start' }}>
      <span style={{ width: 6, height: 6, borderRadius: 3, background: color, marginTop: 6, flexShrink: 0 }} />
      <div>
        <div className="small" style={{ fontWeight: 600 }}>{title}</div>
        <div className="xs muted">{desc}</div>
      </div>
    </div>
  )
}
