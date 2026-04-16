import { AppShell } from '../components/layout/AppShell'
import { useSessionStore } from '../store/useSessionStore'

function asText(value: unknown): string {
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number') return String(value)
  return ''
}

function initialsFromName(name: unknown): string {
  const raw = asText(name)
  if (!raw) return 'U'
  const parts = raw.split(/\s+/).filter(Boolean)
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase()
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase()
}

export function ProfilePage() {
  const { displayName, email, publicUserId, userId, clearSession } = useSessionStore()
  const initials = initialsFromName(displayName)
  const safeName = asText(displayName) || 'Player'
  const safeEmail = asText(email) || 'Not available'
  const safePublicUserId = asText(publicUserId) || '-'
  const safeUserId = asText(userId) || '-'

  return (
    <AppShell title="Account">
      <section className="panel account-hero">
        <div className="account-avatar">{initials}</div>
        <div>
          <p className="account-kicker">My Profile</p>
          <h2 className="account-name">{safeName}</h2>
          <p className="account-email">{safeEmail}</p>
        </div>
      </section>

      <section className="account-info-grid">
        <article className="panel account-info-card">
          <p className="account-info-label">Player ID</p>
          <p className="account-info-value">{safePublicUserId}</p>
        </article>
        <article className="panel account-info-card">
          <p className="account-info-label">Account Status</p>
          <p className="account-info-value">Active</p>
        </article>
        <article className="panel account-info-card">
          <p className="account-info-label">Internal ID</p>
          <p className="account-info-value">{safeUserId}</p>
        </article>
        <article className="panel account-info-card">
          <p className="account-info-label">Support</p>
          <p className="account-info-value">24/7 Help</p>
        </article>
      </section>

      <section className="panel account-actions">
        <h3 style={{ marginTop: 0, marginBottom: '0.4rem' }}>Security</h3>
        <p className="account-actions-note">You can sign out safely from this device anytime.</p>
        <button type="button" className="btn account-logout-btn" onClick={clearSession}>
          Logout
        </button>
      </section>
    </AppShell>
  )
}
