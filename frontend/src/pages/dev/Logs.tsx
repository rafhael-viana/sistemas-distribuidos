import { useMemo, useState } from 'react'
import { ChevronRight, Copy, ExternalLink, Search } from 'lucide-react'
import { PageHeader } from '../../components/PageHeader'

type Severity = 'Crítico' | 'Erro' | 'Aviso'

interface LogEntry {
  date: string
  time: string
  severity: Severity
  service: string
  exception: string
  endpoint: string
  requestId: string
  message: string
  stack: string[]
  tenant: string
  user: string
  response: string
  version: string
  trace: { service: string; desc: string; ms: string; ok: boolean }[]
}

const LOGS: LogEntry[] = [
  {
    date: '08/10/2026', time: '14:32:18 BRT', severity: 'Erro', service: 'api-core', exception: 'DatabaseTimeoutError', endpoint: 'POST /v1/check-ins', requestId: 'req_7f3a9c21',
    message: 'Query timed out after 5000ms', stack: ['at CheckInRepository.create (check-in.repository.ts:84)', 'at CheckInService.submit (check-in.service.ts:112)'],
    tenant: 'Aurora Tecnologia · tn_aurora', user: 'usr_1048', response: 'POST /v1/check-ins · HTTP 504', version: 'v2.18.3',
    trace: [
      { service: 'api-gateway', desc: 'Requisição recebida', ms: '+0 ms', ok: true },
      { service: 'auth-service', desc: 'Token validado · usr_1048', ms: '+12 ms', ok: true },
      { service: 'api-core → PostgreSQL', desc: 'Timeout ao persistir check-in', ms: '+5.013 ms', ok: false },
      { service: 'api-gateway', desc: 'Resposta 504 enviada ao cliente', ms: '+5.024 ms', ok: false },
    ],
  },
  {
    date: '08/10/2026', time: '14:29:06 BRT', severity: 'Crítico', service: 'auth-service', exception: 'TokenValidationException', endpoint: 'POST /v1/auth/refresh', requestId: 'req_2b8e4d10',
    message: 'JWT signature mismatch', stack: ['at JwtVerifier.verify (jwt.go:41)', 'at AuthHandler.Refresh (auth.go:77)'],
    tenant: 'Horizonte Saúde · tn_horizonte', user: 'usr_2231', response: 'POST /v1/auth/refresh · HTTP 401', version: 'v1.9.0',
    trace: [
      { service: 'api-gateway', desc: 'Requisição recebida', ms: '+0 ms', ok: true },
      { service: 'auth-service', desc: 'Assinatura do token inválida', ms: '+8 ms', ok: false },
    ],
  },
  {
    date: '08/10/2026', time: '14:25:41 BRT', severity: 'Erro', service: 'notification-worker', exception: 'SMTPConnectionError', endpoint: 'job: send-reminder', requestId: 'req_6c1d8f02',
    message: 'connect ECONNREFUSED smtp:587', stack: ['at Sender.Send (sender.go:52)', 'at Consumer.handle (auth.go:39)'],
    tenant: 'Aurora Tecnologia · tn_aurora', user: '—', response: 'job: send-reminder · retry 3/5', version: 'v1.4.2',
    trace: [
      { service: 'kafka', desc: 'Evento consumido', ms: '+0 ms', ok: true },
      { service: 'notification-worker', desc: 'Falha ao conectar no SMTP', ms: '+3.002 ms', ok: false },
    ],
  },
  {
    date: '08/10/2026', time: '14:21:09 BRT', severity: 'Aviso', service: 'api-core', exception: 'RateLimitExceeded', endpoint: 'GET /v1/teams', requestId: 'req_9a5c7e33',
    message: 'Tenant exceeded 1000 req/min', stack: ['at RateLimiter.check (ratelimit.ts:22)'],
    tenant: 'Lumina Educação · tn_lumina', user: 'usr_0412', response: 'GET /v1/teams · HTTP 429', version: 'v2.18.3',
    trace: [
      { service: 'api-gateway', desc: 'Requisição recebida', ms: '+0 ms', ok: true },
      { service: 'api-core', desc: 'Limite de requisições atingido', ms: '+2 ms', ok: false },
    ],
  },
]
const SEV_BADGE: Record<Severity, string> = { 'Crítico': 'badge-red', Erro: 'badge-red', Aviso: 'badge-orange' }

export function Logs() {
  const [query, setQuery] = useState('')
  const [severity, setSeverity] = useState<'' | Severity>('')
  const [service, setService] = useState('')
  const [selected, setSelected] = useState(LOGS[0]!.requestId)
  const [copied, setCopied] = useState(false)

  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    return LOGS.filter((l) => (!severity || l.severity === severity) && (!service || l.service === service) && [l.exception, l.endpoint, l.requestId, l.message, l.user].some((f) => f.toLowerCase().includes(q)))
  }, [query, severity, service])
  const log = LOGS.find((l) => l.requestId === selected)

  async function copyId() {
    if (!log) return
    await navigator.clipboard?.writeText(log.requestId)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <>
      <PageHeader
        before={<div className="eyebrow">Área de desenvolvimento</div>}
        title="Logs Técnicos & Rastreamento de Erros"
        subtitle="Localize exceções da aplicação e investigue falhas ponta a ponta pelo ID da requisição."
        right={<span className="pill">Dev/Engenharia</span>}
      />
      <div className="row gap-8" style={{ flexWrap: 'wrap' }}>
        <div className="row" style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 10, color: 'var(--muted-2)' }} />
          <input className="input" style={{ width: 250, height: 32, paddingLeft: 30, fontSize: 12 }} placeholder="Buscar usuário, endpoint, mensagem ou request ID..." value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <select className="select" style={{ width: 'auto', height: 32, fontSize: 12, fontWeight: 600 }} value={severity} onChange={(e) => setSeverity(e.target.value as Severity | '')}>
          <option value="">Severidade: Todas</option><option>Crítico</option><option>Erro</option><option>Aviso</option>
        </select>
        <select className="select" style={{ width: 'auto', height: 32, fontSize: 12, fontWeight: 600 }} value={service} onChange={(e) => setService(e.target.value)}>
          <option value="">Serviço: Todos</option>
          {[...new Set(LOGS.map((l) => l.service))].map((s) => <option key={s}>{s}</option>)}
        </select>
        <select className="select" style={{ width: 'auto', height: 32, fontSize: 12, fontWeight: 600 }} defaultValue="24h">
          <option value="24h">Período: Últimas 24h</option><option value="7d">Período: Últimos 7 dias</option>
        </select>
      </div>

      <div className="card mt-16 table-wrap">
        <table className="table">
          <thead><tr><th>Data / Hora</th><th>Severidade</th><th>Serviço</th><th>Exceção / Endpoint</th><th>Request ID</th><th style={{ textAlign: 'right' }}>Detalhe</th></tr></thead>
          <tbody>
            {filtered.map((l) => (
              <tr key={l.requestId} className={l.requestId === selected ? 'selected' : ''} style={{ cursor: 'pointer' }} onClick={() => setSelected(l.requestId)}>
                <td>{l.date}<div className="xs muted">{l.time}</div></td>
                <td><span className={`badge ${SEV_BADGE[l.severity]}`}>{l.severity}</span></td>
                <td>{l.service}</td>
                <td><div className="strong" style={{ color: 'var(--text)', fontWeight: 600 }}>{l.exception}</div><div className="mono">{l.endpoint}</div></td>
                <td className="mono">{l.requestId}</td>
                <td style={{ textAlign: 'right', color: l.requestId === selected ? 'var(--primary)' : 'var(--muted-2)' }}><ChevronRight size={15} /></td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={6} className="empty">Nenhuma ocorrência encontrada.</td></tr>}
          </tbody>
        </table>
        <div className="pagination">
          <span>Exibindo 1-{filtered.length} de 38 ocorrências · 3 críticas · 28 erros · 7 avisos</span>
          <div className="actions">
            <button className="btn btn-outline btn-sm btn-square" disabled>Anterior</button>
            <button className="btn btn-primary btn-sm btn-square">Próximo</button>
          </div>
        </div>
      </div>

      {log && (
        <div className="card mt-16">
          <div className="row between">
            <div className="row gap-8">
              <b style={{ fontSize: 15 }}>{log.exception}</b>
              <span className={`badge ${SEV_BADGE[log.severity]}`}>{log.severity}</span>
              <span className="xs muted">{log.service} · produção · {log.version}</span>
            </div>
            <button className="btn btn-outline btn-sm btn-square" onClick={copyId}><Copy size={13} /> {copied ? 'Copiado!' : 'Copiar request ID'}</button>
          </div>
          <div className="grid mt-16" style={{ gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            <div>
              <div className="code-block">
                <div className="err">{log.message}</div>
                {log.stack.map((s) => <div key={s}>&nbsp;&nbsp;{s}</div>)}
              </div>
              <div className="grid grid-2 mt-12 xs" style={{ gap: 10 }}>
                <Detail label="Request ID" value={log.requestId} />
                <Detail label="Empresa / Tenant" value={log.tenant} />
                <Detail label="Usuário (ID técnico)" value={log.user} />
                <Detail label="Endpoint / Resposta" value={log.response} />
              </div>
            </div>
            <div style={{ borderLeft: '1px solid var(--border)', paddingLeft: 16 }}>
              <div className="row between xs"><b>Correlação da requisição</b><span className="muted">{log.trace[log.trace.length - 1]!.ms.replace('+', '')}</span></div>
              <div className="stack gap-8 mt-12">
                {log.trace.map((t, i) => (
                  <div key={i} className="row between xs">
                    <div className="row gap-8" style={{ alignItems: 'flex-start' }}>
                      <span style={{ width: 6, height: 6, borderRadius: 3, marginTop: 5, background: t.ok ? 'var(--green)' : 'var(--red)' }} />
                      <div><b>{t.service}</b><div className="muted">{t.desc}</div></div>
                    </div>
                    <span className="mono" style={{ color: t.ok ? 'var(--muted)' : 'var(--red)' }}>{t.ms}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <hr className="divider" style={{ margin: '16px 0 12px' }} />
          <div className="row between xs">
            <div className="row gap-8">
              <ExternalLink size={13} /> <b>Sentry</b>
              <span className="badge badge-gray">Demonstração</span>
              <span className="muted">Sem conexão real · evento MS-1842</span>
            </div>
            <span className="link">Ver evento de exemplo ↗</span>
          </div>
        </div>
      )}
      <p className="xs muted mt-16">Dados demonstrativos · Atualizado em 08/10/2026 às 14:35 (BRT) · Apenas falhas técnicas, sem eventos de auditoria de negócio.</p>
    </>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="muted">{label}</div>
      <div style={{ fontWeight: 600 }}>{value}</div>
    </div>
  )
}
