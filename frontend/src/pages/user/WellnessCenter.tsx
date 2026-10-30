import { useState } from 'react'
import { PageHeader } from '../../components/PageHeader'
import { UserHeaderRight } from '../../components/UserHeaderRight'
import { useMessages, CATEGORIES } from '../../data/messages'

// Central de Bem-estar: o catálogo de mensagens preventivas ativas mantido pelo RH.
export function WellnessCenter() {
  const messages = useMessages().filter((m) => m.active)
  const [filter, setFilter] = useState<string>('Todas')
  const shown = filter === 'Todas' ? messages : messages.filter((m) => m.category === filter)

  return (
    <>
      <PageHeader title="Central de Bem-estar" subtitle="Dicas e práticas recomendadas para cuidar de você durante o trabalho." right={<UserHeaderRight />} />
      <div className="chips">
        {['Todas', ...CATEGORIES].map((c) => (
          <button key={c} className={`chip${c === filter ? ' active' : ''}`} onClick={() => setFilter(c)}>{c}</button>
        ))}
      </div>
      <div className="grid grid-3 mt-16">
        {shown.map((m) => (
          <div key={m.id} className="card">
            <span className="badge badge-purple">{m.category}</span>
            <div style={{ fontSize: 15, fontWeight: 700, marginTop: 12 }}>{m.title}</div>
            <p className="small muted mt-8" style={{ lineHeight: 1.55 }}>{m.body}</p>
          </div>
        ))}
        {shown.length === 0 && <div className="empty">Nenhuma dica nesta categoria por enquanto.</div>}
      </div>
    </>
  )
}
