import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { clientApi } from '../api/clientApi'
import { formatCoinCompact } from '../formatCoin'
import { useSessionStore } from '../store/useSessionStore'

const DICE_GAME_ID = 4

type RollOutcome = {
  value: number
  win: boolean
  payout: number
}

function randomRoomId(): string {
  return `dice_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

function rollDie(): number {
  return Math.floor(Math.random() * 6) + 1
}

function useCasinoSound() {
  return {
    roll() {
      const Ctx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Ctx) return
      const ctx = new Ctx()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sawtooth'
      osc.frequency.value = 180
      gain.gain.value = 0.0001
      osc.connect(gain)
      gain.connect(ctx.destination)
      gain.gain.exponentialRampToValueAtTime(0.04, ctx.currentTime + 0.04)
      osc.frequency.exponentialRampToValueAtTime(700, ctx.currentTime + 0.35)
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.45)
      osc.start()
      osc.stop(ctx.currentTime + 0.46)
    },
    result(win: boolean) {
      const Ctx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Ctx) return
      const ctx = new Ctx()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = win ? 'triangle' : 'square'
      osc.frequency.value = win ? 620 : 210
      gain.gain.value = 0.0001
      osc.connect(gain)
      gain.connect(ctx.destination)
      gain.gain.exponentialRampToValueAtTime(0.05, ctx.currentTime + 0.03)
      osc.frequency.exponentialRampToValueAtTime(win ? 980 : 130, ctx.currentTime + 0.3)
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.36)
      osc.start()
      osc.stop(ctx.currentTime + 0.37)
    },
  }
}

function DiceFace({ value }: { value: number }) {
  const pips = useMemo(() => {
    const map: Record<number, number[]> = {
      1: [5],
      2: [1, 9],
      3: [1, 5, 9],
      4: [1, 3, 7, 9],
      5: [1, 3, 5, 7, 9],
      6: [1, 3, 4, 6, 7, 9],
    }
    return map[value] ?? map[1]
  }, [value])

  return (
    <div className="dice-face-grid">
      {Array.from({ length: 9 }).map((_, i) => (
        <span key={i} className={`dice-pip ${pips.includes(i + 1) ? 'show' : ''}`} />
      ))}
    </div>
  )
}

export function DiceGamePage() {
  const navigate = useNavigate()
  const token = useSessionStore((s) => s.token)
  const userId = useSessionStore((s) => s.userId)
  const balance = useSessionStore((s) => s.balance)
  const setBalance = useSessionStore((s) => s.setBalance)

  const numericUserId = userId ? Number(userId) : NaN
  const sound = useCasinoSound()

  const [bet, setBet] = useState(50)
  const [diceValue, setDiceValue] = useState(1)
  const [rolling, setRolling] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [outcome, setOutcome] = useState<RollOutcome | null>(null)

  const onRoll = async () => {
    setError(null)
    setOutcome(null)
    if (!token?.trim() || !Number.isFinite(numericUserId)) {
      setError('Please login first.')
      return
    }
    if (!Number.isFinite(bet) || bet < 1) {
      setError('Enter a valid bet amount.')
      return
    }

    setRolling(true)
    try {
      const init = await clientApi.sessionInitiate({
        game_id: DICE_GAME_ID,
        host_id: numericUserId,
        users: [numericUserId],
        room_id: randomRoomId(),
        board_amount: bet,
      })

      sound.roll()
      await delay(1500)
      const value = rollDie()
      setDiceValue(value)

      const win = value >= 5
      const payout = win ? bet * 2 : 0

      if (win) {
        await clientApi.sessionUpdate({
          game_session: init.game_session,
          coin_type: 'WIN',
          coin: payout,
          user_id: numericUserId,
          remark: `Dice win on ${value}`,
        })
      }

      const coin = await clientApi.getTotalCoin()
      setBalance(coin.coin)
      sound.result(win)
      setOutcome({ value, win, payout })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Roll failed. Please try again.')
    } finally {
      setRolling(false)
    }
  }

  return (
    <main className="dice-page">
      <header className="dice-topbar">
        <button type="button" className="dice-back-btn" onClick={() => navigate(-1)} aria-label="Back">
          ←
        </button>
        <div className="dice-top-meta">
          <span className="dice-top-label">Balance</span>
          <strong>{formatCoinCompact(balance)} coins</strong>
        </div>
      </header>

      <section className="dice-main">
        <p className="dice-title">Premium Dice</p>
        <p className="dice-subtitle">Roll 5-6 to win 2x payout</p>

        <div className={`dice-display ${rolling ? 'rolling' : ''}`}>
          <DiceFace value={diceValue} />
        </div>

        {error ? <p className="dice-error">{error}</p> : null}
      </section>

      <section className="dice-controls">
        <label htmlFor="dice-bet" className="dice-input-label">
          Bet amount
        </label>
        <input
          id="dice-bet"
          className="dice-bet-input"
          type="number"
          min={1}
          value={bet}
          onChange={(e) => setBet(Number(e.target.value))}
          disabled={rolling}
        />
        <button type="button" className="dice-roll-btn" onClick={() => void onRoll()} disabled={rolling}>
          {rolling ? 'Rolling...' : 'Roll Dice'}
        </button>
      </section>

      {outcome ? (
        <div className="dice-result-overlay" role="dialog" aria-modal="true">
          <div className={`dice-result-card ${outcome.win ? 'win' : 'lose'}`}>
            <p className="dice-result-title">{outcome.win ? 'You Win!' : 'You Lose'}</p>
            <p className="dice-result-line">Dice: {outcome.value}</p>
            {outcome.win ? <p className="dice-result-line">Payout: {formatCoinCompact(outcome.payout)} coins</p> : null}
            <button type="button" className="dice-result-btn" onClick={() => setOutcome(null)}>
              Continue
            </button>
          </div>
        </div>
      ) : null}
    </main>
  )
}
