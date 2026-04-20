import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { login } from '../api'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'

export function LoginPage() {
  const navigate = useNavigate()
  const { login: setAuth } = useAuth()
  const showToast = useToast()
  const [credentials, setCredentials] = useState({
    email: 'resident@local.test',
    password: 'Password123!',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const result = await login(credentials.email, credentials.password)
      setAuth(result)
      showToast('Signed in successfully.', 'success')
      navigate('/')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Login failed'
      setError(msg)
      showToast(msg, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <section className="login-card">
        <h1>Property Manager</h1>
        <p className="login-subtitle">Admin System</p>
        <form onSubmit={handleSubmit} className="login-form">
          <label>
            Email
            <input
              type="email"
              value={credentials.email}
              onChange={(e) => setCredentials((p) => ({ ...p, email: e.target.value }))}
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={credentials.password}
              onChange={(e) => setCredentials((p) => ({ ...p, password: e.target.value }))}
              required
            />
          </label>
          <button type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Login'}
          </button>
          <a href="#" className="forgot-link">Forgot password?</a>
        </form>
        {error && <p className="error">{error}</p>}
      </section>
    </div>
  )
}
