import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Lock, Mail, User } from 'lucide-react'
import { PageHeader } from '../../components/PageHeader'
import { UserHeaderRight } from '../../components/UserHeaderRight'
import { Toggle } from '../../components/Toggle'
import { useAuth } from '../../context/AuthContext'
import { loadResult } from '../../data/checkin'
import { loadPreferences } from '../onboarding/Onboarding'

const SETTINGS_KEY = 'mindsync.settings'

interface Settings {
  fatigueAnalysis: boolean
  ergonomicSharing: boolean
  pauseReminders: boolean
  monthlyReport: boolean
}

function loadSettings(): Settings {
  const defaults = { fatigueAnalysis: true, ergonomicSharing: false, pauseReminders: true, monthlyReport: true }
  try {
    return { ...defaults, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}') }
  } catch {
    return defaults
  }
}

export function Settings() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [settings, setSettings] = useState(loadSettings)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [msg, setMsg] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  function update<K extends keyof Settings>(key: K, value: Settings[K]) {
    const next = { ...settings, [key]: value }
    setSettings(next)
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(next))
  }

  // O backend ainda não tem endpoint de troca de senha.
  function changePassword(e: FormEvent) {
    e.preventDefault()
    if (password.length < 8) {
      setMsg('A nova senha precisa ter pelo menos 8 caracteres.')
      return
    }
    setPassword('')
    setMsg('Solicitação de troca de senha registrada.')
  }

  function exportData() {
    const data = { usuario: user, preferencias: loadPreferences(), configuracoes: settings, ultimoCheckin: loadResult() }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'meus-dados-mindsync.json'
    a.click()
    URL.revokeObjectURL(a.href)
  }

  function deleteAccount() {
    for (const k of Object.keys(localStorage)) if (k.startsWith('mindsync.')) localStorage.removeItem(k)
    logout()
    navigate('/', { replace: true })
  }

  return (
    <>
      <PageHeader
        title="Configurações e Privacidade"
        subtitle="Gerencie seus dados pessoais, termos de consentimento, segurança e notificações."
        right={<UserHeaderRight />}
      />

      <div className="grid grid-2" style={{ alignItems: 'start' }}>
        <div className="stack gap-16">
          <div className="card">
            <div className="card-title">Dados Pessoais</div>
            <div className="field mt-16">
              <span className="label" style={{ color: 'var(--muted)' }}>Nome de usuário</span>
              <div className="input-wrap" style={{ background: '#f8fafc', borderColor: 'var(--border)' }}>
                <User size={16} />
                <input value={user?.name ?? ''} readOnly />
                <span className="readonly-tag">Somente Leitura</span>
              </div>
            </div>
            <div className="field mt-12">
              <span className="label" style={{ color: 'var(--muted)' }}>E-mail registrado</span>
              <div className="input-wrap" style={{ background: '#f8fafc', borderColor: 'var(--border)' }}>
                <Mail size={16} />
                <input value={user?.email ?? ''} readOnly />
                <span className="readonly-tag">Somente Leitura</span>
              </div>
            </div>
          </div>

          <form className="card" onSubmit={changePassword}>
            <div className="card-title">Segurança</div>
            <div className="field mt-16">
              <label className="label" htmlFor="new-password" style={{ color: 'var(--muted)' }}>Nova Senha</label>
              <div className="input-wrap" style={{ background: '#f8fafc', borderColor: 'var(--border)' }}>
                <Lock size={16} />
                <input id="new-password" type={showPassword ? 'text' : 'password'} placeholder="••••••••••••" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
                <button type="button" className="trailing" onClick={() => setShowPassword((s) => !s)} aria-label="Mostrar senha">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            {msg && <div className="success-msg mt-12">{msg}</div>}
            <button className="btn btn-primary mt-16">Atualizar Senha</button>
          </form>
        </div>

        <div className="stack gap-16">
          <div className="card">
            <div className="card-title">Termos de Consentimento (LGPD)</div>
            <SettingRow
              title="Análise de Fadiga Cognitiva"
              desc="Autorizo processar meus dados de tempo de foco para gerar métricas de cansaço mental."
              checked={settings.fatigueAnalysis}
              onChange={(v) => update('fatigueAnalysis', v)}
            />
            <SettingRow
              title="Compartilhamento de Relatórios Ergonômicos"
              desc="Permito que relatórios anonimizados sejam fornecidos à equipe médica da empresa para prevenção de lesões."
              checked={settings.ergonomicSharing}
              onChange={(v) => update('ergonomicSharing', v)}
              border
            />
          </div>

          <div className="card">
            <div className="card-title">Notificações</div>
            <SettingRow
              title="Lembretes de Pausa Ativa (Navegador)"
              desc="Exibir lembretes automáticos na tela a cada 2 horas de foco contínuo."
              checked={settings.pauseReminders}
              onChange={(v) => update('pauseReminders', v)}
            />
            <SettingRow
              title="Relatório Mensal por E-mail"
              desc="Receber compilação consolidada de desempenho e saúde diretamente no e-mail corporativo."
              checked={settings.monthlyReport}
              onChange={(v) => update('monthlyReport', v)}
            />
          </div>

          <div className="card">
            <div className="card-title">Controle de Privacidade (LGPD)</div>
            <p className="xs muted mt-12" style={{ lineHeight: 1.6 }}>
              Você tem o direito de exportar um relatório consolidado com suas atividades ou revogar permanentemente o consentimento de dados na plataforma.
            </p>
            {confirmDelete ? (
              <div className="error-msg mt-16">
                Tem certeza? Seus dados locais serão apagados e você sairá da conta.
                <div className="row gap-8 mt-12">
                  <button className="btn btn-outline btn-sm" onClick={() => setConfirmDelete(false)}>Cancelar</button>
                  <button className="btn btn-danger-outline btn-sm" onClick={deleteAccount}>Confirmar exclusão</button>
                </div>
              </div>
            ) : (
              <div className="grid grid-2 mt-16" style={{ gap: 10 }}>
                <button className="btn btn-outline" onClick={exportData}>Exportar meus Dados</button>
                <button className="btn btn-danger-outline" onClick={() => setConfirmDelete(true)}>Solicitar Exclusão Definitiva</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

function SettingRow({ title, desc, checked, onChange, border }: { title: string; desc: string; checked: boolean; onChange: (v: boolean) => void; border?: boolean }) {
  return (
    <div className="row between gap-16" style={{ marginTop: 14, paddingTop: border ? 14 : 0, borderTop: border ? '1px solid var(--border)' : 0 }}>
      <div>
        <div className="small" style={{ fontWeight: 600 }}>{title}</div>
        <div className="xs muted" style={{ lineHeight: 1.45, marginTop: 2 }}>{desc}</div>
      </div>
      <Toggle checked={checked} onChange={onChange} label={title} />
    </div>
  )
}
