import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { clientApi } from '../api/clientApi'
import { saveAuthToStorage } from '../auth/storage'
import { useSessionStore } from '../store/useSessionStore'

export function LoginPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const setSession = useSessionStore((state) => state.setSession)
  const setBalance = useSessionStore((state) => state.setBalance)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    event.stopPropagation()
    setError(null)

    const trimmedEmail = email.trim()
    if (!trimmedEmail || !password) {
      setError('Please enter email (or user ID) and password.')
      return
    }

    setLoading(true)
    try {
      const auth = await clientApi.login({
        email: trimmedEmail,
        password,
      })

      const sessionPayload = {
        token: auth.token,
        userId: String(auth.user.id),
        email: auth.user.email,
        displayName: auth.user.name,
        publicUserId: auth.user.user_id,
      }

      saveAuthToStorage(sessionPayload)
      setSession(sessionPayload)

      await queryClient.invalidateQueries({ queryKey: ['all-balance'] })
      await queryClient.invalidateQueries({ queryKey: ['game-history'] })

      try {
        const all = await clientApi.getAllBalance({ accessToken: auth.token })
        setBalance(all.coin)
      } catch {
        setBalance(0)
      }

      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="login-page-wrap">
      <section className="login-hero">
        <h1 style={{ margin: 0, fontSize: '2rem', color: '#ffffff' }}>
          Zerorisk<span style={{ color: '#f7c400' }}>bet</span>
        </h1>
      </section>
      <section className="login-card">
        <form onSubmit={onSubmit} method="post" className="grid" noValidate>
          <input
            className="input"
            type="text"
            inputMode="email"
            autoComplete="username"
            placeholder="Email or user ID"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            id="login-email"
          />
          <input
            className="input"
            type="password"
            autoComplete="current-password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            id="login-password"
          />
          {error ? <p style={{ color: '#8e0909', margin: 0, fontWeight: 700 }}>{error}</p> : null}
          <button className="btn" type="submit" disabled={loading}>
            {loading ? 'Signing in…' : 'Login'}
          </button>
        </form>
        <p style={{ color: '#292929', fontSize: '0.86rem', marginTop: '0.9rem', textAlign: 'center' }}>
          Privacy Policy | Terms and Conditions | Responsible Gaming
        </p>
      </section>
    </main>
  )
}
