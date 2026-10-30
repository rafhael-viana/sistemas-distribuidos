import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Lock, User } from 'lucide-react'
import { AuthArt } from '../../components/AuthArt'
import { Logo } from '../../components/Logo'
import { useAuth } from '../../context/AuthContext'
import { translateAuthError } from '../../api/auth'
import { ApiError } from '../../api/client'

export function Login() {
  const { login, onboarded } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ login: '', password: '' })
  const [remember, setRemember] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [forgot, setForgot] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(form.login.trim(), form.password, remember)
      const from = (location.state as { from?: string } | null)?.from
      navigate(onboarded ? (from ?? '/app') : '/onboarding', { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? translateAuthError(err.message) : 'Erro inesperado.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-split">
      <AuthArt swirls>
        <Logo variant="light" size={44} />
        <p style={{ fontSize: 28, fontWeight: 300, lineHeight: 1.35, marginTop: 24 }}>
          A sua jornada mais
          <br />
          saudável começa aqui
        </p>
      </AuthArt>

      <div className="auth-form-side">
        <div className="auth-card">
          <h1>Faça seu login</h1>
          <p className="sub">Bem-vindo de volta! Por favor, insira seus dados.</p>
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="login">Nome</label>
              <div className="input-wrap">
                <User size={16} />
                <input
                  id="login"
                  placeholder="Nome de usuário ou e-mail"
                  autoComplete="username"
                  value={form.login}
                  onChange={(e) => setForm({ ...form, login: e.target.value })}
                  required
                />
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
                  autoComplete="current-password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                />
                <button type="button" className="trailing" onClick={() => setShowPassword((s) => !s)} aria-label="Mostrar senha">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div className="row between" style={{ fontSize: 12, margin: '4px 0 6px' }}>
              <label className="checkbox muted">
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                Me lembre
              </label>
              <button type="button" className="link" style={{ fontStyle: 'italic', fontSize: 12 }} onClick={() => setForgot(true)}>
                Esqueci a senha
              </button>
            </div>
            {forgot && (
              <div className="success-msg">Procure o RH da sua empresa para redefinir a senha de acesso.</div>
            )}
            {error && <div className="error-msg">{error}</div>}
            <button className="btn btn-primary btn-block btn-lg" disabled={loading}>
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
          <p className="foot">
            Não tem uma conta? <Link to="/cadastro" className="link">Cadastre-se</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
