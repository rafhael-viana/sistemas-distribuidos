import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '../../components/PageHeader'
import { UserHeaderRight } from '../../components/UserHeaderRight'
import { CHECKIN_STAGES, computeResult, emptyAnswers, saveResult, type Answers } from '../../data/checkin'

const DRAFT_KEY = 'mindsync.checkinDraft'

function loadDraft(): { stage: number; answers: Answers } {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    // rascunho inválido: começa do zero
  }
  return { stage: 0, answers: emptyAnswers() }
}

export function Checkin() {
  const navigate = useNavigate()
  const [{ stage, answers }, setState] = useState(loadDraft)
  const current = CHECKIN_STAGES[stage]!
  const total = CHECKIN_STAGES.length
  const progress = Math.round(((stage + 1) / total) * 100)
  const complete = answers[stage]!.every((v) => v > 0)

  function answer(q: number, value: number) {
    setState((s) => ({
      ...s,
      answers: s.answers.map((row, i) => (i === s.stage ? row.map((v, j) => (j === q ? value : v)) : row)),
    }))
  }

  function saveForLater() {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ stage, answers }))
    navigate('/app')
  }

  function next() {
    if (stage < total - 1) {
      setState({ stage: stage + 1, answers })
      return
    }
    saveResult(computeResult(answers))
    localStorage.removeItem(DRAFT_KEY)
    navigate('/app/checkin/devolutiva')
  }

  return (
    <>
      <PageHeader title="Check-in Periódico" subtitle="Como está sua relação com o trabalho hoje?" right={<UserHeaderRight />} />

      <div className="card">
        <div className="row between">
          <div style={{ fontSize: 13, fontWeight: 700 }}>
            Etapa {stage + 1} de {total} — {current.title}
          </div>
          <div className="small" style={{ color: 'var(--primary)', fontWeight: 600 }}>{progress}% Concluído</div>
        </div>
        <div className="progress mt-12"><div style={{ width: `${progress}%` }} /></div>
        <p className="xs muted mt-12">
          Responda com honestidade baseado em seus últimos 7 dias de trabalho. Seus dados são confidenciais e protegidos pela LGPD.
        </p>
      </div>

      <div className="card mt-16" style={{ padding: '4px 20px' }}>
        {current.questions.map((q, i) => (
          <div key={q} style={{ padding: '18px 0', borderTop: i ? '1px solid var(--border)' : 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{i + 1}. {q}</div>
            <div className="question" style={{ padding: '10px 0 0' }}>
              <span className="xs muted">Discordo totalmente</span>
              <div className="scale" style={{ justifyContent: 'center' }}>
                {[1, 2, 3, 4, 5].map((v) => (
                  <button key={v} className={answers[stage]![i] === v ? 'active' : ''} onClick={() => answer(i, v)}>{v}</button>
                ))}
              </div>
              <span className="xs muted" style={{ textAlign: 'right' }}>Concordo totalmente</span>
            </div>
          </div>
        ))}
      </div>

      <div className="row between mt-16">
        <button className="btn btn-ghost" onClick={saveForLater}>Salvar e continuar depois</button>
        <div className="row gap-8">
          <button className="btn btn-outline" disabled={stage === 0} onClick={() => setState({ stage: stage - 1, answers })}>Voltar</button>
          <button className="btn btn-primary" disabled={!complete} onClick={next}>{stage === total - 1 ? 'Concluir' : 'Próximo'}</button>
        </div>
      </div>
    </>
  )
}
