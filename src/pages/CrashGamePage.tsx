import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { clientApi } from '../api/clientApi'
import { formatCoinCompact } from '../formatCoin'
import { useSessionStore } from '../store/useSessionStore'

const CRASH_GAME_ID = 6

type RoundState = 'idle' | 'running' | 'cashed' | 'crashed'

function randomRoomId(): string {
  return `crash_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

function randomCrashMultiplier(): number {
  const min = 1.2
  const max = 8
  const skew = Math.pow(Math.random(), 1.7)
  return Number((min + (max - min) * skew).toFixed(2))
}

function formatMultiplier(value: number): string {
  return `${value.toFixed(2)}x`
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function computeGrowthMultiplier(elapsedMs: number): number {
  const t = elapsedMs / 1000
  return 1 + t * 0.45 + t * t * 0.13
}

function useCrashSounds() {
  const ctxRef = useRef<AudioContext | null>(null)
  const flightRef = useRef<OscillatorNode | null>(null)
  const flightGainRef = useRef<GainNode | null>(null)

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
    gain.gain.exponentialRampToValueAtTime(peak, ctx.currentTime + 0.02)
    osc.frequency.exponentialRampToValueAtTime(Math.max(10, to), ctx.currentTime + durationMs / 1000)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + durationMs / 1000)
    osc.start()
    osc.stop(ctx.currentTime + durationMs / 1000 + 0.02)
  }

  function startFlightLoop() {
    stopFlightLoop()
    const ctx = ensureCtx()
    if (!ctx) return
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sawtooth'
    osc.frequency.value = 145
    gain.gain.value = 0.0001
    osc.connect(gain)
    gain.connect(ctx.destination)
    gain.gain.exponentialRampToValueAtTime(0.03, ctx.currentTime + 0.12)
    osc.start()
    flightRef.current = osc
    flightGainRef.current = gain
  }

  function updateFlight(multiplier: number) {
    const osc = flightRef.current
    if (!osc) return
    const next = 140 + multiplier * 55
    osc.frequency.setTargetAtTime(next, osc.context.currentTime, 0.11)
  }

  function stopFlightLoop() {
    const osc = flightRef.current
    const gain = flightGainRef.current
    if (osc && gain) {
      gain.gain.exponentialRampToValueAtTime(0.0001, osc.context.currentTime + 0.08)
      osc.stop(osc.context.currentTime + 0.1)
    }
    flightRef.current = null
    flightGainRef.current = null
  }

  return {
    takeoff() {
      pulse('triangle', 190, 430, 160, 0.055)
      window.setTimeout(() => pulse('triangle', 300, 520, 120, 0.04), 90)
    },
    win() {
      pulse('triangle', 510, 930, 220, 0.055)
      window.setTimeout(() => pulse('triangle', 760, 1200, 180, 0.052), 100)
    },
    crash() {
      pulse('sawtooth', 280, 70, 310, 0.06)
    },
    startFlightLoop,
    updateFlight,
    stopFlightLoop,
  }
}

export function CrashGamePage() {
  const navigate = useNavigate()
  const token = useSessionStore((s) => s.token)
  const userId = useSessionStore((s) => s.userId)
  const balance = useSessionStore((s) => s.balance)
  const setBalance = useSessionStore((s) => s.setBalance)
  const numericUserId = userId ? Number(userId) : NaN

  const sounds = useCrashSounds()

  const [bet, setBet] = useState(50)
  const [error, setError] = useState<string | null>(null)
  const [roundState, setRoundState] = useState<RoundState>('idle')
  const [multiplier, setMultiplier] = useState(1)
  const [crashAt, setCrashAt] = useState<number | null>(null)
  const [resultText, setResultText] = useState('Press START to launch')
  const [isBusy, setIsBusy] = useState(false)
  const [flashCrash, setFlashCrash] = useState(false)

  const rafRef = useRef<number | null>(null)
  const startTsRef = useRef<number>(0)
  const currentMultiplierRef = useRef(1)
  const crashAtRef = useRef(0)
  const sessionRef = useRef<string | null>(null)

  const isRunning = roundState === 'running'
  const canCashout = isRunning && !isBusy

  const progress = useMemo(() => {
    return clamp(Math.log(Math.max(multiplier, 1)) / Math.log(8), 0, 0.98)
  }, [multiplier])
  const planeX = 8 + progress * 82
  const planeY = 88 - progress * 74

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) window.cancelAnimationFrame(rafRef.current)
      sounds.stopFlightLoop()
    }
  }, [])

  const stopLoop = () => {
    if (rafRef.current !== null) {
      window.cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    sounds.stopFlightLoop()
  }

  const finishLose = async () => {
    stopLoop()
    setRoundState('crashed')
    setFlashCrash(true)
    window.setTimeout(() => setFlashCrash(false), 350)
    sounds.crash()
    setResultText(`Crashed at ${formatMultiplier(crashAtRef.current)} · You lost`)
    sessionRef.current = null
    try {
      const coin = await clientApi.getTotalCoin()
      setBalance(coin.coin)
    } catch {
      // keep latest known balance
    }
  }

  const tick = (now: number) => {
    const elapsed = now - startTsRef.current
    const next = computeGrowthMultiplier(elapsed)
    currentMultiplierRef.current = next
    setMultiplier(next)
    sounds.updateFlight(next)
    if (next >= crashAtRef.current) {
      void finishLose()
      return
    }
    rafRef.current = window.requestAnimationFrame(tick)
  }

  const onStart = async () => {
    setError(null)
    if (!token?.trim() || !Number.isFinite(numericUserId)) {
      setError('Please login first.')
      return
    }
    if (!Number.isFinite(bet) || bet < 1) {
      setError('Enter a valid bet amount.')
      return
    }
    if (isRunning || isBusy) return

    setIsBusy(true)
    try {
      const init = await clientApi.sessionInitiate({
        game_id: CRASH_GAME_ID,
        host_id: numericUserId,
        users: [numericUserId],
        room_id: randomRoomId(),
        board_amount: bet,
      })

      sessionRef.current = init.game_session
      const crashPoint = randomCrashMultiplier()
      crashAtRef.current = crashPoint
      setCrashAt(crashPoint)
      setMultiplier(1)
      currentMultiplierRef.current = 1
      setFlashCrash(false)
      setRoundState('running')
      setResultText('Flight started · Tap CASHOUT before crash')
      sounds.takeoff()
      sounds.startFlightLoop()
      startTsRef.current = performance.now()
      rafRef.current = window.requestAnimationFrame(tick)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start round.')
    } finally {
      setIsBusy(false)
    }
  }

  const onCashout = async () => {
    if (!canCashout || !sessionRef.current) return
    if (!Number.isFinite(numericUserId)) return
    if (currentMultiplierRef.current >= crashAtRef.current) return

    setIsBusy(true)
    try {
      const payout = Math.max(1, Math.round(bet * currentMultiplierRef.current))
      await clientApi.sessionUpdate({
        game_session: sessionRef.current,
        coin_type: 'WIN',
        coin: payout,
        user_id: numericUserId,
        remark: `Crash cashout at ${formatMultiplier(currentMultiplierRef.current)}`,
      })
      stopLoop()
      sessionRef.current = null
      setRoundState('cashed')
      sounds.win()
      setResultText(`Cashed out at ${formatMultiplier(currentMultiplierRef.current)} · +${formatCoinCompact(payout)} coins`)
      const coin = await clientApi.getTotalCoin()
      setBalance(coin.coin)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Cashout failed.')
    } finally {
      setIsBusy(false)
    }
  }

  return (
    <main className="crash-page">
      <header className="crash-topbar">
        <button type="button" className="crash-back-btn" onClick={() => navigate(-1)} aria-label="Back">
          ←
        </button>
        <p className="crash-brand">Aviator Style</p>
        <div className="crash-balance">
          <span>Balance</span>
          <strong>{formatCoinCompact(balance)} coins</strong>
        </div>
      </header>

      <section className={`crash-stage ${flashCrash ? 'is-crashed' : ''}`}>
        <div className="crash-radial" />
        <div className="crash-grid" />
        <div className="crash-trail" style={{ width: `${planeX}%`, height: `${100 - planeY}%` }} />
        <div className="crash-multiplier-wrap">
          <strong className={`crash-multiplier ${isRunning ? 'is-live' : ''}`}>{formatMultiplier(multiplier)}</strong>
          {crashAt ? <span className="crash-hint">Live round · cashout anytime</span> : null}
        </div>
        <div className={`crash-plane ${isRunning ? 'is-flying' : ''}`} style={{ left: `${planeX}%`, top: `${planeY}%` }}>
          <svg viewBox="0 0 48 48" aria-hidden="true">
            <path d="M4 24l18-4 14-14c1-1 2-1 3 0l2 2c1 1 1 2 0 3l-14 14-4 18-4-10-10-4z" />
          </svg>
        </div>
      </section>

      <p className={`crash-status ${roundState}`}>{resultText}</p>
      {error ? <p className="crash-error">{error}</p> : null}

      <section className="crash-controls">
        <label htmlFor="crash-bet" className="crash-label">
          Bet amount
        </label>
        <div className="crash-bet-row">
          <input
            id="crash-bet"
            className="crash-bet-input"
            type="number"
            min={1}
            value={bet}
            disabled={isRunning || isBusy}
            onChange={(e) => setBet(Number(e.target.value))}
          />
          <button
            type="button"
            className={`crash-action-btn ${canCashout ? 'cashout' : 'start'}`}
            onClick={() => {
              if (canCashout) {
                void onCashout()
              } else {
                void onStart()
              }
            }}
            disabled={isBusy}
          >
            {canCashout ? 'CASHOUT' : 'START'}
          </button>
        </div>
      </section>
    </main>
  )
}
