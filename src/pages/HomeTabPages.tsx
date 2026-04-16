import { Link } from 'react-router-dom'
import { AppShell } from '../components/layout/AppShell'

export function RecommendationsPage() {
  return (
    <AppShell title="For you">
      <section className="panel">
        <h2 style={{ marginTop: 0 }}>Recommendations</h2>
        <p style={{ color: '#bdbdbd', margin: 0 }}>Personalized picks and trending games will appear here.</p>
        <Link className="btn" style={{ marginTop: '1rem', display: 'inline-block' }} to="/">
          Browse home
        </Link>
      </section>
    </AppShell>
  )
}

export function PromotionPage() {
  return (
    <AppShell title="Promotions">
      <section className="panel">
        <h2 style={{ marginTop: 0 }}>Promotions</h2>
        <p style={{ color: '#bdbdbd', margin: 0 }}>Bonus offers, cashback, and limited events will be listed here.</p>
        <Link className="btn" style={{ marginTop: '1rem', display: 'inline-block' }} to="/">
          Back to home
        </Link>
      </section>
    </AppShell>
  )
}

export function BettingPassPage() {
  return (
    <AppShell title="Betting pass">
      <section className="panel">
        <h2 style={{ marginTop: 0 }}>Betting pass</h2>
        <p style={{ color: '#bdbdbd', margin: 0 }}>Track your activity, limits, and pass perks in one place.</p>
        <Link className="btn" style={{ marginTop: '1rem', display: 'inline-block' }} to="/wallet">
          Open wallet
        </Link>
      </section>
    </AppShell>
  )
}

export function RewardsPage() {
  return (
    <AppShell title="Rewards">
      <section className="panel">
        <h2 style={{ marginTop: 0 }}>Rewards</h2>
        <p style={{ color: '#bdbdbd', margin: 0 }}>Loyalty points, missions, and redeemable rewards will show here.</p>
        <Link className="btn" style={{ marginTop: '1rem', display: 'inline-block' }} to="/">
          Back to home
        </Link>
      </section>
    </AppShell>
  )
}
