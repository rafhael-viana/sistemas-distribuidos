import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Ban, Copy, Plus, RefreshCw, Search, Trash2, X } from 'lucide-react'
import { PageHeader } from '../../components/PageHeader'
import { ApiError } from '../../api/client'
import {
  createTenant,
  deleteTenant,
  listTenants,
  PLAN_LABEL,
  STATUS_LABEL,
  translateOrgError,
  updateTenant,
  type Plan,
  type Tenant,
  type TenantInput,
  type TenantStatus,
} from '../../api/org'
import { useTenantScope } from '../../context/TenantScope'

const STATUS_BADGE: Record<TenantStatus, string> = { active: 'badge-green', trial: 'badge-orange', suspended: 'badge-gray' }
const PAGE = 5

function errorText(err: unknown) {
  return err instanceof ApiError ? translateOrgError(err.message) : 'Erro inesperado.'
}

export function Tenants() {
  const { reloadTenants } = useTenantScope()
  const [tenants, setTenants] = useState<Tenant[] | null>(null)
  const [loadError, setLoadError] = useState('')
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<'' | TenantStatus>('')
  const [plan, setPlan] = useState<'' | Plan>('')
  const [page, setPage] = useState(0)
  const [selectedId, setSelectedId] = useState('')
  const [creating, setCreating] = useState(false)

  const load = useCallback(async () => {
    try {
      const list = await listTenants()
      setTenants(list)
      setLoadError('')
      setSelectedId((cur) => (list.some((t) => t.id === cur) ? cur : (list[0]?.id ?? '')))
    } catch (err) {
      setLoadError(errorText(err))
    }
  }, [])
  useEffect(() => {
    load()
  }, [load])

  // Mantém a lista e o seletor de empresa da gestão em dia após mudanças.
  function changed(t?: Tenant) {
    if (t) setTenants((list) => list?.map((x) => (x.id === t.id ? t : x)) ?? null)
    else load()
    reloadTenants()
  }

  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    return (tenants ?? []).filter(
      (t) => (!status || t.status === status) && (!plan || t.plan === plan) && (t.name.toLowerCase().includes(q) || t.id.includes(q)),
    )
  }, [tenants, query, status, plan])
  const rows = filtered.slice(page * PAGE, (page + 1) * PAGE)
  const pages = Math.max(Math.ceil(filtered.length / PAGE), 1)
  const count = (s: TenantStatus) => (tenants ?? []).filter((t) => t.status === s).length
  const selected = tenants?.find((t) => t.id === selectedId)

  async function setTenantStatus(t: Tenant, s: TenantStatus) {
    try {
      changed(await updateTenant(t.id, { status: s }))
    } catch (err) {
      setLoadError(errorText(err))
    }
  }

  return (
    <>
      <PageHeader
        before={<div className="eyebrow">Área de desenvolvimento</div>}
        title="Gestão de Tenants/Empresas"
        subtitle="Administre empresas, planos e limites de acesso na instância multiempresa do MindSync."
        right={
          <>
            <span className="pill">Dev/Engenharia</span>
            <button className="btn btn-primary btn-sm" onClick={() => setCreating(true)}><Plus size={14} /> Nova empresa</button>
          </>
        }
      />
      <div className="row between gap-12" style={{ flexWrap: 'wrap' }}>
        <div className="row gap-8">
          <div className="row" style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, color: 'var(--muted-2)' }} />
            <input className="input" style={{ width: 220, height: 32, paddingLeft: 30, fontSize: 12 }} placeholder="Buscar por empresa ou tenant ID..." value={query} onChange={(e) => { setQuery(e.target.value); setPage(0) }} />
          </div>
          <select className="select" style={{ width: 'auto', height: 32, fontSize: 12, fontWeight: 600 }} value={status} onChange={(e) => { setStatus(e.target.value as TenantStatus | ''); setPage(0) }}>
            <option value="">Status: Todos</option>
            {(Object.keys(STATUS_LABEL) as TenantStatus[]).map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
          <select className="select" style={{ width: 'auto', height: 32, fontSize: 12, fontWeight: 600 }} value={plan} onChange={(e) => { setPlan(e.target.value as Plan | ''); setPage(0) }}>
            <option value="">Plano: Todos</option>
            {(Object.keys(PLAN_LABEL) as Plan[]).map((p) => <option key={p} value={p}>{PLAN_LABEL[p]}</option>)}
          </select>
          <button className="icon-btn" onClick={load} title="Atualizar"><RefreshCw size={14} /></button>
        </div>
        <span className="xs muted">
          {tenants?.length ?? 0} empresas · {count('active')} ativas · {count('trial')} em trial · {count('suspended')} suspensas
        </span>
      </div>
      {loadError && <div className="error-msg mt-12">{loadError}</div>}

      <div className="card mt-16 table-wrap">
        <table className="table">
          <thead><tr><th>Empresa / Tenant</th><th>Plano</th><th>Colaboradores</th><th>Status</th><th>Ações</th><th /></tr></thead>
          <tbody>
            {rows.map((t) => (
              <tr key={t.id} className={t.id === selectedId ? 'selected' : ''} style={{ cursor: 'pointer' }} onClick={() => setSelectedId(t.id)}>
                <td><div className="strong" style={{ color: 'var(--text)', fontWeight: 600 }}>{t.name}</div><div className="mono">{t.id}</div></td>
                <td>{PLAN_LABEL[t.plan]}</td>
                <td>{t.users_count} / {t.max_users}</td>
                <td><span className={`badge ${STATUS_BADGE[t.status]}`}>{STATUS_LABEL[t.status]}</span></td>
                <td><span className="link xs" style={{ fontWeight: 500 }}>{t.id === selectedId ? 'Selecionada' : 'Configurar'}</span></td>
                <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                  {t.status === 'suspended'
                    ? <button className="link xs" onClick={() => setTenantStatus(t, 'active')}>Reativar</button>
                    : <button className="link xs" style={{ color: 'var(--text-2)', fontWeight: 500 }} onClick={() => setTenantStatus(t, 'suspended')}>Suspender</button>}
                </td>
              </tr>
            ))}
            {tenants && rows.length === 0 && <tr><td colSpan={6} className="empty">Nenhuma empresa encontrada.</td></tr>}
            {!tenants && !loadError && <tr><td colSpan={6} className="empty">Carregando...</td></tr>}
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

      {selected && <TenantSettings key={selected.id} tenant={selected} onChanged={changed} onDeleted={() => { setSelectedId(''); changed() }} />}
      {creating && (
        <CreateTenantModal
          onClose={() => setCreating(false)}
          onCreated={(t) => { setCreating(false); setSelectedId(t.id); changed() }}
        />
      )}
    </>
  )
}

function TenantSettings({ tenant, onChanged, onDeleted }: { tenant: Tenant; onChanged: (t: Tenant) => void; onDeleted: () => void }) {
  const [draft, setDraft] = useState(tenant)
  const [newDomain, setNewDomain] = useState('')
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const dirty = JSON.stringify({ ...draft, users_count: 0 }) !== JSON.stringify({ ...tenant, users_count: 0 })

  async function run(fn: () => Promise<Tenant | void>, okText: string) {
    setSaving(true)
    setMsg(null)
    try {
      const t = await fn()
      if (t) {
        setDraft(t)
        onChanged(t)
      }
      setMsg({ ok: true, text: okText })
    } catch (err) {
      setMsg({ ok: false, text: errorText(err) })
    } finally {
      setSaving(false)
    }
  }

  function save() {
    const input: TenantInput = {
      name: draft.name,
      plan: draft.plan,
      max_users: draft.max_users,
      rate_limit: draft.rate_limit,
      domains: draft.domains,
      invite_code: draft.invite_code,
    }
    run(() => updateTenant(tenant.id, input), 'Alterações salvas.')
  }

  function toggleSuspend() {
    const next: TenantStatus = draft.status === 'suspended' ? 'active' : 'suspended'
    run(() => updateTenant(tenant.id, { status: next }), next === 'suspended' ? 'Acesso suspenso: ninguém da empresa entra até reativar.' : 'Acesso reativado.')
  }

  function addDomain() {
    const d = newDomain.trim().toLowerCase().replace(/^@/, '')
    if (!d || draft.domains.includes(d)) return
    setDraft({ ...draft, domains: [...draft.domains, d] })
    setNewDomain('')
  }

  async function remove() {
    try {
      await deleteTenant(tenant.id)
      onDeleted()
    } catch (err) {
      setConfirmDelete(false)
      setMsg({ ok: false, text: errorText(err) })
    }
  }

  const usage = Math.round((tenant.users_count / Math.max(draft.max_users, 1)) * 100)
  return (
    <div className="card mt-16">
      <div className="row between">
        <div>
          <div className="card-title" style={{ fontSize: 14 }}>Configurações · {tenant.name}</div>
          <div className="xs muted">{tenant.id} · {PLAN_LABEL[tenant.plan]} · Cliente desde {new Date(tenant.created_at).toLocaleDateString('pt-BR')}</div>
        </div>
        <span className={`badge ${STATUS_BADGE[draft.status]}`}>{STATUS_LABEL[draft.status]}</span>
      </div>

      <div className="grid grid-2 mt-16" style={{ gap: 24 }}>
        <div className="stack gap-12">
          <div className="grid grid-2" style={{ gap: 12 }}>
            <div className="field">
              <span className="xs" style={{ color: 'var(--text-2)' }}>Nome da empresa</span>
              <input className="input" style={{ height: 32, fontSize: 12 }} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            </div>
            <div className="field">
              <span className="xs" style={{ color: 'var(--text-2)' }}>Plano</span>
              <select className="select" style={{ height: 32, fontSize: 12 }} value={draft.plan} onChange={(e) => setDraft({ ...draft, plan: e.target.value as Plan })}>
                {(Object.keys(PLAN_LABEL) as Plan[]).map((p) => <option key={p} value={p}>{PLAN_LABEL[p]}</option>)}
              </select>
            </div>
          </div>
          <div>
            <div className="small" style={{ fontWeight: 700 }}>Limites de uso</div>
            <div className="grid grid-2 mt-8" style={{ gap: 12 }}>
              <div className="field">
                <span className="xs" style={{ color: 'var(--text-2)' }}>Máx. de colaboradores</span>
                <input className="input" type="number" min={1} style={{ height: 32, fontSize: 12 }} value={draft.max_users} onChange={(e) => setDraft({ ...draft, max_users: Number(e.target.value) })} />
                <span className="xs muted">{tenant.users_count} utilizados · {usage}% do limite</span>
              </div>
              <div className="field">
                <span className="xs" style={{ color: 'var(--text-2)' }}>Requisições / minuto</span>
                <input className="input" type="number" min={0} style={{ height: 32, fontSize: 12 }} value={draft.rate_limit} onChange={(e) => setDraft({ ...draft, rate_limit: Number(e.target.value) })} />
                <span className="xs muted">Limite compartilhado pelo tenant (0 = sem limite)</span>
              </div>
            </div>
          </div>
        </div>
        <div className="stack gap-12">
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
            <div className="xs muted mt-8">Somente estes domínios podem cadastrar colaboradores. Sem domínios, qualquer e-mail entra pelo código de convite.</div>
          </div>
          <div className="field">
            <span className="xs" style={{ color: 'var(--text-2)' }}>Código de convite</span>
            <div className="row gap-8">
              <input className="input mono" style={{ height: 32, fontSize: 12 }} value={draft.invite_code} onChange={(e) => setDraft({ ...draft, invite_code: e.target.value.toUpperCase() })} />
              <button className="icon-btn" title="Copiar" onClick={() => navigator.clipboard?.writeText(draft.invite_code)}><Copy size={14} /></button>
            </div>
            <span className="xs muted">Informado pelo colaborador no cadastro para entrar nesta empresa.</span>
          </div>
        </div>
      </div>

      {msg && <div className={`${msg.ok ? 'success-msg' : 'error-msg'} mt-16`}>{msg.text}</div>}
      <hr className="divider" />
      <div className="row between gap-12" style={{ flexWrap: 'wrap' }}>
        <div className="row gap-12">
          <button className="btn btn-danger-outline btn-sm btn-square" disabled={saving} onClick={toggleSuspend}>
            <Ban size={13} /> {draft.status === 'suspended' ? 'Reativar acesso' : 'Suspender acesso'}
          </button>
          <span className="xs muted">{draft.status === 'suspended' ? 'Libera novamente o acesso da empresa.' : 'Bloqueia o login e as sessões abertas de toda a empresa.'}</span>
        </div>
        <div className="row gap-8">
          {confirmDelete ? (
            <>
              <span className="xs" style={{ color: 'var(--red-700)' }}>Excluir a empresa e suas equipes?</span>
              <button className="btn btn-outline btn-sm btn-square" onClick={() => setConfirmDelete(false)}>Cancelar</button>
              <button className="btn btn-danger-outline btn-sm btn-square" onClick={remove}>Confirmar</button>
            </>
          ) : (
            <button className="btn btn-ghost btn-sm" onClick={() => setConfirmDelete(true)} title="Excluir empresa"><Trash2 size={14} /> Excluir</button>
          )}
          <button className="btn btn-outline btn-sm btn-square" disabled={!dirty || saving} onClick={() => setDraft(tenant)}>Descartar</button>
          <button className="btn btn-primary btn-sm btn-square" disabled={!dirty || saving} onClick={save}>Salvar alterações</button>
        </div>
      </div>
    </div>
  )
}

function CreateTenantModal({ onClose, onCreated }: { onClose: () => void; onCreated: (t: Tenant) => void }) {
  const [form, setForm] = useState({ name: '', plan: 'business' as Plan, status: 'active' as TenantStatus, domains: '' })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const domains = form.domains.split(/[,\s]+/).map((d) => d.trim()).filter(Boolean)
      onCreated(await createTenant({ name: form.name, plan: form.plan, status: form.status, domains }))
    } catch (err) {
      setError(errorText(err))
      setSaving(false)
    }
  }

  return (
    <div className="overlay" onClick={onClose}>
      <form className="modal-card" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h1 style={{ fontSize: 18 }}>Nova empresa</h1>
        <p className="lead">Os limites seguem o plano e podem ser ajustados depois. O código de convite é gerado automaticamente.</p>
        <div className="field mt-16">
          <label className="label">Nome</label>
          <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required autoFocus />
        </div>
        <div className="grid grid-2 mt-12" style={{ gap: 12 }}>
          <div className="field">
            <label className="label">Plano</label>
            <select className="select" value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value as Plan })}>
              {(Object.keys(PLAN_LABEL) as Plan[]).map((p) => <option key={p} value={p}>{PLAN_LABEL[p]}</option>)}
            </select>
          </div>
          <div className="field">
            <label className="label">Status</label>
            <select className="select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as TenantStatus })}>
              <option value="active">Ativo</option>
              <option value="trial">Em trial</option>
            </select>
          </div>
        </div>
        <div className="field mt-12">
          <label className="label">Domínios de e-mail (separados por vírgula)</label>
          <input className="input" placeholder="empresa.com.br, empresa.com" value={form.domains} onChange={(e) => setForm({ ...form, domains: e.target.value })} />
        </div>
        {error && <div className="error-msg mt-12">{error}</div>}
        <div className="row gap-8 mt-24" style={{ justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-outline" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" disabled={saving}>Criar empresa</button>
        </div>
      </form>
    </div>
  )
}
