import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { AppShell } from '../components/layout/AppShell'
import { clientApi } from '../api/clientApi'
import { useSessionStore } from '../store/useSessionStore'

const ROUTE_TO_GAME_ID: Record<string, number> = {
  slots: 1,
  roulette: 2,
  blackjack: 3,
}

function randomRoomId(): string {
  return `room_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

export function GamePage() {
  const { gameId = 'slots' } = useParams()
  const numericUserId = useSessionStore((s) => (s.userId ? Number(s.userId) : NaN))
  const setBalance = useSessionStore((s) => s.setBalance)

  const backendGameId = ROUTE_TO_GAME_ID[gameId] ?? 1

  const [boardAmount, setBoardAmount] = useState(50)
  const [winCoin, setWinCoin] = useState(100)
  const [gameSession, setGameSession] = useState<string | null>(null)
  const [gameName, setGameName] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<unknown>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const title = useMemo(() => {
    if (gameId === 'roulette') return 'Roulette'
    if (gameId === 'blackjack') return 'Blackjack'
    return 'Lucky Slots'
  }, [gameId])

  const refreshCoin = async () => {
    const coin = await clientApi.getTotalCoin()
    setBalance(coin.coin)
  }

  const onStartSession = async () => {
    setError(null)
    if (!Number.isFinite(numericUserId)) {
      setError('Not logged in.')
      return
    }
    setBusy(true)
    try {
      const res = await clientApi.sessionInitiate({
        game_id: backendGameId,
        host_id: numericUserId,
        users: [numericUserId],
        room_id: randomRoomId(),
        board_amount: boardAmount,
      })
      setGameSession(res.game_session)
      setGameName(res.game_name)
      await refreshCoin()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Session start failed.')
    } finally {
      setBusy(false)
    }
  }

  const onRecordWin = async () => {
    setError(null)
    if (!gameSession) {
      setError('Start a session first.')
      return
    }
    if (!Number.isFinite(numericUserId)) {
      setError('Not logged in.')
      return
    }
    setBusy(true)
    try {
      const res = await clientApi.sessionUpdate({
        game_session: gameSession,
        coin_type: 'WIN',
        coin: winCoin,
        user_id: numericUserId,
        remark: 'Client app win',
      })
      setLastUpdate(res)
      await refreshCoin()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Session update failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AppShell title={title}>
      <section className="panel">
        <p style={{ marginTop: 0 }}>
          Backend <code style={{ color: '#f7c400' }}>game_id</code>: {backendGameId}
        </p>
        {gameSession ? (
          <p>
            Active session: <strong>{gameSession}</strong>
            {gameName ? ` — ${gameName}` : null}
          </p>
        ) : (
          <p>No active session yet.</p>
        )}
        {error ? <p style={{ color: '#ff7f7f' }}>{error}</p> : null}
        <div className="grid" style={{ marginTop: '0.75rem' }}>
          <label style={{ fontSize: '0.85rem' }}>Board amount (entry fee)</label>
          <input
            className="input"
            type="number"
            min={1}
            value={boardAmount}
            onChange={(e) => setBoardAmount(Number(e.target.value))}
          />
          <button className="btn" type="button" disabled={busy} onClick={onStartSession}>
            Start session (deduct fee)
          </button>
          <label style={{ fontSize: '0.85rem' }}>Win coin amount</label>
          <input className="input" type="number" min={1} value={winCoin} onChange={(e) => setWinCoin(Number(e.target.value))} />
          <button className="btn secondary" type="button" disabled={busy} onClick={onRecordWin}>
            Record win
          </button>
        </div>
        {lastUpdate ? (
          <div className="panel" style={{ marginTop: '0.75rem' }}>
            <p style={{ marginTop: 0 }}>Last update response</p>
            <pre style={{ overflowX: 'auto', margin: 0, fontSize: '0.75rem' }}>{JSON.stringify(lastUpdate, null, 2)}</pre>
          </div>
        ) : null}
      </section>
    </AppShell>
  )
}
