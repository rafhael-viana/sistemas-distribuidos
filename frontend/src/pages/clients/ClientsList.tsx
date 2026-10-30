import { useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Pencil, Search, Trash2 } from 'lucide-react'
import { ClientTabs, ClientTitle } from './ClientsLayout'
import { removeClient, updateClient, useClients } from '../../data/clients'

const PAGE = 7

export function ClientsList() {
  const clients = useClients()
  const created = (useLocation().state as { created?: string } | null)?.created
  const [query, setQuery] = useState('')
  const [type, setType] = useState<'Todos' | 'PF' | 'PJ'>('Todos')
  const [page, setPage] = useState(0)

  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    return clients.filter((c) => (type === 'Todos' || c.type === type) && (c.name.toLowerCase().includes(q) || c.document.includes(q)))
  }, [clients, query, type])
  const pages = Math.max(Math.ceil(filtered.length / PAGE), 1)
  const rows = filtered.slice(page * PAGE, (page + 1) * PAGE)

  return (
    <>
      <ClientTitle>Clientes Cadastrados</ClientTitle>
      <ClientTabs />
      {created && <div className="success-msg" style={{ marginBottom: 16 }}>Cadastro concluído: {created}.</div>}
      <div className="row gap-12">
        <div className="row" style={{ position: 'relative', flex: 1 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, color: 'var(--muted)' }} />
          <input className="input" style={{ background: '#e5e7eb', border: 0, paddingLeft: 32 }} placeholder="Buscar por nome, documento..." value={query} onChange={(e) => { setQuery(e.target.value); setPage(0) }} />
        </div>
        <select className="select" style={{ width: 130, borderColor: 'var(--primary)' }} value={type} onChange={(e) => { setType(e.target.value as typeof type); setPage(0) }}>
          <option>Todos</option>
          <option value="PF">Pessoa Física</option>
          <option value="PJ">Pessoa Jurídica</option>
        </select>
      </div>

      <div className="card mt-16 table-wrap">
        <table className="table">
          <thead><tr><th>Nome / Razão Social</th><th>CPF / CNPJ</th><th>Telefone</th><th>Tipo</th><th>Status</th><th style={{ textAlign: 'right' }}>Ações</th></tr></thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id} className="striped">
                <td className="strong" style={{ fontWeight: 500 }}>{c.name}</td>
                <td className="muted">{c.document}</td>
                <td className="muted">{c.phone}</td>
                <td><b className="xs">{c.type}</b></td>
                <td><span className={`badge ${c.active ? 'badge-purple' : 'badge-dark'}`}>{c.active ? 'Ativo' : 'Inativo'}</span></td>
                <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <button className="icon-btn" title={c.active ? 'Inativar' : 'Ativar'} onClick={() => updateClient(c.id, { active: !c.active })}><Pencil size={14} /></button>
                  <button className="icon-btn" style={{ color: '#c026d3' }} title="Remover" onClick={() => removeClient(c.id)}><Trash2 size={14} /></button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={6} className="empty">Nenhum cliente encontrado.</td></tr>}
          </tbody>
        </table>
        <div className="pagination">
          <span>Exibindo {filtered.length ? page * PAGE + 1 : 0}-{Math.min((page + 1) * PAGE, filtered.length)} de {filtered.length} clientes</span>
          <div className="actions">
            <button className="btn btn-outline-primary btn-sm btn-square" disabled={page === 0} onClick={() => setPage(page - 1)}>Anterior</button>
            <button className="btn btn-primary btn-sm btn-square" disabled={page >= pages - 1} onClick={() => setPage(page + 1)}>Próximo</button>
          </div>
        </div>
      </div>
    </>
  )
}
