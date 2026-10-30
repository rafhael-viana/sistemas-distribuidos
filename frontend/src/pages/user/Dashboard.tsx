import { useNavigate } from 'react-router-dom'
import { ShieldCheck, Sparkles } from 'lucide-react'
import { PageHeader } from '../../components/PageHeader'
import { UserHeaderRight } from '../../components/UserHeaderRight'
import { LineChart } from '../../components/LineChart'
import { firstName, useAuth } from '../../context/AuthContext'
import { loadResult } from '../../data/checkin'

export function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const last = loadResult()
  const doneToday = last && new Date(last.at).toDateString() === new Date().toDateString()

  return (
    <>
      <PageHeader
        title={`Olá, ${firstName(user?.name ?? 'Camila')}!`}
        subtitle="Tenha um excelente dia de trabalho hoje."
        right={<UserHeaderRight />}
      />

      <div className="row between gap-16" style={{ background: 'linear-gradient(90deg, #2a0b4a, #4c1d95)', color: '#fff', borderRadius: 14, padding: '20px 22px' }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>
            {doneToday ? 'Check-in de hoje concluído!' : 'Seu check-in de hoje está disponível'}
          </div>
          <p style={{ fontSize: 12, color: '#ddd6fe', marginTop: 6, maxWidth: 420, lineHeight: 1.5 }}>
            {doneToday
              ? 'Obrigado! Sua devolutiva já está pronta para consulta.'
              : 'Leva menos de 1 minuto. Suas respostas ajudam o sistema a calibrar as dicas de ergonomia e fadiga cognitiva.'}
          </p>
        </div>
        <button className="btn" style={{ background: '#fff', color: 'var(--primary)' }} onClick={() => navigate(doneToday ? '/app/checkin/devolutiva' : '/app/checkin')}>
          {doneToday ? 'Ver devolutiva' : 'Responder agora'}
        </button>
      </div>

      <div className="grid grid-main-side mt-16">
        <div className="card">
          <div className="row between">
            <div>
              <div className="card-title" style={{ fontSize: 13 }}>Tendência de Bem-Estar</div>
              <div className="card-sub xs">Indicador de equilíbrio mental e físico (últimos 7 dias)</div>
            </div>
            <span className="xs" style={{ color: 'var(--primary)' }}>● Seu Score</span>
          </div>
          <div className="mt-16">
            <LineChart values={[6.2, 6.6, 5.8, 7.2, 7.6, 6.9, 7.4]} max={10} labels={['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']} height={120} />
          </div>
        </div>
        <div className="card">
          <div className="row gap-8">
            <Sparkles size={16} color="var(--primary)" />
            <div className="card-title" style={{ fontSize: 13 }}>Dica do Dia</div>
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, marginTop: 14 }}>A regra dos 20-20-20</div>
          <p className="xs muted mt-8" style={{ lineHeight: 1.6 }}>
            A cada 20 minutos de uso de tela, desvie o olhar para um objeto a pelo menos 6 metros de distância por 20
            segundos. Isso reduz significativamente a fadiga visual e as dores de cabeça causadas pelo monitor.
          </p>
          <div className="row gap-8 mt-12 xs" style={{ background: 'var(--primary-50)', color: 'var(--primary)', borderRadius: 8, padding: '8px 10px', fontWeight: 600 }}>
            <ShieldCheck size={14} />
            Você completou 85% dos alongamentos recomendados esta semana.
          </div>
        </div>
      </div>

      <div className="grid grid-3 mt-16">
        <StatCard label="Nível de Foco" value="Excelente" desc="Seu maior período de foco ininterrupto foi na quarta-feira." />
        <StatCard label="Qualidade do Sono" value="7.8h / média" desc="Seu sono manteve-se estável e regenerativo nesta semana." />
        <StatCard label="Sessões Ergonomia" value="4 realizadas" desc="Ótimo ritmo de exercícios para prevenir LER/DORT." />
      </div>
    </>
  )
}

function StatCard({ label, value, desc }: { label: string; value: string; desc: string }) {
  return (
    <div className="card" style={{ padding: 14 }}>
      <div className="xs muted">{label}</div>
      <div style={{ fontSize: 16, fontWeight: 800, marginTop: 8 }}>{value}</div>
      <p className="xs muted mt-8" style={{ lineHeight: 1.5 }}>{desc}</p>
    </div>
  )
}
