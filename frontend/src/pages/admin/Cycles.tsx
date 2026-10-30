import { useRef, useState } from 'react'
import { Plus, X } from 'lucide-react'
import { PageHeader } from '../../components/PageHeader'

const DIMENSIONS = [
  { key: 'Sobrecarga', summary: 'Sobrecarga', label: 'Carga de Trabalho (Escala de Estresse de Carga)' },
  { key: 'Ergonomia', summary: 'Ergonomia, Conforto', label: 'Ergonomia e Conforto Postural' },
  { key: 'Technostress', summary: 'Technostress', label: 'Technostress (Indicador de Fadiga Tecnológica)' },
]
const ALL_TEAMS = ['Equipe de Infraestrutura', 'Squad DevOps', 'Engenharia de Software', 'Produto & UI/UX', 'Marketing']
const PER_TEAM = 21

export function Cycles() {
  const [name, setName] = useState('Mapeamento de Clima e Ergonomia Q2 - Engenharia')
  const [frequency, setFrequency] = useState('Quinzenal')
  const [dims, setDims] = useState(['Sobrecarga', 'Ergonomia'])
  const [scope, setScope] = useState<'teams' | 'org'>('teams')
  const [teams, setTeams] = useState(['Equipe de Infraestrutura', 'Squad DevOps'])
  const [imported, setImported] = useState(0)
  const [status, setStatus] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const respondents = scope === 'org' ? 142 : teams.length * PER_TEAM + imported
  const dimLabel = DIMENSIONS.filter((d) => dims.includes(d.key)).map((d) => d.summary)

  async function importCSV(file: File) {
    const lines = (await file.text()).split(/\r?\n/).filter((l) => l.trim())
    setImported(Math.max(lines.length - 1, 0))
  }

  function toggleDim(key: string) {
    setDims((d) => (d.includes(key) ? d.filter((x) => x !== key) : [...d, key]))
  }

  return (
    <>
      <PageHeader
        title="Configuração de Ciclos"
        subtitle="Crie novos ciclos periódicos de escuta interna e acompanhamento de saúde mental."
        right={<span className="pill">Acesso Administrativo</span>}
      />
      <div className="grid grid-main-aside">
        <div className="card">
          <div className="card-title">1. Informações Básicas do Ciclo</div>
          <div className="field mt-12">
            <label className="label" style={{ fontWeight: 500 }}>Nome do Ciclo de Escuta</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="field mt-12">
            <label className="label" style={{ fontWeight: 500 }}>Periodicidade dos Disparos</label>
            <select className="select" value={frequency} onChange={(e) => setFrequency(e.target.value)}>
              <option value="Semanal">Semanal</option>
              <option value="Quinzenal">Quinzenal (Recomendado para TI)</option>
              <option value="Mensal">Mensal</option>
            </select>
          </div>
          <hr className="divider" />
          <div className="card-title">2. Dimensões &amp; Instrumentos de Pesquisa</div>
          <div className="stack gap-8 mt-12">
            {DIMENSIONS.map((d) => (
              <label key={d.key} className="checkbox" style={{ fontWeight: dims.includes(d.key) ? 600 : 400 }}>
                <input type="checkbox" checked={dims.includes(d.key)} onChange={() => toggleDim(d.key)} />
                {d.label}
              </label>
            ))}
          </div>
          <hr className="divider" />
          <div className="card-title">3. Convidar Participantes</div>
          <div className="row gap-8 mt-12">
            <button className={`chip${scope === 'teams' ? ' active' : ''}`} onClick={() => setScope('teams')}>Por Equipes / Squads</button>
            <button className={`chip${scope === 'org' ? ' active' : ''}`} style={{ border: 0 }} onClick={() => setScope('org')}>Toda a Organização</button>
          </div>
          {scope === 'teams' && (
            <div className="row gap-8 mt-12" style={{ flexWrap: 'wrap', border: '1px solid var(--border)', borderRadius: 8, padding: 8, background: '#f8fafc' }}>
              {teams.map((t) => (
                <span key={t} className="row gap-4 xs" style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px', fontWeight: 600 }}>
                  {t}
                  <button className="icon-btn" style={{ padding: 0 }} onClick={() => setTeams(teams.filter((x) => x !== t))} aria-label={`Remover ${t}`}><X size={12} /></button>
                </span>
              ))}
              <select className="select" style={{ width: 'auto', height: 28, fontSize: 12, border: 0, background: 'transparent' }} value="" onChange={(e) => e.target.value && setTeams([...teams, e.target.value])}>
                <option value="">+ adicionar equipe</option>
                {ALL_TEAMS.filter((t) => !teams.includes(t)).map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
          )}
          <input ref={fileRef} type="file" accept=".csv" hidden onChange={(e) => e.target.files?.[0] && importCSV(e.target.files[0])} />
          <button className="link small row gap-4 mt-12" style={{ fontWeight: 500 }} onClick={() => fileRef.current?.click()}>
            <Plus size={14} /> Importar planilha de participantes em massa (.csv)
          </button>
          {imported > 0 && <div className="xs muted mt-8">{imported} participantes importados da planilha.</div>}
        </div>

        <div className="card">
          <div className="card-title" style={{ fontSize: 13 }}>Resumo do Ciclo de Pesquisa</div>
          <div className="stack gap-8 mt-12" style={{ background: '#f8fafc', borderRadius: 10, padding: 12 }}>
            <Summary label="Frequência" value={frequency} />
            <Summary label="Dimensões Ativas" value={dimLabel.join(', ') || '—'} />
            <Summary label="Total Estimado de Respondentes" value={`${respondents} colaboradores selecionados`} />
          </div>
          {status && <div className="success-msg mt-12">{status}</div>}
          <button className="btn btn-primary btn-block mt-16" disabled={!name || dims.length === 0 || respondents === 0} onClick={() => setStatus(`Ciclo "${name}" iniciado. Os convites foram enviados.`)}>
            Iniciar Ciclo de Escuta
          </button>
          <button className="btn btn-outline btn-block mt-8" onClick={() => setStatus('Rascunho salvo.')}>Salvar como Rascunho</button>
        </div>
      </div>
    </>
  )
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="xs" style={{ color: 'var(--muted-2)' }}>{label}</div>
      <div className="small" style={{ fontWeight: 700 }}>{value}</div>
    </div>
  )
}
