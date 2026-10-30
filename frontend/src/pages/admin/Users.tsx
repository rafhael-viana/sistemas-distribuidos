import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { PageHeader } from '../../components/PageHeader'

type Profile = 'Profissional' | 'RH' | 'Admin'

interface Member {
  name: string
  email: string
  team: string
  profile: Profile
  active: boolean
}

const PROFILE_BADGE: Record<Profile, string> = { Profissional: 'badge-purple', RH: 'badge-blue', Admin: 'badge-orange' }

const SEED: Member[] = [
  { name: 'Beatriz Oliveira Pinto', email: 'beatriz.oliveira@empresa.com', team: 'Engenharia de Software', profile: 'Profissional', active: true },
  { name: 'Gabriel Santos Alencar', email: 'gabriel.alencar@empresa.com', team: 'Produto & UI/UX', profile: 'Profissional', active: true },
  { name: 'Mariana Costa Neves', email: 'mariana.neves@empresa.com', team: 'Recursos Humanos', profile: 'RH', active: true },
  { name: 'Thiago Ramos de Souza', email: 'thiago.souza@empresa.com', team: 'Infraestrutura', profile: 'Admin', active: true },
  { name: 'Ana Clara Silva', email: 'ana.silva@empresa.com', team: 'Marketing', profile: 'Profissional', active: false },
  { name: 'Lucas Ferreira Lima', email: 'lucas.lima@empresa.com', team: 'Engenharia de Software', profile: 'Profissional', active: true },
  { name: 'Juliana Rocha Prado', email: 'juliana.prado@empresa.com', team: 'Infraestrutura', profile: 'Profissional', active: true },
]
const PAGE = 5

export function Users() {
  const navigate = useNavigate()
  const [members, setMembers] = useState(SEED)
  const [query, setQuery] = useState('')
  const [profile, setProfile] = useState<'' | Profile>('')
  const [page, setPage] = useState(0)

  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    return members.filter((m) => (!profile || m.profile === profile) && [m.name, m.email, m.profile, m.team].some((f) => f.toLowerCase().includes(q)))
  }, [members, query, profile])
  const pages = Math.max(Math.ceil(filtered.length / PAGE), 1)
  const rows = filtered.slice(page * PAGE, page * PAGE + PAGE)

  function toggleActive(email: string) {
    setMembers((ms) => ms.map((m) => (m.email === email ? { ...m, active: !m.active } : m)))
  }

  return (
    <>
      <PageHeader
        title="Gestão de Usuários"
        subtitle="Gerencie perfis, equipes e permissões de acesso ao MindSync."
        right={<span className="pill">Acesso Administrativo</span>}
      />
      <div className="row between gap-12">
        <div className="row gap-8">
          <div className="row" style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, color: 'var(--muted-2)' }} />
            <input className="input" style={{ width: 230, height: 34, paddingLeft: 30, fontSize: 12 }} placeholder="Buscar por nome, e-mail ou perfil..." value={query} onChange={(e) => { setQuery(e.target.value); setPage(0) }} />
          </div>
          <select className="select" style={{ width: 'auto', height: 34, fontSize: 12, fontWeight: 600 }} value={profile} onChange={(e) => { setProfile(e.target.value as Profile | ''); setPage(0) }}>
            <option value="">Filtrar por Perfil</option>
            <option>Profissional</option>
            <option>RH</option>
            <option>Admin</option>
          </select>
        </div>
        <div className="row gap-12">
          <span className="xs muted">Última atualização: Hoje às 08:30h</span>
          <button className="btn btn-primary btn-square" style={{ letterSpacing: '.02em' }} onClick={() => navigate('/clientes/pessoa-fisica')}>
            <Plus size={14} /> CADASTRAR USUÁRIOS
          </button>
        </div>
      </div>

      <div className="card mt-16 table-wrap">
        <table className="table">
          <thead>
            <tr><th>Nome</th><th>E-mail</th><th>Equipe</th><th>Perfil</th><th>Status</th><th style={{ textAlign: 'right' }}>Ações</th></tr>
          </thead>
          <tbody>
            {rows.map((m) => (
              <tr key={m.email}>
                <td className="strong">{m.name}</td>
                <td>{m.email}</td>
                <td>{m.team}</td>
                <td><span className={`badge ${PROFILE_BADGE[m.profile]}`}>{m.profile}</span></td>
                <td><span className={`badge ${m.active ? 'badge-green' : 'badge-gray'}`}>{m.active ? 'Ativo' : 'Inativo'}</span></td>
                <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <button className="icon-btn" onClick={() => toggleActive(m.email)} title={m.active ? 'Inativar' : 'Ativar'}><Pencil size={14} /></button>
                  <button className="icon-btn" style={{ color: 'var(--primary)' }} onClick={() => setMembers((ms) => ms.filter((x) => x.email !== m.email))} title="Remover"><Trash2 size={14} /></button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={6} className="empty">Nenhum usuário encontrado.</td></tr>}
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
    </>
  )
}
