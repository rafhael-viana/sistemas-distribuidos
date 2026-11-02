import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { listTenants, type Tenant } from '../api/org'
import { roleOf, useAuth } from './AuthContext'

const KEY = 'mindsync.adminTenant'

interface TenantScopeValue {
  // Empresa cujos dados as telas de gestão mostram. Gestão: a própria.
  tenantId: string
  isAdmin: boolean
  tenants: Tenant[]
  setTenantId: (id: string) => void
  reloadTenants: () => void
}

const TenantScopeContext = createContext<TenantScopeValue | null>(null)

// TenantScopeProvider deixa o admin escolher qual empresa administrar nas
// telas de gestão; para a gestão, a empresa é sempre a do usuário.
export function TenantScopeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const isAdmin = roleOf(user) === 'admin'
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [selected, setSelected] = useState(() => localStorage.getItem(KEY) ?? '')
  const [version, setVersion] = useState(0)

  useEffect(() => {
    if (!isAdmin) return
    listTenants()
      .then((list) => {
        setTenants(list)
        setSelected((cur) => (list.some((t) => t.id === cur) ? cur : (list[0]?.id ?? '')))
      })
      .catch(() => setTenants([]))
  }, [isAdmin, version])

  function setTenantId(id: string) {
    localStorage.setItem(KEY, id)
    setSelected(id)
  }

  const value: TenantScopeValue = {
    tenantId: isAdmin ? selected : (user?.tenant_id ?? ''),
    isAdmin,
    tenants,
    setTenantId,
    reloadTenants: () => setVersion((v) => v + 1),
  }
  return <TenantScopeContext.Provider value={value}>{children}</TenantScopeContext.Provider>
}

export function useTenantScope() {
  const ctx = useContext(TenantScopeContext)
  if (!ctx) throw new Error('useTenantScope precisa estar dentro de <TenantScopeProvider>')
  return ctx
}

// TenantPicker aparece na barra lateral da gestão para o admin.
export function TenantPicker() {
  const { isAdmin, tenants, tenantId, setTenantId } = useTenantScope()
  if (!isAdmin) return null
  return (
    <div style={{ marginTop: 20 }}>
      <div className="section-label" style={{ margin: '0 6px 8px' }}>Empresa</div>
      <select className="area-switch" value={tenantId} onChange={(e) => setTenantId(e.target.value)} aria-label="Empresa">
        {tenants.length === 0 && <option value="">Nenhuma empresa</option>}
        {tenants.map((t) => (
          <option key={t.id} value={t.id}>{t.name}</option>
        ))}
      </select>
    </div>
  )
}
