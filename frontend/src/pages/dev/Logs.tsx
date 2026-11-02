import { useCallback, useEffect, useState } from 'react'
import { ChevronRight, Copy, Database, Network, RefreshCw, Search, Server, Waypoints } from 'lucide-react'
import { PageHeader } from '../../components/PageHeader'
import { ApiError } from '../../api/client'
import {
  listLogs,
  systemStatus,
  traceRequest,
  type Component,
  type LogEntry,
  type LogFilter,
  type LogLevel,
  type LogPage,
} from '../../api/audit'

const LEVEL: Record<LogLevel, { label: string; badge: string }> = {
  critical: { label: 'Crítico', badge: 'badge-red' },
  error: { label: 'Erro', badge: 'badge-red' },
  warn: { label: 'Aviso', badge: 'badge-orange' },
  info: { label: 'Info', badge: 'badge-gray' },
}
// Filtro de severidade: "problemas" esconde as requisições que deram certo.
const SEVERITY_OPTIONS: { value: string; label: string; levels: LogLevel[] }[] = [
  { value: 'problems', label: 'Severidade: Problemas', levels: ['critical', 'error', 'warn'] },
  { value: 'critical', label: 'Severidade: Crítico', levels: ['critical'] },
  { value: 'error', label: 'Severidade: Erro', levels: ['error'] },
  { value: 'warn', label: 'Severidade: Aviso', levels: ['warn'] },
  { value: 'all', label: 'Severidade: Todas', levels: [] },
]
const SERVICES = ['api-gateway', 'auth', 'notification', 'audit', 'report']
const PERIODS = [
  { value: '1h', label: 'Período: Última hora' },
  { value: '24h', label: 'Período: Últimas 24h' },
  { value: '168h', label: 'Período: Últimos 7 dias' },
  { value: '', label: 'Período: Tudo' },
]
const PAGE = 8
const REFRESH_MS = 10_000

export function Logs() {
  const [severity, setSeverity] = useState('problems')
  const [service, setService] = useState('')
  const [since, setSince] = useState('24h')
  const [q, setQ] = useState('')
  const [search, setSearch] = useState('')
  const [offset, setOffset] = useState(0)
  const [page, setPage] = useState<LogPage | null>(null)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<LogEntry | null>(null)

  const filter: LogFilter = {
    levels: SEVERITY_OPTIONS.find((o) => o.value === severity)!.levels,
    service,
    since,
    q: search,
    limit: PAGE,
    offset,
  }
  const filterKey = JSON.stringify(filter)

  const load = useCallback(async () => {
    try {
      const p = await listLogs(JSON.parse(filterKey) as LogFilter)
      setPage(p)
      setError('')
      setSelected((cur) => cur ?? p.items[0] ?? null)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro inesperado.')
    }
  }, [filterKey])

  useEffect(() => {
    load()
    const t = setInterval(load, REFRESH_MS)
    return () => clearInterval(t)
  }, [load])

  function changeFilter(fn: () => void) {
    fn()
    setOffset(0)
    setSelected(null)
  }

  const counts = page?.counts ?? {}
  return (
    <>
      <PageHeader
        before={<div className="eyebrow">Área de desenvolvimento</div>}
        title="Logs Técnicos & Rastreamento de Erros"
        subtitle="Localize exceções da aplicação e investigue falhas ponta a ponta pelo ID da requisição."
        right={<span className="pill">Dev/Engenharia</span>}
      />

      <Components />

      <div className="row gap-8 mt-16" style={{ flexWrap: 'wrap' }}>
        <form className="row" style={{ position: 'relative' }} onSubmit={(e) => { e.preventDefault(); changeFilter(() => setSearch(q.trim())) }}>
          <Search size={14} style={{ position: 'absolute', left: 10, color: 'var(--muted-2)' }} />
          <input className="input" style={{ width: 260, height: 32, paddingLeft: 30, fontSize: 12 }} placeholder="Buscar usuário, endpoint, mensagem ou request ID..." value={q} onChange={(e) => setQ(e.target.value)} />
        </form>
        <select className="select" style={{ width: 'auto', height: 32, fontSize: 12, fontWeight: 600 }} value={severity} onChange={(e) => changeFilter(() => setSeverity(e.target.value))}>
          {SEVERITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select className="select" style={{ width: 'auto', height: 32, fontSize: 12, fontWeight: 600 }} value={service} onChange={(e) => changeFilter(() => setService(e.target.value))}>
          <option value="">Serviço: Todos</option>
          {SERVICES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="select" style={{ width: 'auto', height: 32, fontSize: 12, fontWeight: 600 }} value={since} onChange={(e) => changeFilter(() => setSince(e.target.value))}>
          {PERIODS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
        <button className="icon-btn" onClick={load} title="Atualizar"><RefreshCw size={14} /></button>
      </div>
      {error && <div className="error-msg mt-12">Não foi possível carregar os logs do serviço de auditoria: {error}</div>}

      <div className="card mt-16 table-wrap">
        <table className="table">
          <thead><tr><th>Data / Hora</th><th>Severidade</th><th>Serviço</th><th>Exceção / Endpoint</th><th>Request ID</th><th style={{ textAlign: 'right' }}>Detalhe</th></tr></thead>
          <tbody>
            {page?.items.map((l) => (
              <tr key={l.id} className={l.id === selected?.id ? 'selected' : ''} style={{ cursor: 'pointer' }} onClick={() => setSelected(l)}>
                <td>{new Date(l.occurred_at).toLocaleDateString('pt-BR')}<div className="xs muted">{new Date(l.occurred_at).toLocaleTimeString('pt-BR')}</div></td>
                <td><span className={`badge ${LEVEL[l.level].badge}`}>{LEVEL[l.level].label}</span></td>
                <td>{l.service}</td>
                <td>
                  <div className="strong" style={{ color: 'var(--text)', fontWeight: 600 }}>{l.error || l.message}</div>
                  <div className="mono">{l.method} {l.path}{l.status ? ` · ${l.status}` : ''}</div>
                </td>
                <td className="mono">{l.request_id || '—'}</td>
                <td style={{ textAlign: 'right', color: l.id === selected?.id ? 'var(--primary)' : 'var(--muted-2)' }}><ChevronRight size={15} /></td>
              </tr>
            ))}
            {page && page.items.length === 0 && <tr><td colSpan={6} className="empty">Nenhuma ocorrência no período.</td></tr>}
            {!page && !error && <tr><td colSpan={6} className="empty">Carregando...</td></tr>}
          </tbody>
        </table>
        <div className="pagination">
          <span>
            Exibindo {page?.total ? offset + 1 : 0}-{Math.min(offset + PAGE, page?.total ?? 0)} de {page?.total ?? 0} ocorrências ·{' '}
            {counts.critical ?? 0} críticas · {counts.error ?? 0} erros · {counts.warn ?? 0} avisos · {counts.info ?? 0} info
          </span>
          <div className="actions">
            <button className="btn btn-outline btn-sm btn-square" disabled={offset === 0} onClick={() => setOffset(Math.max(offset - PAGE, 0))}>Anterior</button>
            <button className="btn btn-primary btn-sm btn-square" disabled={offset + PAGE >= (page?.total ?? 0)} onClick={() => setOffset(offset + PAGE)}>Próximo</button>
          </div>
        </div>
      </div>

      {selected && <LogDetail key={selected.id} log={selected} />}
      <p className="xs muted mt-16">
        Logs publicados por cada serviço no tópico <span className="mono">logs.events</span> e guardados pelo serviço de auditoria · atualiza a cada 10s.
      </p>
    </>
  )
}

const KIND_ICON = { gateway: Network, service: Server, broker: Waypoints, database: Database }
const STATUS_STYLE: Record<Component['status'], { label: string; color: string }> = {
  up: { label: 'Operacional', color: 'var(--green)' },
  down: { label: 'Fora do ar', color: 'var(--red)' },
  disabled: { label: 'Desativado', color: 'var(--muted-2)' },
}

// Components mostra a saúde de cada peça da arquitetura, verificada pelo gateway.
function Components() {
  const [data, setData] = useState<{ checked_at: string; components: Component[] } | null>(null)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    systemStatus()
      .then((d) => { setData(d); setError('') })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'gateway indisponível'))
  }, [])
  useEffect(() => {
    load()
    const t = setInterval(load, REFRESH_MS)
    return () => clearInterval(t)
  }, [load])

  return (
    <div className="card">
      <div className="row between">
        <div className="card-title" style={{ fontSize: 13 }}>Componentes da arquitetura</div>
        <span className="xs muted">{data ? `Verificado às ${new Date(data.checked_at).toLocaleTimeString('pt-BR')}` : ''}</span>
      </div>
      {error && <div className="error-msg mt-12">Não foi possível verificar os componentes: {error}</div>}
      <div className="grid mt-12" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}>
        {data?.components.map((c) => {
          const Icon = KIND_ICON[c.kind]
          const st = STATUS_STYLE[c.status]
          return (
            <div key={c.name} title={`${c.address}${c.detail ? `\n${c.detail}` : ''}`} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px' }}>
              <div className="row between">
                <div className="row gap-8 small" style={{ fontWeight: 700 }}><Icon size={14} /> {c.name}</div>
                <span style={{ width: 8, height: 8, borderRadius: 4, background: st.color }} />
              </div>
              <div className="xs mt-8" style={{ color: st.color, fontWeight: 600 }}>{st.label}{c.status === 'up' && c.kind !== 'gateway' ? ` · ${c.latency_ms} ms` : ''}</div>
              <div className="xs muted" style={{ marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.detail || c.address}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// LogDetail mostra o log escolhido e a correlação da requisição entre os
// serviços (gateway -> serviço -> Kafka -> consumidores).
function LogDetail({ log }: { log: LogEntry }) {
  const [trace, setTrace] = useState<LogEntry[] | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!log.request_id) {
      setTrace([log])
      return
    }
    traceRequest(log.request_id).then(setTrace).catch(() => setTrace([log]))
  }, [log])

  async function copyId() {
    await navigator.clipboard?.writeText(log.request_id)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const t0 = trace?.length ? new Date(trace[0]!.occurred_at).getTime() : 0
  const total = trace?.length ? Math.max(...trace.map((t) => new Date(t.occurred_at).getTime() + t.duration_ms)) - t0 : 0
  return (
    <div className="card mt-16">
      <div className="row between">
        <div className="row gap-8">
          <b style={{ fontSize: 15 }}>{log.error || log.message}</b>
          <span className={`badge ${LEVEL[log.level].badge}`}>{LEVEL[log.level].label}</span>
          <span className="xs muted">{log.service} · {log.kind === 'http' ? 'requisição HTTP' : log.kind === 'event' ? 'evento do Kafka' : 'tarefa'}</span>
        </div>
        {log.request_id && <button className="btn btn-outline btn-sm btn-square" onClick={copyId}><Copy size={13} /> {copied ? 'Copiado!' : 'Copiar request ID'}</button>}
      </div>
      <div className="grid mt-16" style={{ gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <div>
          <div className="code-block">
            <div className={log.level === 'info' ? '' : 'err'}>{log.error || log.message}</div>
            {log.stack ? <pre style={{ margin: '6px 0 0', whiteSpace: 'pre-wrap', fontSize: 10 }}>{log.stack}</pre> : <div>{log.method} {log.path}{log.status ? ` → HTTP ${log.status}` : ''} · {log.duration_ms} ms</div>}
          </div>
          <div className="grid grid-2 mt-12 xs" style={{ gap: 10 }}>
            <Detail label="Request ID" value={log.request_id || '—'} />
            <Detail label="Serviço" value={log.service} />
            <Detail label="Usuário (ID técnico)" value={log.user_id || '—'} />
            <Detail label="Endpoint / Resposta" value={`${log.method ?? ''} ${log.path ?? ''}${log.status ? ` · HTTP ${log.status}` : ''}`} />
            <Detail label="Data / Hora" value={new Date(log.occurred_at).toLocaleString('pt-BR')} />
            <Detail label="Duração" value={`${log.duration_ms} ms`} />
          </div>
        </div>
        <div style={{ borderLeft: '1px solid var(--border)', paddingLeft: 16 }}>
          <div className="row between xs"><b>Correlação da requisição</b><span className="muted">{total} ms</span></div>
          <div className="stack gap-8 mt-12">
            {!trace && <span className="xs muted">Carregando...</span>}
            {trace?.map((t) => {
              const ok = t.level === 'info'
              return (
                <div key={t.id} className="row between xs" style={{ fontWeight: t.id === log.id ? 700 : 400 }}>
                  <div className="row gap-8" style={{ alignItems: 'flex-start' }}>
                    <span style={{ width: 6, height: 6, borderRadius: 3, marginTop: 5, flexShrink: 0, background: ok ? 'var(--green)' : t.level === 'warn' ? 'var(--orange)' : 'var(--red)' }} />
                    <div>
                      <b>{t.service}</b>
                      <div className="muted">{t.kind === 'event' ? `Kafka: ${t.message}` : `${t.method} ${t.path} → ${t.status}`}{t.error ? ` · ${t.error}` : ''}</div>
                    </div>
                  </div>
                  <span className="mono" style={{ color: ok ? 'var(--muted)' : 'var(--red)', whiteSpace: 'nowrap' }}>
                    +{new Date(t.occurred_at).getTime() - t0} ms
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="muted">{label}</div>
      <div style={{ fontWeight: 600, wordBreak: 'break-all' }}>{value}</div>
    </div>
  )
}
