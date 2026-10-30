import { useSyncExternalStore } from 'react'

export const CATEGORIES = ['Ergonomia', 'Saúde Mental', 'Foco'] as const
export type Category = (typeof CATEGORIES)[number]

export interface PreventiveMessage {
  id: string
  category: Category
  title: string
  body: string
  active: boolean
  updatedAt: string
}

let messages: PreventiveMessage[] = [
  { id: 'm1', category: 'Ergonomia', title: 'A regra dos 20-20-20', body: 'Desvie o olhar do monitor a cada 20 minutos para um ponto distante por 20 segundos.', active: true, updatedAt: '10/02/2026' },
  { id: 'm2', category: 'Saúde Mental', title: 'Meditação Guiada de 5 Minutos', body: 'Pausa rápida baseada na técnica Box Breathing para redução de ansiedade.', active: true, updatedAt: '10/02/2026' },
  { id: 'm3', category: 'Foco', title: 'Organizando suas prioridades', body: 'Divida tarefas complexas em sprints de 25 minutos com auxílio visual.', active: true, updatedAt: '10/02/2026' },
  { id: 'm4', category: 'Ergonomia', title: 'Evitando o cansaço ocular', body: 'Configurações recomendadas de contraste e brilho para o monitor.', active: false, updatedAt: '10/02/2026' },
]
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((fn) => fn())

function subscribe(fn: () => void) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function useMessages() {
  return useSyncExternalStore(subscribe, () => messages)
}

function today() {
  return new Date().toLocaleDateString('pt-BR')
}

export function saveMessage(m: Omit<PreventiveMessage, 'id' | 'updatedAt'> & { id?: string }) {
  if (m.id) {
    messages = messages.map((x) => (x.id === m.id ? { ...x, ...m, updatedAt: today() } : x))
  } else {
    messages = [...messages, { ...m, id: crypto.randomUUID(), updatedAt: today() }]
  }
  emit()
}

export function deleteMessage(id: string) {
  messages = messages.filter((m) => m.id !== id)
  emit()
}
