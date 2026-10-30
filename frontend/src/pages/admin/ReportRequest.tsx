import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Bell, Calendar, FileText, ShieldCheck } from 'lucide-react'
import { PageHeader } from '../../components/PageHeader'
import { requestReport, type ReportFormat } from '../../api/reports'
import { ApiError } from '../../api/client'

const PERIODS = ['Últimos 7 dias', 'Últimos 30 dias', 'Últimos 90 dias', 'Último ano']
const TEAMS = ['Engenharia de Software', 'Produto & UI/UX', 'Infraestrutura', 'Recursos Humanos', 'Marketing']

export function ReportRequest() {
  const navigate = useNavigate()
  const [period, setPeriod] = useState('Últimos 30 dias')
  const [stress, setStress] = useState(true)
  const [engagement, setEngagement] = useState(true)
  const [scope, setScope] = useState<'org' | 'teams'>('org')
  const [teams, setTeams] = useState<string[]>([])
  const [format, setFormat] = useState<ReportFormat>('pdf')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const indicators = [stress && 'Estresse ocupacional', engagement && 'engajamento'].filter(Boolean).join(' e ')

  async function generate() {
    setError('')
    setLoading(true)
    try {
      // O serviço de relatórios hoje gera "users" (usuários + resumo de logins) e
      // "logins" (tentativas de acesso). Só engajamento -> logins; o resto -> users.
      const type = engagement && !stress ? 'logins' : 'users'
      const report = await requestReport(type, format)
      navigate(`/gestao/relatorios/gerando/${report.id}`, {
        state: { period, indicators, scope: scope === 'org' ? 'Toda a organização' : teams.join(', '), format },
      })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro inesperado.')
      setLoading(false)
    }
  }

  return (
    <>
      <PageHeader
        before={
          <div className="breadcrumb">
            <Link to="/gestao/relatorios" className="row gap-4"><ArrowLeft size={12} /> Relatórios &amp; Export</Link> / <b>Solicitar Novo Relatório</b>
          </div>
        }
        title="Solicitar Novo Relatório"
        subtitle="Defina os dados que serão compilados e revise o resumo antes de gerar o relatório."
      />
      <div className="grid grid-main-aside">
        <div className="card">
          <div className="card-title">1. Período de análise</div>
          <div className="card-sub">Escolha o intervalo dos dados que serão compilados.</div>
          <div className="row gap-8 mt-12" style={{ position: 'relative' }}>
            <Calendar size={15} style={{ position: 'absolute', left: 12, color: 'var(--text-2)' }} />
            <select className="select" style={{ paddingLeft: 36 }} value={period} onChange={(e) => setPeriod(e.target.value)}>
              {PERIODS.map((p) => <option key={p}>{p}</option>)}
            </select>
          </div>
          <hr className="divider" />

          <div className="card-title">2. Indicadores do relatório</div>
          <div className="card-sub">Selecione os indicadores que deseja analisar.</div>
          <div className="grid grid-2 mt-12" style={{ gap: 12 }}>
            <OptionCard type="checkbox" checked={stress} onChange={() => setStress(!stress)} title="Estresse ocupacional" desc="Níveis agregados de estresse no trabalho." />
            <OptionCard type="checkbox" checked={engagement} onChange={() => setEngagement(!engagement)} title="Engajamento" desc="Adesão e participação nos check-ins." />
          </div>
          <hr className="divider" />

          <div className="card-title">3. Abrangência dos dados</div>
          <div className="card-sub">Defina quais equipes farão parte da análise agregada.</div>
          <div className="grid grid-2 mt-12" style={{ gap: 12 }}>
            <OptionCard type="radio" checked={scope === 'org'} onChange={() => setScope('org')} title="Toda a organização" />
            <OptionCard type="radio" checked={scope === 'teams'} onChange={() => setScope('teams')} title="Selecionar equipes" />
          </div>
          {scope === 'teams' && (
            <div className="chips mt-12">
              {TEAMS.map((t) => (
                <button key={t} className={`chip${teams.includes(t) ? ' active' : ''}`} onClick={() => setTeams(teams.includes(t) ? teams.filter((x) => x !== t) : [...teams, t])}>{t}</button>
              ))}
            </div>
          )}
          <p className="xs muted mt-12">Somente grupos com pelo menos 5 participantes serão exibidos. Grupos abaixo desse limiar serão omitidos para preservar o anonimato.</p>
          <hr className="divider" />

          <div className="card-title">4. Formato do relatório</div>
          <div className="card-sub">Escolha como deseja receber o compilado.</div>
          <div className="grid grid-2 mt-12" style={{ gap: 12 }}>
            <OptionCard type="radio" checked={format === 'pdf'} onChange={() => setFormat('pdf')} title="PDF" desc="Relatório para leitura" />
            <OptionCard type="radio" checked={format === 'csv'} onChange={() => setFormat('csv')} title="CSV" desc="Dados agregados" />
          </div>
        </div>

        <div className="stack gap-12">
          <div className="card">
            <div className="card-title">Resumo da solicitação</div>
            <div className="card-sub">Confira os dados antes de iniciar a geração.</div>
            <hr className="divider" style={{ margin: '14px 0' }} />
            <div className="stack gap-12">
              <Summary label="Período" value={period} />
              <Summary label="Indicadores" value={indicators || '—'} />
              <Summary label="Abrangência" value={scope === 'org' ? 'Toda a organização' : teams.join(', ') || 'Nenhuma equipe'} />
              <Summary label="Formato" value={format === 'pdf' ? 'PDF · Relatório consolidado' : 'CSV · Dados agregados'} />
            </div>
            <hr className="divider" style={{ margin: '14px 0' }} />
            <div className="row gap-8 xs muted" style={{ alignItems: 'flex-start' }}>
              <Bell size={14} color="var(--primary)" style={{ flexShrink: 0 }} />
              Avisaremos você por e-mail e nas notificações quando o relatório estiver pronto.
            </div>
            {error && <div className="error-msg mt-12">{error}</div>}
            <button className="btn btn-primary btn-block btn-square mt-16" disabled={loading || !indicators || (scope === 'teams' && teams.length === 0)} onClick={generate}>
              <FileText size={14} /> {loading ? 'Enviando...' : 'Gerar relatório'}
            </button>
            <button className="btn btn-outline btn-block btn-square mt-8" onClick={() => navigate('/gestao/relatorios')}>Cancelar</button>
            <p className="xs muted mt-8" style={{ textAlign: 'center' }}>Ao gerar, a compilação dos dados será iniciada.</p>
          </div>
          <div className="row gap-8" style={{ background: 'var(--primary-50)', borderRadius: 12, padding: 14, alignItems: 'flex-start' }}>
            <ShieldCheck size={15} color="var(--primary)" style={{ flexShrink: 0 }} />
            <div>
              <div className="xs" style={{ color: 'var(--primary)', fontWeight: 700 }}>Dados agregados e anonimizados</div>
              <div className="xs muted mt-8" style={{ lineHeight: 1.5 }}>Mínimo de 5 participantes por grupo. Respostas individuais não são disponibilizadas.</div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

function OptionCard({ type, checked, onChange, title, desc }: { type: 'checkbox' | 'radio'; checked: boolean; onChange: () => void; title: string; desc?: string }) {
  return (
    <label className="row gap-12" style={{ alignItems: 'flex-start', cursor: 'pointer', borderRadius: 8, padding: '10px 12px', border: `1px solid ${checked ? 'var(--primary-200)' : 'var(--border)'}`, background: checked ? 'var(--primary-50)' : '#fff' }}>
      <input type={type} checked={checked} onChange={onChange} style={{ accentColor: 'var(--primary)', marginTop: 2 }} />
      <div>
        <div className="small" style={{ fontWeight: 600 }}>{title}</div>
        {desc && <div className="xs muted">{desc}</div>}
      </div>
    </label>
  )
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="xs muted">{label}</div>
      <div className="small" style={{ fontWeight: 700 }}>{value}</div>
    </div>
  )
}
