import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useSessionStore } from '../../store/useSessionStore'
import { formatCoinCompact } from '../../formatCoin'

export type AppShellVariant = 'default' | 'home'

type TabKey = 'recommend' | 'promotion' | 'home' | 'betting' | 'rewards'

function TabIcon({ tab }: { tab: TabKey }) {
  if (tab === 'recommend') {
    return (
      <svg className="tab-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"
        />
      </svg>
    )
  }
  if (tab === 'promotion') {
    return (
      <svg className="tab-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58s1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41s-.23-1.06-.59-1.42zM5.5 7C4.67 7 4 6.33 4 5.5S4.67 4 5.5 4 7 4.67 7 5.5 6.33 7 5.5 7z"
        />
      </svg>
    )
  }
  if (tab === 'home') {
    return (
      <svg className="tab-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 10.6 12 3l9 7.6v9.4a1 1 0 0 1-1 1h-5.5v-6.2h-5V21H4a1 1 0 0 1-1-1z" fill="currentColor" />
      </svg>
    )
  }
  if (tab === 'betting') {
    return (
      <svg className="tab-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M3.5 18.49l6-6.01 4 4L22 6.92l-1.41-1.41-7.09 7.97-4-4L2 16.99l1.5 1.5z"
        />
      </svg>
    )
  }
  return (
    <svg className="tab-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M20 6h-2.18c.11-.31.18-.65.18-1 0-1.1-.9-2-2-2-1.05 0-1.87.81-1.95 1.82L12 7.18l-2.05-2.36C9.87 3.81 9.05 3 8 3 6.9 3 6 3.9 6 5c0 .35.07.69.18 1H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.11-.89-2-2-2zm-5-2c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM9 4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm11 15H4v-2h16v2zm0-5H4V8h5.08L12 13l2.92-5H20v6z"
      />
    </svg>
  )
}

function HomeTopBar() {
  const token = useSessionStore((s) => s.token)

  return (
    <header className="home-top-bar">
      <button type="button" className="home-top-icon-btn" aria-label="Menu">
        <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="currentColor" d="M4 6h16v2H4V6zm0 5h16v2H4v-2zm0 5h16v2H4v-2z" />
        </svg>
      </button>
      <div className="home-top-logo">
        Zerorisk<span>bet</span>
      </div>
      <div className="home-top-actions">
        {token ? (
          <Link to="/profile" className="home-top-icon-btn" aria-label="Account">
            <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="currentColor"
                d="M12 12a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zm0 2c-3.31 0-6 2.02-6 4.5V20h12v-1.5c0-2.48-2.69-4.5-6-4.5z"
              />
            </svg>
          </Link>
        ) : (
          <Link to="/login" className="home-top-login">
            Login
          </Link>
        )}
        <button type="button" className="home-top-icon-btn home-top-bell" aria-label="Notifications">
          <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="currentColor"
              d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2zm-2 1H8v-6c0-2.48 1.51-4.5 4-4.5s4 2.02 4 4.5v6z"
            />
          </svg>
          <span className="home-top-bell-dot" />
        </button>
      </div>
    </header>
  )
}

function BottomTabs() {
  const location = useLocation()
  const tabs = [
    { key: 'recommend' as const, label: 'For you', to: '/recommend' },
    { key: 'promotion' as const, label: 'Promo', to: '/promotion' },
    { key: 'home' as const, label: 'Home', to: '/' },
    { key: 'betting' as const, label: 'Pass', to: '/betting-pass' },
    { key: 'rewards' as const, label: 'Rewards', to: '/rewards' },
  ]

  return (
    <nav className="tabs tabs--five">
      {tabs.map((tab) => {
        const active =
          tab.key === 'home'
            ? location.pathname === '/'
            : location.pathname === tab.to || location.pathname.startsWith(`${tab.to}/`)
        return (
          <Link key={tab.key} to={tab.to} className={`tab ${active ? 'active' : ''}`}>
            <TabIcon tab={tab.key} />
            <span className="tab-label">{tab.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}

type AppShellProps = {
  title: string
  children: ReactNode
  variant?: AppShellVariant
}

export function AppShell({ title, children, variant = 'default' }: AppShellProps) {
  const token = useSessionStore((state) => state.token)
  const balance = useSessionStore((state) => state.balance)

  return (
    <main className={`page ${variant === 'home' ? 'page--home' : ''}`}>
      {variant === 'home' ? (
        <HomeTopBar />
      ) : (
        <header className="brand-header">
          <div className="brand-logo">
            Zerorisk<span>bet</span>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.75rem', color: '#bdbdbd' }}>{title}</div>
            {token ? (
              <div style={{ fontWeight: 700, color: '#f7c400' }}>{formatCoinCompact(balance)} coins</div>
            ) : (
              <Link className="btn" style={{ display: 'inline-block', padding: '0.35rem 0.8rem', fontSize: '0.85rem' }} to="/login">
                Login
              </Link>
            )}
          </div>
        </header>
      )}
      {children}
      <BottomTabs />
    </main>
  )
}
