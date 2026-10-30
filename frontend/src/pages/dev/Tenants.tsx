import { useMemo, useState } from 'react'
import { Ban, Plus, Search, X } from 'lucide-react'
import { PageHeader } from '../../components/PageHeader'

type Status = 'Ativo' | 'Em trial' | 'Suspenso'
type Plan = 'Enterprise' | 'Business' | 'Starter'

interface Tenant {
  id: string
  name: string
  plan: Plan
  used: number
  limit: number
  status: Status
  rpm: number
  domains: string[]
  since: string
}

const SEED: Tenant[] = [
  { id: 'tn_aurora', name: 'Aurora Tecnologia', plan: 'Enterprise', used: 428, limit: 500, status: 'Ativo', rpm: 1000, domains: ['auroratech.com.br', 'aurora.com.br'], since: '12/02/2026' },
  { id: 'tn_horizonte', name: 'Horizonte Saúde', plan: 'Business', used: 186, limit: 250, status: 'Ativo', rpm: 600, domains: ['horizontesaude.com.br'], since: '03/03/2026' },
  { id: 'tn_vertice', name: 'Vértice Consultoria', plan: 'Starter', used: 42, limit: 50, status: 'Em trial', rpm: 200, domains: ['vertice.com'], since: '20/09/2026' },
  { id: 'tn_nexo', name: 'Nexo Logística', plan: 'Business', used: 94, limit: 250, status: 'Suspenso', rpm: 600, domains: ['nexolog.com.br'], since: '15/01/2026' },
  { id: 'tn_lumina', name: 'Lumina Educação', plan: 'Business', used: 132, limit: 250, status: 'Ativo', rpm: 600, domains: ['lumina.edu.br'], since: '28/04/2026' },
  { id: 'tn_orbita', name: 'Órbita Fintech', plan: 'Enterprise', used: 310, limit: 500, status: 'Ativo', rpm: 1000, domains: ['orbita.finance'], since: '02/05/2026' },
]
const STATUS_BADGE: Record<Status, string> = { Ativo: 'badge-green', 'Em trial': 'badge-orange', Suspenso: 'badge-gray' }
const PAGE = 5

export function Tenants() {
  const [tenants, setTenants] = useState(SEED)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<'' | Status>('')
  const [plan, setPlan] = useState<'' | Plan>('')
  const [page, setPage] = useState(0)
  const [selectedId, setSelectedId] = useState('tn_aurora')
  const selected = tenants.find((t) => t.id === selectedId)
  const [draft, setDraft] = useState(selected)
  const [newDomain, setNewDomain] = useState('')
  const [saved, setSaved] = useState('')

  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    return tenants.filter((t) => (!status || t.status === status) && (!plan || t.plan === plan) && (t.name.toLowerCase().includes(q) || t.id.includes(q)))
  }, [tenants, query, status, plan])
  const rows = filtered.slice(page * PAGE, (page + 1) * PAGE)
  const pages = Math.max(Math.ceil(filtered.length / PAGE), 1)
  const count = (s: Status) => tenants.filter((t) => t.status === s).length

  function select(t: Tenant) {
    setSelectedId(t.id)
    setDraft(t)
    setSaved('')
  }

  function setTenantStatus(id: string, s: Status) {
    setTenants((ts) => ts.map((t) => (t.id === id ? { ...t, status: s } : t)))
    if (draft?.id === id) setDraft({ ...draft, status: s })
  }

  function save() {
    if (!draft) return
    setTenants((ts) => ts.map((t) => (t.id === draft.id ? draft : t)))
    setSaved('Alterações salvas.')
  }

  function addDomain() {
    const d = newDomain.trim().toLowerCase()
    if (!draft || !d || draft.domains.includes(d)) return
    setDraft({ ...draft, domains: [...draft.domains, d] })
    setNewDomain('')
  }

  return (
    <>
      <PageHeader
        before={<div className="eyebrow">Área de desenvolvimento</div>}
        title="Gestão de Tenants/Empresas"
        subtitle="Administre empresas, planos e limites de acesso na instância multiempresa do MindSync."
        right={<span className="pill">Dev/Engenharia</span>}
      />
      <div className="row between gap-12">
        <div className="row gap-8">
          <div className="row" style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, color: 'var(--muted-2)' }} />
            <input className="input" style={{ width: 200, height: 32, paddingLeft: 30, fontSize: 12 }} placeholder="Buscar por empresa ou tenant ID..." value={query} onChange={(e) => { setQuery(e.target.value); setPage(0) }} />
          </div>
          <select className="select" style={{ width: 'auto', height: 32, fontSize: 12, fontWeight: 600 }} value={status} onChange={(e) => { setStatus(e.target.value as Status | ''); setPage(0) }}>
            <option value="">Status: Todos</option>
            <option>Ativo</option><option>Em trial</option><option>Suspenso</option>
          </select>
          <select className="select" style={{ width: 'auto', height: 32, fontSize: 12, fontWeight: 600 }} value={plan} onChange={(e) => { setPlan(e.target.value as Plan | ''); setPage(0) }}>
            <option value="">Plano: Todos</option>
            <option>Enterprise</option><option>Business</option><option>Starter</option>
          </select>
        </div>
        <span className="xs muted">{tenants.length} empresas · {count('Ativo')} ativas · {count('Em trial')} em trial · {count('Suspenso')} suspensas</span>
      </div>

      <div className="card mt-16 table-wrap">
        <table className="table">
          <thead><tr><th>Empresa / Tenant</th><th>Plano</th><th>Colaboradores</th><th>Status</th><th>Ações</th><th /></tr></thead>
          <tbody>
            {rows.map((t) => (
              <tr key={t.id} className={t.id === selectedId ? 'selected' : ''}>
                <td><div className="strong" style={{ color: 'var(--text)', fontWeight: 600 }}>{t.name}</div><div className="mono">{t.id}</div></td>
                <td>{t.plan}</td>
                <td>{t.used} / {t.limit}</td>
                <td><span className={`badge ${STATUS_BADGE[t.status]}`}>{t.status}</span></td>
                <td><button className="link xs" style={{ fontWeight: 500 }} onClick={() => select(t)}>{t.id === selectedId ? 'Selecionada' : 'Configurar'}</button></td>
                <td style={{ textAlign: 'right' }}>
                  {t.status === 'Suspenso'
                    ? <button className="link xs" onClick={() => setTenantStatus(t.id, 'Ativo')}>Reativar</button>
                    : <button className="link xs" style={{ color: 'var(--text-2)', fontWeight: 500 }} onClick={() => setTenantStatus(t.id, 'Suspenso')}>Suspender</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="pagination">
          <span>Exibindo {filtered.length ? page * PAGE + 1 : 0}-{Math.min((page + 1) * PAGE, filtered.length)} de {filtered.length} empresas</span>
          <div className="actions">
            <button className="btn btn-outline btn-sm btn-square" disabled={page === 0} onClick={() => setPage(page - 1)}>Anterior</button>
            <button className="btn btn-primary btn-sm btn-square" disabled={page >= pages - 1} onClick={() => setPage(page + 1)}>Próximo</button>
          </div>
        </div>
      </div>

      {draft && (
        <div className="card mt-16">
          <div className="row between">
            <div>
              <div className="card-title" style={{ fontSize: 14 }}>Configurações · {draft.name}</div>
              <div className="xs muted">{draft.id} · {draft.plan} · Cliente desde {draft.since}</div>
            </div>
            <span className={`badge ${STATUS_BADGE[draft.status]}`}>{draft.status}</span>
          </div>
          <div className="grid grid-2 mt-16" style={{ gap: 24 }}>
            <div>
              <div className="small" style={{ fontWeight: 700 }}>Limites de uso</div>
              <div className="grid grid-2 mt-8" style={{ gap: 12 }}>
                <div className="field">
                  <span className="xs" style={{ color: 'var(--text-2)' }}>Máx. de colaboradores</span>
                  <input className="input" type="number" style={{ height: 32, fontSize: 12 }} value={draft.limit} onChange={(e) => setDraft({ ...draft, limit: Number(e.target.value) })} />
                  <span className="xs muted">{draft.used} utilizados · {Math.round((draft.used / Math.max(draft.limit, 1)) * 100)}% do limite</span>
                </div>
                <div className="field">
                  <span className="xs" style={{ color: 'var(--text-2)' }}>Requisições / minuto</span>
                  <input className="input" type="number" style={{ height: 32, fontSize: 12 }} value={draft.rpm} onChange={(e) => setDraft({ ...draft, rpm: Number(e.target.value) })} />
                  <span className="xs muted">Limite compartilhado pelo tenant</span>
                </div>
              </div>
            </div>
            <div>
              <div className="small" style={{ fontWeight: 700 }}>Domínios de e-mail permitidos</div>
              <div className="row gap-8 mt-8" style={{ flexWrap: 'wrap', border: '1px solid var(--border)', borderRadius: 8, padding: 8 }}>
                {draft.domains.map((d) => (
                  <span key={d} className="row gap-4 xs" style={{ background: '#f1f5f9', borderRadius: 6, padding: '4px 8px', fontWeight: 600 }}>
                    {d}
                    <button className="icon-btn" style={{ padding: 0 }} onClick={() => setDraft({ ...draft, domains: draft.domains.filter((x) => x !== d) })} aria-label={`Remover ${d}`}><X size={11} /></button>
                  </span>
                ))}
                <input className="xs" style={{ border: 0, outline: 0, flex: 1, minWidth: 100 }} placeholder="novo dominio.com" value={newDomain} onChange={(e) => setNewDomain(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addDomain()} />
                <button className="icon-btn" style={{ color: 'var(--primary)' }} onClick={addDomain} aria-label="Adicionar domínio"><Plus size={14} /></button>
              </div>
              <div className="xs muted mt-8">Somente estes domínios podem cadastrar colaboradores.</div>
            </div>
          </div>
          <hr className="divider" />
          <div className="row between">
            <div className="row gap-12">
              <button className="btn btn-danger-outline btn-sm btn-square" onClick={() => setTenantStatus(draft.id, draft.status === 'Suspenso' ? 'Ativo' : 'Suspenso')}>
                <Ban size={13} /> {draft.status === 'Suspenso' ? 'Reativar acesso' : 'Suspender acesso'}
              </button>
              <span className="xs muted">{draft.status === 'Suspenso' ? 'Libera novamente o acesso da empresa.' : 'Bloqueia o acesso de toda a empresa.'}</span>
            </div>
            <div className="row gap-12">
              {saved && <span className="xs" style={{ color: 'var(--green-700)' }}>{saved}</span>}
              <button className="btn btn-primary btn-sm btn-square" onClick={save}>Salvar alterações</button>
            </div>
          </div>
        </div>
      )}
      <p className="xs muted mt-16">Dados demonstrativos · Atualizado em 08/10/2026 às 14:35 (BRT)</p>
    </>
  )
}
