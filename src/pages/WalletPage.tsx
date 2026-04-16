import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { AppShell } from '../components/layout/AppShell'
import { clientApi } from '../api/clientApi'
import { useSessionStore } from '../store/useSessionStore'
import { formatCoinCompact } from '../formatCoin'

function toNumber(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
}

function formatDateLabel(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) return 'Recent round'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Recent round'
  return date.toLocaleString()
}

export function WalletPage() {
  const token = useSessionStore((s) => s.token)
  const setBalance = useSessionStore((s) => s.setBalance)
  const authed = Boolean(token?.trim())

  const balancesQuery = useQuery({
    queryKey: ['all-balance', token ?? ''],
    queryFn: () => clientApi.getAllBalance(),
    enabled: authed,
    retry: false,
    refetchInterval: 15000,
  })

  const historyQuery = useQuery({
    queryKey: ['game-history', token ?? ''],
    queryFn: () => clientApi.getGameHistory(),
    enabled: authed,
    retry: false,
    refetchInterval: 20000,
  })

  useEffect(() => {
    if (balancesQuery.data?.coin !== undefined) {
      setBalance(balancesQuery.data.coin)
    }
  }, [balancesQuery.data?.coin, setBalance])

  const summary = balancesQuery.data
  const rounds = historyQuery.data ?? []

  return (
    <AppShell title="Wallet & History">
      <section className="panel wallet-hero">
        <div>
          <p className="wallet-hero-label">Available Coins</p>
          <h2 className="wallet-hero-coin">
            {summary ? `${formatCoinCompact(summary.coin)} coins` : balancesQuery.isLoading ? 'Loading...' : '--'}
          </h2>
        </div>
        <div className="wallet-hero-pill">{summary ? `${toNumber(summary.star)} Star` : 'Wallet'}</div>
      </section>

      <section className="wallet-stats-grid">
        <article className="panel wallet-stat-card">
          <p className="wallet-stat-title">Balance</p>
          <p className="wallet-stat-value">{summary ? toNumber(summary.balance).toLocaleString() : '--'}</p>
        </article>
        <article className="panel wallet-stat-card">
          <p className="wallet-stat-title">Deposit</p>
          <p className="wallet-stat-value">{summary ? toNumber(summary.deposit).toLocaleString() : '--'}</p>
        </article>
        <article className="panel wallet-stat-card">
          <p className="wallet-stat-title">Withdraw</p>
          <p className="wallet-stat-value">{summary ? toNumber(summary.withdraw).toLocaleString() : '--'}</p>
        </article>
        <article className="panel wallet-stat-card">
          <p className="wallet-stat-title">Stars</p>
          <p className="wallet-stat-value">{summary ? toNumber(summary.star).toLocaleString() : '--'}</p>
        </article>
      </section>

      <section className="panel wallet-history-wrap">
        <div className="wallet-history-header">
          <h3 style={{ margin: 0 }}>Recent Game History</h3>
          <span className="wallet-history-count">{rounds.length}</span>
        </div>
        {balancesQuery.isError ? <p style={{ color: '#ff7f7f' }}>Could not load balances.</p> : null}
        {historyQuery.isError ? <p style={{ color: '#ff7f7f' }}>Failed to load game history.</p> : null}
        {historyQuery.isLoading ? <p>Loading rounds...</p> : null}
        {!historyQuery.isLoading && rounds.length === 0 ? <p>No rounds yet. Play a game to see history.</p> : null}
        <div className="wallet-history-list">
          {rounds.map((row, i) => {
            const item = asRecord(row)
            const session = item.game_session_id ?? item.game_session ?? `#${i + 1}`
            const winCoin = toNumber(item.win_coin ?? item.coin ?? item.total_win)
            const feeCoin = toNumber(item.fee_coin ?? item.game_fee ?? 0)
            const winCount = toNumber(item.win_count ?? 0)
            const playedAt = formatDateLabel(item.created_at ?? item.updated_at ?? item.date)

            return (
              <article key={`${String(session)}-${i}`} className="panel wallet-history-item">
                <div className="wallet-history-row">
                  <p className="wallet-history-session">Session {String(session)}</p>
                  <span className={`wallet-result-chip ${winCoin > 0 ? 'win' : ''}`}>{winCoin > 0 ? 'Win' : 'Played'}</span>
                </div>
                <div className="wallet-history-metrics">
                  <div>
                    <span>Win</span>
                    <strong>{formatCoinCompact(winCoin)}</strong>
                  </div>
                  <div>
                    <span>Fee</span>
                    <strong>{formatCoinCompact(feeCoin)}</strong>
                  </div>
                  <div>
                    <span>Wins</span>
                    <strong>{winCount}</strong>
                  </div>
                </div>
                <p className="wallet-history-time">{playedAt}</p>
              </article>
            )
          })}
        </div>
      </section>
    </AppShell>
  )
}
