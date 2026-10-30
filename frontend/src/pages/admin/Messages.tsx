import { useState, type FormEvent } from 'react'
import { Plus } from 'lucide-react'
import { PageHeader } from '../../components/PageHeader'
import { Toggle } from '../../components/Toggle'
import { CATEGORIES, deleteMessage, saveMessage, useMessages, type Category, type PreventiveMessage } from '../../data/messages'

type Draft = Omit<PreventiveMessage, 'id' | 'updatedAt'> & { id?: string }

export function Messages() {
  const messages = useMessages()
  const [filter, setFilter] = useState<'Todas' | Category>('Todas')
  const [editing, setEditing] = useState<Draft | null>(null)
  const shown = filter === 'Todas' ? messages : messages.filter((m) => m.category === filter)

  return (
    <>
      <PageHeader
        title="Mensagens Preventivas"
        subtitle="Gerencie o catálogo de dicas e insights que alimentam a central dos colaboradores."
        right={
          <button className="btn btn-primary" onClick={() => setEditing({ category: 'Ergonomia', title: '', body: '', active: true })}>
            <Plus size={14} /> Adicionar Nova Mensagem
          </button>
        }
      />
      <div className="chips">
        {(['Todas', ...CATEGORIES] as const).map((c) => (
          <button key={c} className={`chip${c === filter ? ' active' : ''}`} onClick={() => setFilter(c)}>{c}</button>
        ))}
      </div>
      <div className="grid grid-2 mt-16" style={{ maxWidth: 520 * 2 }}>
        {shown.map((m) => (
          <div key={m.id} className="card" style={{ padding: 14 }}>
            <div className="row between">
              <span className="badge badge-purple">{m.category}</span>
              <span className={`badge ${m.active ? 'badge-green' : 'badge-red'}`}>{m.active ? 'Ativo' : 'Inativo'}</span>
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, marginTop: 10 }}>{m.title}</div>
            <p className="xs muted mt-8" style={{ lineHeight: 1.5, minHeight: 32 }}>{m.body}</p>
            <div className="row between mt-12" style={{ borderTop: '1px solid var(--border)', paddingTop: 10 }}>
              <span className="xs" style={{ color: 'var(--muted-2)' }}>Modificado em {m.updatedAt}</span>
              <div className="row gap-8">
                <button className="btn btn-outline btn-sm btn-square" onClick={() => setEditing(m)}>Editar</button>
                <button className="btn btn-sm btn-square" style={{ background: 'var(--red-50)', color: 'var(--red)' }} onClick={() => deleteMessage(m.id)}>Excluir</button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {shown.length === 0 && <div className="empty">Nenhuma mensagem nesta categoria.</div>}
      {editing && <MessageModal draft={editing} onClose={() => setEditing(null)} />}
    </>
  )
}

function MessageModal({ draft, onClose }: { draft: Draft; onClose: () => void }) {
  const [form, setForm] = useState(draft)

  function submit(e: FormEvent) {
    e.preventDefault()
    saveMessage(form)
    onClose()
  }

  return (
    <div className="overlay" onClick={onClose}>
      <form className="modal-card" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h1 style={{ fontSize: 18 }}>{draft.id ? 'Editar mensagem' : 'Nova mensagem preventiva'}</h1>
        <div className="field mt-16">
          <label className="label">Categoria</label>
          <select className="select" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as Category })}>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div className="field mt-12">
          <label className="label">Título</label>
          <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
        </div>
        <div className="field mt-12">
          <label className="label">Descrição</label>
          <textarea className="input" style={{ height: 90, padding: 10, resize: 'vertical' }} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} required />
        </div>
        <div className="row gap-12 mt-12 small">
          <Toggle checked={form.active} onChange={(v) => setForm({ ...form, active: v })} label="Ativa" />
          {form.active ? 'Ativa na Central de Bem-estar' : 'Inativa'}
        </div>
        <div className="row gap-8 mt-24" style={{ justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-outline" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary">Salvar</button>
        </div>
      </form>
    </div>
  )
}
