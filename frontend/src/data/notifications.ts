import { useSyncExternalStore } from 'react'

export interface Notification {
  id: string
  title: string
  kind: 'success' | 'info'
  body: string
  when: string
  read: boolean
}

let items: Notification[] = [
  {
    id: 'n1',
    title: 'Devolutiva disponível',
    kind: 'success',
    body: 'Sua devolutiva do Ciclo de Ergonomia de Agosto está disponível no painel. Veja os insights e melhorias propostas para a sua rotina.',
    when: 'Há 10 minutos',
    read: false,
  },
  {
    id: 'n2',
    title: 'Novo ciclo de bem-estar iniciado',
    kind: 'info',
    body: "O RH iniciou o ciclo coletivo 'Qualidade de Vida e Prevenção de Estresse no Home Office'. Participe respondendo os rápidos check-ins.",
    when: 'Há 2 horas',
    read: false,
  },
]
const listeners = new Set<() => void>()

function subscribe(fn: () => void) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function markAllRead() {
  items = items.map((n) => ({ ...n, read: true }))
  listeners.forEach((fn) => fn())
}

export function useNotifications() {
  const list = useSyncExternalStore(subscribe, () => items)
  return { items: list, unread: list.filter((n) => !n.read).length }
}
