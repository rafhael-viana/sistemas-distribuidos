import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { PageHeader } from '../../components/PageHeader'
import { downloadURL, listReports, type Report } from '../../api/reports'

export const REPORT_TYPE_LABEL: Record<Report['type'], string> = {
  users: 'Relatório Consolidado de Usuários',
  logins: 'Relatório de Engajamento (Acessos)',
}

// Linhas do protótipo, exibidas quando o serviço de relatórios não está no ar.
const DEMO = [
  { name: 'Relatório Consolidado de Ergonomia - TI', date: '05/04/2026', status: 'ready' },
  { name: 'Mapeamento Preventivo de Burnout - Q1', date: '02/04/2026', status: 'ready' },
  { name: 'Pesquisa de Saúde Mental: Clima & Organização', date: '08/04/2026', status: 'processing' },
  { name: 'Relatório de Fadiga Ocular Geral', date: '15/03/2026', status: 'expired' },
] as const

export function Reports() {
  const navigate = useNavigate()
  const [reports, setReports] = useState<Report[] | null>(null)
  const [offline, setOffline] = useState(false)

  useEffect(() => {
    let alive = true
    const load = () =>
      listReports()
        .then((r) => {
          if (!alive) return
          setReports(r.sort((a, b) => b.created_at.localeCompare(a.created_at)))
          setOffline(false)
        })
        .catch(() => alive && setOffline(true))
    load()
    // Atualiza enquanto houver relatórios em processamento.
    const t = setInterval(load, 4000)
    return () => {
      alive = false
      clearInterval(t)
    }
  }, [])

  return (
    <>
      <PageHeader
        title="Relatórios & Export"
        subtitle="Gerencie e solicite relatórios de análise agregada dos dados coletados."
        right={
          <button className="btn btn-primary" onClick={() => navigate('/gestao/relatorios/novo')}>
            <Plus size={14} /> Solicitar Novo Relatório
          </button>
        }
      />
      {offline && (
        <div className="error-msg" style={{ marginBottom: 16 }}>
          Não foi possível falar com o serviço de relatórios (porta 8084). Exibindo dados de exemplo.
        </div>
      )}
      <div className="card table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Nome do Relatório</th>
              <th>Data da Solicitação</th>
              <th>Status</th>
              <th>Download</th>
            </tr>
          </thead>
          <tbody>
            {offline || !reports
              ? DEMO.map((r) => (
                  <tr key={r.name}>
                    <td className="strong">{r.name}</td>
                    <td>{r.date}</td>
                    <td><StatusBadge status={r.status} /></td>
                    <td>{r.status === 'ready' ? <a className="link" style={{ textDecoration: 'underline' }}>Baixar PDF (Expira em 24h)</a> : <span className="muted">{r.status === 'processing' ? 'Processando dados...' : 'Link Expirado'}</span>}</td>
                  </tr>
                ))
              : reports.map((r) => (
                  <tr key={r.id}>
                    <td className="strong">{REPORT_TYPE_LABEL[r.type]}</td>
                    <td>{new Date(r.created_at).toLocaleDateString('pt-BR')}</td>
                    <td><StatusBadge status={r.status === 'done' ? 'ready' : r.status === 'pending' ? 'processing' : 'failed'} /></td>
                    <td>
                      {r.status === 'done' ? (
                        <a className="link" style={{ textDecoration: 'underline' }} href={downloadURL(r.id)}>Baixar {r.format.toUpperCase()}</a>
                      ) : (
                        <span className="muted">{r.status === 'pending' ? 'Processando dados...' : r.error || 'Falha na geração'}</span>
                      )}
                    </td>
                  </tr>
                ))}
            {!offline && reports?.length === 0 && (
              <tr>
                <td colSpan={4} className="empty">Nenhum relatório solicitado ainda.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}

function StatusBadge({ status }: { status: 'ready' | 'processing' | 'expired' | 'failed' }) {
  const map = {
    ready: ['badge-green', 'Pronto'],
    processing: ['badge-orange', 'Em processamento'],
    expired: ['badge-red', 'Expirado'],
    failed: ['badge-red', 'Falhou'],
  } as const
  const [cls, label] = map[status]
  return <span className={`badge ${cls}`}>{label}</span>
}
