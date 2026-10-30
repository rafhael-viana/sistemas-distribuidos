import { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { PageHeader } from '../../components/PageHeader'
import { listAuditEvents, type AuditEntry } from '../../api/audit'

const TYPE_LABEL: Record<string, [string, string]> = {
  'user.registered': ['Cadastro de usuário', 'badge-purple'],
  'user.login_succeeded': ['Login realizado', 'badge-green'],
  'user.login_failed': ['Falha de login', 'badge-red'],
}

// Trilha de auditoria lida do microsserviço "audit" (eventos do auth via Kafka).
export function Audit() {
  const [events, setEvents] = useState<AuditEntry[] | null>(null)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')

  function load() {
    setError('')
    listAuditEvents()
      .then((e) => setEvents(e.sort((a, b) => b.occurred_at.localeCompare(a.occurred_at))))
      .catch(() => setError('Não foi possível falar com o serviço de auditoria (porta 8083).'))
  }
  useEffect(load, [])

  const shown = (events ?? []).filter((e) => JSON.stringify(e).toLowerCase().includes(query.toLowerCase()))

  return (
    <>
      <PageHeader
        title="Trilha de Auditoria"
        subtitle="Registro imutável dos eventos de acesso e cadastro na plataforma."
        right={<button className="btn btn-outline btn-sm" onClick={load}><RefreshCw size={13} /> Atualizar</button>}
      />
      <input className="input" style={{ maxWidth: 320, height: 34, fontSize: 12 }} placeholder="Buscar por tipo, usuário ou e-mail..." value={query} onChange={(e) => setQuery(e.target.value)} />
      {error && <div className="error-msg mt-16">{error}</div>}
      <div className="card mt-16 table-wrap">
        <table className="table">
          <thead>
            <tr><th>Data / Hora</th><th>Evento</th><th>Origem</th><th>Detalhes</th><th>ID do evento</th></tr>
          </thead>
          <tbody>
            {shown.map((e) => {
              const [label, badge] = TYPE_LABEL[e.type] ?? [e.type, 'badge-gray']
              return (
                <tr key={e.event_id}>
                  <td>{new Date(e.occurred_at).toLocaleString('pt-BR')}</td>
                  <td><span className={`badge ${badge}`}>{label}</span></td>
                  <td>{e.source}</td>
                  <td className="xs">{describe(e.data)}</td>
                  <td className="mono">{e.event_id.slice(0, 12)}</td>
                </tr>
              )
            })}
            {events && shown.length === 0 && <tr><td colSpan={5} className="empty">Nenhum evento registrado.</td></tr>}
            {!events && !error && <tr><td colSpan={5} className="empty">Carregando...</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  )
}

function describe(data: AuditEntry['data']) {
  if (!data || Object.keys(data).length === 0) return '—'
  return Object.entries(data)
    .map(([k, v]) => `${k}: ${String(v)}`)
    .join(' · ')
}
