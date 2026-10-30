import { Heart } from 'lucide-react'
import { PageHeader } from '../../components/PageHeader'
import { markAllRead, useNotifications } from '../../data/notifications'

export function Notifications() {
  const { items, unread } = useNotifications()
  return (
    <>
      <PageHeader
        title="Minhas Notificações"
        subtitle="Acompanhe novidades, alertas preventivos e a liberação de novos ciclos."
        right={
          <>
            <span className="pill">Notificações e Dicas</span>
            <button className="btn btn-outline btn-sm" disabled={unread === 0} onClick={markAllRead}>Marcar todas como lidas</button>
          </>
        }
      />
      <div className="stack gap-12">
        {items.map((n) => (
          <div key={n.id} className="card row gap-16" style={{ alignItems: 'flex-start', opacity: n.read ? 0.7 : 1 }}>
            <div className="icon-circle" style={{ margin: 0, flexShrink: 0, background: n.kind === 'success' ? 'var(--green-50)' : 'var(--blue-50)', color: n.kind === 'success' ? 'var(--green)' : 'var(--blue-700)' }}>
              <Heart size={15} />
            </div>
            <div style={{ flex: 1 }}>
              <div className="row gap-8">
                <b style={{ fontSize: 13 }}>{n.title}</b>
                <span className={`badge ${n.kind === 'success' ? 'badge-green' : 'badge-blue'}`}>{n.kind === 'success' ? 'Sucesso' : 'Info'}</span>
                {!n.read && <span style={{ width: 6, height: 6, borderRadius: 3, background: 'var(--primary)' }} />}
              </div>
              <p className="small muted mt-8" style={{ lineHeight: 1.5 }}>{n.body}</p>
            </div>
            <span className="xs muted" style={{ whiteSpace: 'nowrap' }}>{n.when}</span>
          </div>
        ))}
      </div>
    </>
  )
}
