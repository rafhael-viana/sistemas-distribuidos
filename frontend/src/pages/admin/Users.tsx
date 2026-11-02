import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Pencil, Plus, Search, Trash2, X } from 'lucide-react'
import { PageHeader } from '../../components/PageHeader'
import { ApiError } from '../../api/client'
import type { Role, User } from '../../api/auth'
import {
  createTeam,
  createUser,
  deleteTeam,
  deleteUser,
  listTeams,
  listUsers,
  translateOrgError,
  updateTeam,
  updateUser,
  type Team,
} from '../../api/org'
import { ROLE_LABEL, useAuth } from '../../context/AuthContext'
import { useTenantScope } from '../../context/TenantScope'

const ROLE_BADGE: Record<Role, string> = { profissional: 'badge-purple', gestao: 'badge-blue', admin: 'badge-orange' }
const PAGE = 8

function errorText(err: unknown) {
  return err instanceof ApiError ? translateOrgError(err.message) : 'Erro inesperado.'
}

export function Users() {
  const navigate = useNavigate()
  const { tenantId, isAdmin } = useTenantScope()
  const [tab, setTab] = useState<'users' | 'teams'>('users')
  const [teams, setTeams] = useState<Team[]>([])
  const [error, setError] = useState('')

  const loadTeams = useCallback(() => {
    if (!tenantId) return
    listTeams(isAdmin ? tenantId : undefined)
      .then(setTeams)
      .catch((err) => setError(errorText(err)))
  }, [tenantId, isAdmin])
  useEffect(loadTeams, [loadTeams])

  return (
    <>
      <PageHeader
        title="Gestão de Usuários"
        subtitle="Gerencie perfis, equipes e permissões de acesso ao MindSync."
        right={
          <>
            <span className="pill">Acesso Administrativo</span>
            <button className="btn btn-outline btn-sm" onClick={() => navigate('/clientes')}>Clientes PF/PJ</button>
          </>
        }
      />
      {isAdmin && !tenantId && <div className="error-msg">Crie uma empresa na área de Desenvolvimento para gerenciar usuários.</div>}
      {error && <div className="error-msg" style={{ marginBottom: 16 }}>{error}</div>}
      {tenantId && (
        <>
          <div className="segmented" style={{ marginBottom: 16 }}>
            <button className={tab === 'users' ? 'active' : ''} onClick={() => setTab('users')}>Usuários</button>
            <button className={tab === 'teams' ? 'active' : ''} onClick={() => setTab('teams')}>Equipes ({teams.length})</button>
          </div>
          {tab === 'users'
            ? <UsersTab key={tenantId} tenantId={tenantId} isAdmin={isAdmin} teams={teams} onUsersChanged={loadTeams} />
            : <TeamsTab key={tenantId} tenantId={tenantId} isAdmin={isAdmin} teams={teams} reload={loadTeams} />}
        </>
      )}
    </>
  )
}

function UsersTab({ tenantId, isAdmin, teams, onUsersChanged }: { tenantId: string; isAdmin: boolean; teams: Team[]; onUsersChanged: () => void }) {
  const { user: me } = useAuth()
  const [users, setUsers] = useState<User[] | null>(null)
  const [query, setQuery] = useState('')
  const [role, setRole] = useState<'' | Role>('')
  const [teamId, setTeamId] = useState('')
  const [page, setPage] = useState(0)
  const [editing, setEditing] = useState<User | 'new' | null>(null)
  const [confirmDelete, setConfirmDelete] = useState('')
  const [error, setError] = useState('')
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)

  const load = useCallback(() => {
    listUsers({ tenantId: isAdmin ? tenantId : undefined, role, teamId: teamId === '__none' ? undefined : teamId })
      .then((list) => {
        setUsers(teamId === '__none' ? list.filter((u) => !u.team_id) : list)
        setUpdatedAt(new Date())
      })
      .catch((err) => setError(errorText(err)))
  }, [tenantId, isAdmin, role, teamId])
  useEffect(load, [load])

  const teamName = useMemo(() => Object.fromEntries(teams.map((t) => [t.id, t.name])), [teams])
  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    return (users ?? []).filter((u) => [u.name, u.email, u.username, teamName[u.team_id ?? ''] ?? ''].some((f) => f.toLowerCase().includes(q)))
  }, [users, query, teamName])
  const pages = Math.max(Math.ceil(filtered.length / PAGE), 1)
  const rows = filtered.slice(page * PAGE, (page + 1) * PAGE)

  function changed() {
    load()
    onUsersChanged()
  }

  async function toggleActive(u: User) {
    try {
      await updateUser(u.id, { active: !u.active })
      changed()
    } catch (err) {
      setError(errorText(err))
    }
  }

  async function remove(id: string) {
    try {
      await deleteUser(id)
      setConfirmDelete('')
      changed()
    } catch (err) {
      setError(errorText(err))
    }
  }

  return (
    <>
      <div className="row between gap-12" style={{ flexWrap: 'wrap' }}>
        <div className="row gap-8" style={{ flexWrap: 'wrap' }}>
          <div className="row" style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, color: 'var(--muted-2)' }} />
            <input className="input" style={{ width: 230, height: 34, paddingLeft: 30, fontSize: 12 }} placeholder="Buscar por nome, e-mail ou equipe..." value={query} onChange={(e) => { setQuery(e.target.value); setPage(0) }} />
          </div>
          <select className="select" style={{ width: 'auto', height: 34, fontSize: 12, fontWeight: 600 }} value={role} onChange={(e) => { setRole(e.target.value as Role | ''); setPage(0) }}>
            <option value="">Filtrar por Perfil</option>
            <option value="profissional">Profissional</option>
            <option value="gestao">Gestão de RH</option>
          </select>
          <select className="select" style={{ width: 'auto', height: 34, fontSize: 12, fontWeight: 600 }} value={teamId} onChange={(e) => { setTeamId(e.target.value); setPage(0) }}>
            <option value="">Filtrar por Equipe</option>
            {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            <option value="__none">Sem equipe</option>
          </select>
        </div>
        <div className="row gap-12">
          {updatedAt && <span className="xs muted">Última atualização: {updatedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>}
          <button className="btn btn-primary btn-square" style={{ letterSpacing: '.02em' }} onClick={() => setEditing('new')}>
            <Plus size={14} /> CADASTRAR USUÁRIOS
          </button>
        </div>
      </div>
      {error && <div className="error-msg mt-12">{error}</div>}

      <div className="card mt-16 table-wrap">
        <table className="table">
          <thead>
            <tr><th>Nome</th><th>E-mail</th><th>Equipe</th><th>Perfil</th><th>Status</th><th style={{ textAlign: 'right' }}>Ações</th></tr>
          </thead>
          <tbody>
            {rows.map((u) => {
              const self = u.id === me?.id
              return (
                <tr key={u.id}>
                  <td className="strong">{u.name}{self && <span className="xs muted"> (você)</span>}</td>
                  <td>{u.email}</td>
                  <td>{teamName[u.team_id ?? ''] ?? <span className="muted">—</span>}</td>
                  <td><span className={`badge ${ROLE_BADGE[u.role ?? 'profissional']}`}>{ROLE_LABEL[u.role ?? 'profissional']}</span></td>
                  <td>
                    <button className={`badge ${u.active ? 'badge-green' : 'badge-gray'}`} style={{ border: 0, cursor: self ? 'default' : 'pointer' }} disabled={self} onClick={() => toggleActive(u)} title={self ? '' : u.active ? 'Clique para inativar' : 'Clique para ativar'}>
                      {u.active ? 'Ativo' : 'Inativo'}
                    </button>
                  </td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    {confirmDelete === u.id ? (
                      <>
                        <span className="xs" style={{ color: 'var(--red-700)' }}>Excluir? </span>
                        <button className="icon-btn" style={{ color: 'var(--red)' }} onClick={() => remove(u.id)} title="Confirmar"><Check size={14} /></button>
                        <button className="icon-btn" onClick={() => setConfirmDelete('')} title="Cancelar"><X size={14} /></button>
                      </>
                    ) : (
                      <>
                        <button className="icon-btn" onClick={() => setEditing(u)} title="Editar"><Pencil size={14} /></button>
                        {!self && <button className="icon-btn" style={{ color: 'var(--primary)' }} onClick={() => setConfirmDelete(u.id)} title="Excluir"><Trash2 size={14} /></button>}
                      </>
                    )}
                  </td>
                </tr>
              )
            })}
            {users && rows.length === 0 && <tr><td colSpan={6} className="empty">Nenhum usuário encontrado.</td></tr>}
            {!users && !error && <tr><td colSpan={6} className="empty">Carregando...</td></tr>}
          </tbody>
        </table>
        <div className="pagination">
          <span>Exibindo {filtered.length ? page * PAGE + 1 : 0}-{Math.min((page + 1) * PAGE, filtered.length)} de {filtered.length} colaboradores</span>
          <div className="actions">
            <button className="btn btn-outline btn-sm btn-square" disabled={page === 0} onClick={() => setPage(page - 1)}>Anterior</button>
            <button className="btn btn-primary btn-sm btn-square" disabled={page >= pages - 1} onClick={() => setPage(page + 1)}>Próximo</button>
          </div>
        </div>
      </div>

      {editing && (
        <UserModal
          user={editing === 'new' ? null : editing}
          self={editing !== 'new' && editing.id === me?.id}
          tenantId={tenantId}
          isAdmin={isAdmin}
          teams={teams}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); changed() }}
        />
      )}
    </>
  )
}

interface UserModalProps {
  user: User | null
  self: boolean
  tenantId: string
  isAdmin: boolean
  teams: Team[]
  onClose: () => void
  onSaved: () => void
}

function UserModal({ user, self, tenantId, isAdmin, teams, onClose, onSaved }: UserModalProps) {
  const [form, setForm] = useState({
    name: user?.name ?? '',
    username: user?.username ?? '',
    email: user?.email ?? '',
    password: '',
    role: (user?.role ?? 'profissional') as Role,
    team_id: user?.team_id ?? '',
    active: user?.active ?? true,
  })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm({ ...form, [k]: e.target.value })

  async function submit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      if (user) {
        await updateUser(user.id, {
          name: form.name,
          team_id: form.team_id,
          ...(self ? {} : { role: form.role, active: form.active }),
          ...(form.password ? { password: form.password } : {}),
        })
      } else {
        await createUser({
          name: form.name,
          username: form.username,
          email: form.email,
          password: form.password,
          role: form.role,
          team_id: form.team_id || undefined,
          tenant_id: isAdmin ? tenantId : undefined,
        })
      }
      onSaved()
    } catch (err) {
      setError(errorText(err))
      setSaving(false)
    }
  }

  return (
    <div className="overlay" onClick={onClose}>
      <form className="modal-card" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h1 style={{ fontSize: 18 }}>{user ? 'Editar usuário' : 'Cadastrar usuário'}</h1>
        <div className="field mt-16">
          <label className="label">Nome completo</label>
          <input className="input" value={form.name} onChange={set('name')} required autoFocus />
        </div>
        <div className="grid grid-2 mt-12" style={{ gap: 12 }}>
          <div className="field">
            <label className="label">Usuário</label>
            <input className="input" value={form.username} onChange={set('username')} required disabled={!!user} />
          </div>
          <div className="field">
            <label className="label">E-mail corporativo</label>
            <input className="input" type="email" value={form.email} onChange={set('email')} required disabled={!!user} />
          </div>
        </div>
        <div className="grid grid-2 mt-12" style={{ gap: 12 }}>
          <div className="field">
            <label className="label">Equipe</label>
            <select className="select" value={form.team_id} onChange={set('team_id')}>
              <option value="">Sem equipe</option>
              {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div className="field">
            <label className="label">Perfil</label>
            <select className="select" value={form.role} onChange={set('role')} disabled={self || user?.role === 'admin'}>
              <option value="profissional">Profissional</option>
              <option value="gestao">Gestão de RH</option>
              {user?.role === 'admin' && <option value="admin">Administrador</option>}
            </select>
          </div>
        </div>
        <div className="field mt-12">
          <label className="label">{user ? 'Nova senha (deixe em branco para manter)' : 'Senha inicial'}</label>
          <input className="input" type="password" minLength={8} value={form.password} onChange={set('password')} required={!user} autoComplete="new-password" />
        </div>
        {user && !self && (
          <label className="checkbox mt-12">
            <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
            Acesso ativo (desmarcado, o usuário não consegue entrar)
          </label>
        )}
        {error && <div className="error-msg mt-12">{error}</div>}
        <div className="row gap-8 mt-24" style={{ justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-outline" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" disabled={saving}>{user ? 'Salvar' : 'Cadastrar'}</button>
        </div>
      </form>
    </div>
  )
}

function TeamsTab({ tenantId, isAdmin, teams, reload }: { tenantId: string; isAdmin: boolean; teams: Team[]; reload: () => void }) {
  const [name, setName] = useState('')
  const [editingId, setEditingId] = useState('')
  const [editName, setEditName] = useState('')
  const [confirmDelete, setConfirmDelete] = useState('')
  const [error, setError] = useState('')

  async function run(fn: () => Promise<unknown>) {
    setError('')
    try {
      await fn()
      reload()
      return true
    } catch (err) {
      setError(errorText(err))
      return false
    }
  }

  async function add(e: FormEvent) {
    e.preventDefault()
    if (await run(() => createTeam(name.trim(), isAdmin ? tenantId : undefined))) setName('')
  }

  async function rename(id: string) {
    if (await run(() => updateTeam(id, editName.trim()))) setEditingId('')
  }

  return (
    <>
      <form className="row gap-8" onSubmit={add}>
        <input className="input" style={{ maxWidth: 320, height: 34, fontSize: 12 }} placeholder="Nome da nova equipe (ex.: Squad DevOps)" value={name} onChange={(e) => setName(e.target.value)} required />
        <button className="btn btn-primary btn-square"><Plus size={14} /> Criar equipe</button>
      </form>
      {error && <div className="error-msg mt-12">{error}</div>}
      <div className="card mt-16 table-wrap">
        <table className="table">
          <thead><tr><th>Equipe</th><th>Membros</th><th>Criada em</th><th style={{ textAlign: 'right' }}>Ações</th></tr></thead>
          <tbody>
            {teams.map((t) => (
              <tr key={t.id}>
                <td className="strong">
                  {editingId === t.id ? (
                    <form className="row gap-4" onSubmit={(e) => { e.preventDefault(); rename(t.id) }}>
                      <input className="input" style={{ height: 30, fontSize: 12 }} value={editName} onChange={(e) => setEditName(e.target.value)} autoFocus required />
                      <button className="icon-btn" title="Salvar"><Check size={14} /></button>
                      <button type="button" className="icon-btn" onClick={() => setEditingId('')} title="Cancelar"><X size={14} /></button>
                    </form>
                  ) : t.name}
                </td>
                <td>{t.members_count}</td>
                <td>{new Date(t.created_at).toLocaleDateString('pt-BR')}</td>
                <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                  {confirmDelete === t.id ? (
                    <>
                      <span className="xs" style={{ color: 'var(--red-700)' }}>{t.members_count ? `Excluir? ${t.members_count} membro(s) ficarão sem equipe. ` : 'Excluir? '}</span>
                      <button className="icon-btn" style={{ color: 'var(--red)' }} onClick={() => run(() => deleteTeam(t.id)).then(() => setConfirmDelete(''))} title="Confirmar"><Check size={14} /></button>
                      <button className="icon-btn" onClick={() => setConfirmDelete('')} title="Cancelar"><X size={14} /></button>
                    </>
                  ) : (
                    <>
                      <button className="icon-btn" onClick={() => { setEditingId(t.id); setEditName(t.name) }} title="Renomear"><Pencil size={14} /></button>
                      <button className="icon-btn" style={{ color: 'var(--primary)' }} onClick={() => setConfirmDelete(t.id)} title="Excluir"><Trash2 size={14} /></button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {teams.length === 0 && <tr><td colSpan={4} className="empty">Nenhuma equipe criada ainda.</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="xs muted mt-12">As equipes agrupam os colaboradores nos relatórios e na seleção de participantes dos ciclos de pesquisa.</p>
    </>
  )
}
