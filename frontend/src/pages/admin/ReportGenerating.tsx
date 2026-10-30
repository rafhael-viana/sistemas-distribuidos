import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { CheckCircle2, XCircle } from 'lucide-react'
import { downloadURL, getReport, type Report } from '../../api/reports'

const STAGES = ['Coletando check-ins', 'Compilando respostas', 'Aplicando anonimização', 'Gerando arquivo']

export function ReportGenerating() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const summary = (useLocation().state ?? {}) as { period?: string; indicators?: string; scope?: string }
  const [report, setReport] = useState<Report | null>(null)
  const [progress, setProgress] = useState(10)
  const [error, setError] = useState('')

  // Consulta o status no serviço de relatórios até sair de "pending".
  useEffect(() => {
    let alive = true
    let timer: ReturnType<typeof setTimeout>
    const poll = async () => {
      try {
        const r = await getReport(id)
        if (!alive) return
        setReport(r)
        if (r.status === 'pending') timer = setTimeout(poll, 1000)
      } catch {
        if (alive) setError('Não foi possível consultar o status do relatório.')
      }
    }
    poll()
    return () => {
      alive = false
      clearTimeout(timer)
    }
  }, [id])

  // Barra de progresso visual: avança até 90% enquanto o backend processa.
  useEffect(() => {
    if (report && report.status !== 'pending') {
      setProgress(100)
      return
    }
    const t = setInterval(() => setProgress((p) => Math.min(p + 7, 90)), 400)
    return () => clearInterval(t)
  }, [report])

  const done = report?.status === 'done'
  const failed = report?.status === 'failed' || !!error
  const stage = STAGES[Math.min(Math.floor((progress / 100) * STAGES.length), STAGES.length - 1)]

  return (
    <div style={{ minHeight: 'calc(100vh - 80px)', display: 'grid', placeItems: 'center' }}>
      <div className="card" style={{ width: '100%', maxWidth: 400, textAlign: 'center', padding: '28px 26px', borderRadius: 18 }}>
        <div className="icon-circle" style={{ width: 52, height: 52, margin: '0 auto 14px', background: failed ? 'var(--red-50)' : done ? 'var(--green-50)' : 'var(--primary-50)' }}>
          {failed ? <XCircle size={26} color="var(--red)" /> : done ? <CheckCircle2 size={26} color="var(--green)" /> : <div className="spinner" />}
        </div>
        <h2 style={{ fontSize: 17, fontWeight: 800 }}>{failed ? 'Falha ao gerar o relatório' : done ? 'Relatório pronto!' : 'Gerando seu Relatório...'}</h2>
        <p className="small mt-12" style={{ color: 'var(--text-2)', lineHeight: 1.6 }}>
          {failed
            ? error || report?.error || 'Ocorreu um erro durante a geração.'
            : `O compilado agregado de ${summary.indicators?.toLowerCase() || 'estresse ocupacional e engajamento'} dos ${summary.period?.toLowerCase() || 'últimos 30 dias'} está sendo processado com segurança e anonimato garantidos.`}
        </p>
        {!done && !failed && <p className="xs muted mt-8">Não feche esta aba. Avisaremos você por e-mail e em suas notificações assim que estiver tudo concluído.</p>}

        {!failed && (
          <div className="mt-16" style={{ textAlign: 'left' }}>
            <div className="progress"><div style={{ width: `${progress}%` }} /></div>
            <div className="row between xs mt-8" style={{ color: 'var(--primary)', fontWeight: 600 }}>
              <span>{done ? 'Concluído' : stage}</span>
              <span>{progress}%</span>
            </div>
          </div>
        )}

        <div className="row gap-8 mt-16" style={{ justifyContent: 'center' }}>
          {done && report && <a className="btn btn-primary btn-sm btn-square" href={downloadURL(report.id)}>Baixar {report.format.toUpperCase()}</a>}
          <button className="btn btn-outline btn-sm btn-square" onClick={() => navigate('/gestao/relatorios')}>
            {done ? 'Ver relatórios' : 'Voltar ao início'}
          </button>
        </div>
      </div>
    </div>
  )
}
