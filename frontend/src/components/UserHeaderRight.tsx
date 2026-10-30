import { Bell } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useNotifications } from '../data/notifications'

// Sino de notificações + selo do ciclo atual, repetido no topo das telas do colaborador.
export function UserHeaderRight() {
  const navigate = useNavigate()
  const { unread } = useNotifications()
  return (
    <>
      <button className="bell" onClick={() => navigate('/app/notificacoes')} aria-label="Notificações">
        <Bell size={16} fill="#fff" />
        {unread > 0 && <span className="dot" />}
      </button>
      <span className="pill">Ciclo Atual: Ativo</span>
    </>
  )
}
