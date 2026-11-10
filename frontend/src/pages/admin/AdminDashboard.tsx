import { useEffect, useState } from 'react'
import { AlertCircle } from 'lucide-react'
import { PageHeader } from '../../components/PageHeader'
import { listTeams, type Team } from '../../api/org'
import { useTenantScope } from '../../context/TenantScope'

const PERIODS = ['Últimos 7 dias', 'Últimos 30 dias', 'Últimos 90 dias']
const WEEK = [62, 68, 78, 74, 76, 40, 46]

export function AdminDashboard() {
  const { tenantId, isAdmin } = useTenantScope()
  const [teams, setTeams] = useState<Team[]>([])
  const [team, setTeam] = useState('')
  useEffect(() => {
    if (tenantId) listTeams(isAdmin ? tenantId : undefined).then(setTeams).catch(() => setTeams([]))
  }, [tenantId, isAdmin])
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
            <option value="">Equipes: Todas</option>
            {teams.map((t) => <option key={t.id} value={t.id}>Equipes: {t.name}</option>)}
          </select>
          <select className="select" style={{ width: 'auto', height: 32, fontSize: 12, fontWeight: 600 }} value={period} onChange={(e) => setPeriod(e.target.value)}>
            {PERIODS.map((p) => <option key={p} value={p}>Período: {p}</option>)}
          </select>
        </div>
        <span className="xs muted">Última atualização: Hoje às 08:30h (Atualizado diariamente)</span>
      </div>

      {/* Os seis indicadores do Quadro 2, agregados. Valores ilustrativos até existir a API de check-in. */}
      <div className="grid grid-3 mt-16">
        <Kpi label="Estresse Ocupacional" value="3,2 / 5" delta="↑ 0,1" desc="Semanal · 5 = pouco estresse percebido" />
        <Kpi label="Bem-estar Psicológico" value="3,9 / 5" delta="↑ 0,2" desc="Quinzenal · média da equipe" />
        <Kpi label="Equilíbrio Vida–Trabalho" value="3,4 / 5" delta="Estável" desc="Mensal · distribuição das respostas" />
        <Kpi label="Fatores Psicossociais" value="3,5 / 5" delta="↓ 0,1" desc="Mensal · demandas, autonomia, apoio, reconhecimento" />
        <Kpi label="Recuperação e Desligamento" value="3,0 / 5" delta="↑ 0,1" desc="Quinzenal · capacidade de se desligar" />
        <Kpi label="Comportamento Sedentário" value="2,7 / 5" delta="Estável" desc="Semanal · tempo sentado e pausas" />
      </div>
      <div className="xs muted mt-8">Valores ilustrativos do protótipo. Escala de 1 a 5, em que 5 é a situação mais favorável; só grupos acima do limiar de agregação são exibidos.</div>

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
            <Factor color="var(--orange)" title="Demandas (fatores psicossociais)" desc="Dimensão com a menor média: volume de demandas acima do tempo disponível." />
            <Factor color="var(--orange)" title="Comportamento Sedentário" desc="Maioria relata de 6 a 8 h sentada e pausas só a cada 2 h." />
            <Factor color="var(--green)" title="Bem-estar Psicológico" desc="Tendência de melhora nas últimas quatro coletas quinzenais." />
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
