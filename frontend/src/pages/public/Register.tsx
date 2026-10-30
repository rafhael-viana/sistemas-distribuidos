import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Building2, Eye, EyeOff, Lock, User } from 'lucide-react'
import { AuthArt } from '../../components/AuthArt'
import { Logo } from '../../components/Logo'
import { useAuth } from '../../context/AuthContext'
import { translateAuthError } from '../../api/auth'
import { ApiError } from '../../api/client'

// O backend exige um username; geramos a partir do e-mail corporativo.
function usernameFromEmail(email: string) {
  return email.split('@')[0]!.replace(/[^a-zA-Z0-9._-]/g, '').toLowerCase()
}

export function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '', invite: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await register({
        name: form.name,
        email: form.email,
        password: form.password,
        username: usernameFromEmail(form.email),
      })
      navigate('/onboarding', { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? translateAuthError(err.message) : 'Erro inesperado.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-split">
      <AuthArt>
        <div style={{ position: 'absolute', top: 56 }}>
          <Logo variant="light" size={22} />
        </div>
        <h2 style={{ fontSize: 30, fontWeight: 800, lineHeight: 1.25 }}>
          A sua jornada mais saudável
          <br />
          começa aqui.
        </h2>
        <p style={{ fontSize: 13, color: '#d8cdea', lineHeight: 1.6, marginTop: 16, maxWidth: 420 }}>
          Monitore seu bem-estar diário, configure lembretes ergonômicos e receba orientações personalizadas para evitar o
          esgotamento no desenvolvimento de software.
        </p>
      </AuthArt>

      <div className="auth-form-side plain">
        <div className="auth-card">
          <h1>Crie sua conta</h1>
          <p className="sub">Insira os seus dados profissionais abaixo.</p>
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="name">Nome Completo</label>
              <div className="input-wrap">
                <User size={16} />
                <input id="name" placeholder="Seu nome e sobrenome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
            </div>
            <div className="field">
              <label htmlFor="email">E-mail Corporativo</label>
              <div className="input-wrap">
                <User size={16} />
                <input id="email" type="email" placeholder="exemplo@suaempresa.com" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              </div>
            </div>
            <div className="field">
              <label htmlFor="password">Senha</label>
              <div className="input-wrap">
                <Lock size={16} />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••••••"
                  autoComplete="new-password"
                  minLength={8}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                />
                <button type="button" className="trailing" onClick={() => setShowPassword((s) => !s)} aria-label="Mostrar senha">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div className="field">
              <label htmlFor="invite">Código de Convite da Organização (Opcional)</label>
              <div className="input-wrap">
                <Building2 size={16} />
                <input id="invite" placeholder="Ex: ORG-123" value={form.invite} onChange={(e) => setForm({ ...form, invite: e.target.value })} />
              </div>
            </div>
            {error && <div className="error-msg">{error}</div>}
            <button className="btn btn-primary btn-block btn-lg mt-8" disabled={loading}>
              {loading ? 'Criando conta...' : 'Criar minha conta'}
            </button>
          </form>
          <p className="foot">
            Já tem uma conta? <Link to="/login" className="link">Entrar</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
