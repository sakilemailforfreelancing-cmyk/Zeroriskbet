import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { clientApi } from '../api/clientApi'
import { formatCoinCompact } from '../formatCoin'
import { useSessionStore } from '../store/useSessionStore'

const GRID_SIZE = 25
const MIN_BOMBS = 3
const MAX_BOMBS = 5
const MINES_GAME_ID: number = 10
const MINES_FALLBACK_GAME_ID: number = 1

type RoundStatus = 'idle' | 'active' | 'busted' | 'cashed'

function randomRoomId(): string {
  return `mines_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function createBombSet(count: number): Set<number> {
  const bombs = new Set<number>()
  while (bombs.size < count) bombs.add(Math.floor(Math.random() * GRID_SIZE))
  return bombs
}

function computeMultiplier(safeClicks: number, bombCount: number): number {
  if (safeClicks <= 0) return 1
  const next = 1 + safeClicks * (0.16 + bombCount * 0.03) + safeClicks * safeClicks * 0.018
  return Number(next.toFixed(2))
}

function useMinesSounds() {
  const ctxRef = useRef<AudioContext | null>(null)

  function ensureCtx(): AudioContext | null {
    if (ctxRef.current) return ctxRef.current
    const Ctx =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return null
    ctxRef.current = new Ctx()
    return ctxRef.current
  }

  function pulse(type: OscillatorType, from: number, to: number, durationMs: number, peak = 0.05) {
    const ctx = ensureCtx()
    if (!ctx) return
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = type
    osc.frequency.value = from
    gain.gain.value = 0.0001
    osc.connect(gain)
    gain.connect(ctx.destination)
    gain.gain.exponentialRampToValueAtTime(peak, ctx.currentTime + 0.01)
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), ctx.currentTime + durationMs / 1000)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + durationMs / 1000)
    osc.start()
    osc.stop(ctx.currentTime + durationMs / 1000 + 0.02)
  }

  return {
    click() {
      pulse('square', 260, 420, 90, 0.035)
    },
    safe() {
      pulse('triangle', 420, 890, 170, 0.045)
    },
    bomb() {
      pulse('sawtooth', 260, 80, 330, 0.06)
    },
    win() {
      pulse('triangle', 460, 980, 230, 0.058)
      window.setTimeout(() => pulse('triangle', 720, 1320, 210, 0.056), 110)
    },
  }
}

export function MinesGamePage() {
  const navigate = useNavigate()
  const token = useSessionStore((s) => s.token)
  const userId = useSessionStore((s) => s.userId)
  const balance = useSessionStore((s) => s.balance)
  const setBalance = useSessionStore((s) => s.setBalance)
  const numericUserId = userId ? Number(userId) : NaN
  const sounds = useMinesSounds()

  const [bet, setBet] = useState(50)
  const [roundStatus, setRoundStatus] = useState<RoundStatus>('idle')
  const [bombCount, setBombCount] = useState<number>(() => randomInt(MIN_BOMBS, MAX_BOMBS))
  const [bombs, setBombs] = useState<Set<number>>(() => createBombSet(4))
  const [revealed, setRevealed] = useState<Set<number>>(new Set())
  const [safeClicks, setSafeClicks] = useState(0)
  const [multiplier, setMultiplier] = useState(1)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [gameSession, setGameSession] = useState<string | null>(null)
  const [lastPayout, setLastPayout] = useState(0)
  const [explodeFx, setExplodeFx] = useState(false)
  const [shakeFx, setShakeFx] = useState(false)
  const [winFx, setWinFx] = useState(false)

  const isActive = roundStatus === 'active'
  const canCashout = isActive && gameSession && !busy

  const resetRound = () => {
    const nextBombCount = randomInt(MIN_BOMBS, MAX_BOMBS)
    setBombCount(nextBombCount)
    setBombs(createBombSet(nextBombCount))
    setRevealed(new Set())
    setSafeClicks(0)
    setMultiplier(1)
    setRoundStatus('idle')
    setGameSession(null)
    setLastPayout(0)
    setError(null)
    setExplodeFx(false)
    setShakeFx(false)
    setWinFx(false)
  }

  const revealAll = () => {
    setRevealed(new Set(Array.from({ length: GRID_SIZE }, (_, i) => i)))
  }

  const startSessionIfNeeded = async (): Promise<string> => {
    if (gameSession) return gameSession
    let init
    try {
      init = await clientApi.sessionInitiate({
        game_id: MINES_GAME_ID,
        host_id: numericUserId,
        users: [numericUserId],
        room_id: randomRoomId(),
        board_amount: bet,
      })
    } catch (firstError) {
      if (MINES_FALLBACK_GAME_ID === MINES_GAME_ID) throw firstError
      init = await clientApi.sessionInitiate({
        game_id: MINES_FALLBACK_GAME_ID,
        host_id: numericUserId,
        users: [numericUserId],
        room_id: randomRoomId(),
        board_amount: bet,
      })
    }
    setGameSession(init.game_session)
    return init.game_session
  }

  const onTileClick = async (index: number) => {
    if (busy || roundStatus === 'busted' || roundStatus === 'cashed') return
    if (revealed.has(index)) return
    if (!token?.trim() || !Number.isFinite(numericUserId)) {
      setError('Please login to play.')
      return
    }
    if (!Number.isFinite(bet) || bet < 1) {
      setError('Enter a valid bet amount.')
      return
    }

    setError(null)
    sounds.click()
    setBusy(true)
    try {
      await startSessionIfNeeded()
      if (roundStatus === 'idle') setRoundStatus('active')
      const nextRevealed = new Set(revealed)
      nextRevealed.add(index)
      setRevealed(nextRevealed)

      if (bombs.has(index)) {
        setRoundStatus('busted')
        revealAll()
        setExplodeFx(true)
        setShakeFx(true)
        window.setTimeout(() => setShakeFx(false), 360)
        sounds.bomb()
        return
      }

      const nextSafeClicks = safeClicks + 1
      setSafeClicks(nextSafeClicks)
      const nextMultiplier = computeMultiplier(nextSafeClicks, bombCount)
      setMultiplier(nextMultiplier)
      sounds.safe()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Tile reveal failed.')
    } finally {
      setBusy(false)
    }
  }

  const onCashout = async () => {
    if (!canCashout || !gameSession) return
    setBusy(true)
    setError(null)
    try {
      const payout = Math.max(1, Math.round(bet * multiplier))
      await clientApi.sessionUpdate({
        game_session: gameSession,
        coin_type: 'WIN',
        coin: payout,
        user_id: numericUserId,
        remark: `Mines cashout x${multiplier.toFixed(2)}`,
      })
      setRoundStatus('cashed')
      setLastPayout(payout)
      revealAll()
      setWinFx(true)
      sounds.win()
      const coin = await clientApi.getTotalCoin()
      setBalance(coin.coin)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Cashout failed.')
    } finally {
      setBusy(false)
    }
  }

  const resultText = useMemo(() => {
    if (roundStatus === 'busted') return 'Boom! You hit a bomb.'
    if (roundStatus === 'cashed') return `Cashed out +${formatCoinCompact(lastPayout)}`
    if (safeClicks > 0) return `${safeClicks} safe picks`
    return 'Pick a tile to start'
  }, [roundStatus, safeClicks, lastPayout])

  return (
    <main className={`mines-page ${shakeFx ? 'is-shake' : ''} ${winFx ? 'is-win' : ''}`}>
      <header className="mines-topbar">
        <button type="button" className="mines-back-btn" onClick={() => navigate(-1)} aria-label="Back">
          ←
        </button>
        <div className="mines-metrics">
          <div>
            <span>Balance</span>
            <strong>{formatCoinCompact(balance)} coins</strong>
          </div>
          <div>
            <span>Multiplier</span>
            <strong>x{multiplier.toFixed(2)}</strong>
          </div>
        </div>
      </header>

      <section className={`mines-board-wrap ${explodeFx ? 'explode' : ''}`}>
        <div className="mines-grid">
          {Array.from({ length: GRID_SIZE }, (_, i) => {
            const isRevealed = revealed.has(i)
            const isBomb = bombs.has(i)
            const tileClass = [
              'mines-tile',
              isRevealed ? 'revealed' : '',
              isRevealed && isBomb ? 'bomb' : '',
              isRevealed && !isBomb ? 'safe' : '',
            ]
              .filter(Boolean)
              .join(' ')

            return (
              <button
                key={i}
                type="button"
                className={tileClass}
                disabled={busy || roundStatus === 'busted' || roundStatus === 'cashed' || isRevealed}
                onClick={() => {
                  void onTileClick(i)
                }}
              >
                <span className="mines-tile-front">?</span>
                <span className="mines-tile-back">{isBomb ? '💣' : '💎'}</span>
              </button>
            )
          })}
        </div>
      </section>

      <section className="mines-controls">
        <label htmlFor="mines-bet" className="mines-label">
          Bet amount
        </label>
        <input
          id="mines-bet"
          className="mines-bet-input"
          type="number"
          min={1}
          value={bet}
          disabled={busy || isActive || safeClicks > 0}
          onChange={(e) => setBet(Number(e.target.value))}
        />
        <button
          type="button"
          className="mines-cashout-btn"
          onClick={() => {
            if (roundStatus === 'active') {
              void onCashout()
            } else {
              resetRound()
            }
          }}
          disabled={busy}
        >
          {roundStatus === 'active' ? `CASHOUT ${formatCoinCompact(Math.round(bet * multiplier))}` : 'NEW ROUND'}
        </button>
        <p className={`mines-result ${roundStatus}`}>{resultText}</p>
        <p className="mines-sub">Bombs: {bombCount} / 25</p>
        {error ? <p className="mines-error">{error}</p> : null}
      </section>
    </main>
  )
}
