import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, Clock, MessageSquare, ShieldAlert } from 'lucide-react'
import { Toggle } from '../../components/Toggle'
import { useAuth } from '../../context/AuthContext'

export interface Preferences {
  checkins: boolean
  feedback: boolean
  aggregated: boolean
  channel: string
  schedule: string
}

const PREFS_KEY = 'mindsync.preferences'

export function loadPreferences(): Preferences {
  const defaults: Preferences = { checkins: true, feedback: true, aggregated: false, channel: 'Slack Integration', schedule: 'Terças e Quintas às 16:00' }
  try {
    return { ...defaults, ...JSON.parse(localStorage.getItem(PREFS_KEY) ?? '{}') }
  } catch {
    return defaults
  }
}

export function savePreferences(p: Preferences) {
  localStorage.setItem(PREFS_KEY, JSON.stringify(p))
}

// Fluxo pós-cadastro/login: privacidade -> como funcionam os check-ins -> conclusão.
export function Onboarding() {
  const { finishOnboarding, logout } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [prefs, setPrefs] = useState<Preferences>(loadPreferences)

  function finish() {
    savePreferences(prefs)
    finishOnboarding()
    navigate('/app', { replace: true })
  }

  function cancel() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="center-page">
      {step === 1 && <PrivacyStep prefs={prefs} setPrefs={setPrefs} onCancel={cancel} onNext={() => { savePreferences(prefs); setStep(2) }} />}
      {step === 2 && <CheckinStep prefs={prefs} setPrefs={setPrefs} onSkip={finish} onNext={() => setStep(3)} />}
      {step === 3 && <DoneStep prefs={prefs} onBack={() => setStep(2)} onFinish={finish} />}
    </div>
  )
}

interface StepProps {
  prefs: Preferences
  setPrefs: (p: Preferences) => void
}

function PrivacyStep({ prefs, setPrefs, onCancel, onNext }: StepProps & { onCancel: () => void; onNext: () => void }) {
  const items: { key: 'checkins' | 'feedback' | 'aggregated'; title: string; desc: string }[] = [
    { key: 'checkins', title: 'Check-ins periódicos', desc: 'Perguntas breves sobre estresse, foco e conforto ergonômico no seu terminal.' },
    { key: 'feedback', title: 'Devolutivas pessoais', desc: 'Dicas geradas automaticamente com base nos seus dados para o seu bem-estar privado.' },
    {
      key: 'aggregated',
      title: 'Dados agregados para RH (anonimizados)',
      desc: 'Nossos algoritmos agrupam suas respostas para que o RH enxergue apenas tendências de grandes grupos, garantindo que ninguém saiba o que você respondeu.',
    },
  ]
  const [open, setOpen] = useState<string | null>(null)

  return (
    <div className="modal-card">
      <div className="icon-circle"><ShieldAlert size={16} /></div>
      <h1>Seus dados, suas regras</h1>
      <p className="lead">
        Na MindSync, acreditamos que você é o único proprietário dos seus dados. Configure abaixo o que você se sente
        confortável em compartilhar. Suas respostas individuais nunca são divulgadas para terceiros ou superiores.
      </p>
      <hr className="divider" />
      <div className="stack gap-16">
        {items.map((it) => (
          <div key={it.key} className="row gap-12" style={{ alignItems: 'flex-start' }}>
            <Toggle checked={prefs[it.key]} onChange={(v) => setPrefs({ ...prefs, [it.key]: v })} label={it.title} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{it.title}</div>
              <div className="small muted" style={{ lineHeight: 1.45, marginTop: 2 }}>{it.desc}</div>
              <button className="link xs" onClick={() => setOpen(open === it.key ? null : it.key)}>saiba mais</button>
              {open === it.key && (
                <div className="xs muted mt-8" style={{ background: 'var(--primary-50)', borderRadius: 8, padding: 8, lineHeight: 1.5 }}>
                  Você pode alterar esta opção a qualquer momento em Configurações. Desativar não apaga respostas já enviadas,
                  mas impede novos usos desse dado.
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      <hr className="divider" />
      <div className="row between gap-12">
        <p className="xs muted" style={{ maxWidth: 170 }}>Você pode alterar estas configurações a qualquer momento em seu perfil.</p>
        <div className="row gap-8">
          <button className="btn btn-soft" onClick={onCancel}>Cancelar</button>
          <button className="btn btn-primary" onClick={onNext}>Salvar e Continuar</button>
        </div>
      </div>
    </div>
  )
}

function StepHeader({ step }: { step: number }) {
  return (
    <div className="row between" style={{ marginBottom: 14 }}>
      <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.06em', color: 'var(--primary)' }}>PASSO {step} DE 3</span>
      <div className="row gap-4">
        {[1, 2, 3].map((i) => (
          <span key={i} style={{ width: i === step ? 16 : 6, height: 6, borderRadius: 3, background: i === step ? 'var(--primary)' : 'var(--primary-100)' }} />
        ))}
      </div>
    </div>
  )
}

function CheckinStep({ prefs, setPrefs, onSkip, onNext }: StepProps & { onSkip: () => void; onNext: () => void }) {
  return (
    <div className="modal-card">
      <StepHeader step={2} />
      <h1>Como funcionam os check-ins?</h1>
      <p className="lead" style={{ marginTop: 10 }}>
        Nossos check-ins são desenhados para não atrapalhar seu fluxo de trabalho. São apenas 3 perguntas simples duas
        vezes por semana no seu canal de preferência.
      </p>
      <div className="grid grid-2 mt-24" style={{ gap: 12 }}>
        <div style={{ background: '#f8fafc', borderRadius: 12, padding: 14 }}>
          <Clock size={16} color="var(--primary)" />
          <div style={{ fontSize: 13, fontWeight: 700, marginTop: 8 }}>Check-in Programado</div>
          <p className="xs muted mt-8" style={{ lineHeight: 1.5 }}>Escolha o melhor horário do dia para responder sem quebrar seu estado de hyperfocus.</p>
        </div>
        <div style={{ background: '#f8fafc', borderRadius: 12, padding: 14 }}>
          <MessageSquare size={16} color="var(--primary)" />
          <div style={{ fontSize: 13, fontWeight: 700, marginTop: 8 }}>Canal de Contato</div>
          <p className="xs muted mt-8" style={{ lineHeight: 1.5 }}>Responda via e-mail corporativo ou diretamente pelo Slack / Teams de sua equipe.</p>
        </div>
      </div>
      <div className="mt-16" style={{ background: 'var(--primary-50)', borderRadius: 12, padding: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)', marginBottom: 10 }}>Personalizar lembretes</div>
        <div className="grid grid-2" style={{ gap: 12 }}>
          <select className="select" value={prefs.channel} onChange={(e) => setPrefs({ ...prefs, channel: e.target.value })}>
            <option>Slack Integration</option>
            <option>Microsoft Teams</option>
            <option>E-mail corporativo</option>
          </select>
          <select className="select" value={prefs.schedule} onChange={(e) => setPrefs({ ...prefs, schedule: e.target.value })}>
            <option>Terças e Quintas às 16:00</option>
            <option>Segundas e Quartas às 10:00</option>
            <option>Quartas e Sextas às 14:00</option>
          </select>
        </div>
      </div>
      <hr className="divider" />
      <div className="row between">
        <button className="btn btn-ghost" onClick={onSkip}>Pular Onboarding</button>
        <button className="btn btn-primary" onClick={onNext}>Próximo Passo</button>
      </div>
    </div>
  )
}

function DoneStep({ prefs, onBack, onFinish }: { prefs: Preferences; onBack: () => void; onFinish: () => void }) {
  return (
    <div className="modal-card">
      <StepHeader step={3} />
      <div className="icon-circle" style={{ background: 'var(--green-50)', color: 'var(--green)' }}><CheckCircle2 size={18} /></div>
      <h1>Tudo pronto!</h1>
      <p className="lead" style={{ marginTop: 10 }}>
        Seu espaço de bem-estar está configurado. Confira o resumo abaixo — você pode mudar tudo depois em Configurações.
      </p>
      <div className="mt-16 stack gap-8" style={{ background: '#f8fafc', borderRadius: 12, padding: 14, fontSize: 12 }}>
        <SummaryRow label="Check-ins periódicos" value={prefs.checkins ? 'Ativados' : 'Desativados'} />
        <SummaryRow label="Devolutivas pessoais" value={prefs.feedback ? 'Ativadas' : 'Desativadas'} />
        <SummaryRow label="Dados agregados para RH" value={prefs.aggregated ? 'Compartilhando (anônimo)' : 'Não compartilhar'} />
        <SummaryRow label="Canal" value={prefs.channel} />
        <SummaryRow label="Lembretes" value={prefs.schedule} />
      </div>
      <hr className="divider" />
      <div className="row between">
        <button className="btn btn-ghost" onClick={onBack}>Voltar</button>
        <button className="btn btn-primary" onClick={onFinish}>Ir para o Dashboard</button>
      </div>
    </div>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="row between">
      <span className="muted">{label}</span>
      <b>{value}</b>
    </div>
  )
}
