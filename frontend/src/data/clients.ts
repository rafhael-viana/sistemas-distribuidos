import { useSyncExternalStore } from 'react'

export interface Client {
  id: string
  name: string
  document: string
  phone: string
  type: 'PF' | 'PJ'
  active: boolean
}

let clients: Client[] = [
  { id: 'c1', name: 'Beatriz Oliveira Pinto', document: '392.108.442-90', phone: '(11) 98112-9034', type: 'PF', active: true },
  { id: 'c2', name: 'Nexo Digital e Soluções LTDA', document: '42.091.311/0001-92', phone: '(21) 3490-1120', type: 'PJ', active: true },
  { id: 'c3', name: 'Gabriel Santos Alencar', document: '109.845.321-12', phone: '(31) 97331-4500', type: 'PF', active: true },
  { id: 'c4', name: 'Vanguard Seguros S.A.', document: '09.112.450/0001-08', phone: '(11) 4004-9210', type: 'PJ', active: false },
  { id: 'c5', name: 'Mariana Costa Neves', document: '288.541.902-33', phone: '(19) 99234-8021', type: 'PF', active: true },
  { id: 'c6', name: 'Helius Serviços Industriais', document: '33.801.445/0001-55', phone: '(41) 3091-8840', type: 'PJ', active: true },
  { id: 'c7', name: 'Thiago Ramos de Souza', document: '410.992.831-04', phone: '(11) 98771-3320', type: 'PF', active: true },
]
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((fn) => fn())

export function useClients() {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },
    () => clients,
  )
}

export function addClients(list: Omit<Client, 'id'>[]) {
  clients = [...list.map((c) => ({ ...c, id: crypto.randomUUID() })), ...clients]
  emit()
}

export function updateClient(id: string, patch: Partial<Client>) {
  clients = clients.map((c) => (c.id === id ? { ...c, ...patch } : c))
  emit()
}

export function removeClient(id: string) {
  clients = clients.filter((c) => c.id !== id)
  emit()
}

const digits = (s: string) => s.replace(/\D/g, '')

// Validação dos dígitos verificadores de CPF e CNPJ.
export function validCPF(cpf: string) {
  const d = digits(cpf)
  if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false
  const check = (n: number) => {
    let sum = 0
    for (let i = 0; i < n; i++) sum += Number(d[i]) * (n + 1 - i)
    const r = (sum * 10) % 11
    return r === 10 ? 0 : r
  }
  return check(9) === Number(d[9]) && check(10) === Number(d[10])
}

export function validCNPJ(cnpj: string) {
  const d = digits(cnpj)
  if (d.length !== 14 || /^(\d)\1+$/.test(d)) return false
  const calc = (n: number) => {
    const weights = n === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    const sum = weights.reduce((acc, w, i) => acc + w * Number(d[i]), 0)
    const r = sum % 11
    return r < 2 ? 0 : 11 - r
  }
  return calc(12) === Number(d[12]) && calc(13) === Number(d[13])
}

export function maskCPF(v: string) {
  return digits(v).slice(0, 11).replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}

export function maskPhone(v: string) {
  const d = digits(v).slice(0, 11)
  if (d.length <= 10) return d.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2')
  return d.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2')
}

export function maskCEP(v: string) {
  return digits(v).slice(0, 8).replace(/(\d{5})(\d)/, '$1-$2')
}

export function maskDate(v: string) {
  return digits(v).slice(0, 8).replace(/(\d{2})(\d)/, '$1/$2').replace(/(\d{2})(\d)/, '$1/$2')
}

export { digits }
