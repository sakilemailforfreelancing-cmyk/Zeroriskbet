import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { clientApi } from '../api/clientApi'
import { formatCoinCompact } from '../formatCoin'
import { useSessionStore } from '../store/useSessionStore'

const LUCKY_BOX_GAME_ID: number = 7
const LUCKY_BOX_FALLBACK_GAME_ID: number = 1
const BOX_MULTIPLIERS = [0, 1, 2, 3, 4, 5] as const

type RoundResult = {
  multiplier: number
  payout: number
  win: boolean
}

function randomRoomId(): string {
  return `lucky_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

function shuffleValues(values: readonly number[]): number[] {
  const arr = [...values]
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = arr[i]
    arr[i] = arr[j]
    arr[j] = tmp
  }
  return arr
}

function useLuckyBoxSounds() {
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

  function tone(type: OscillatorType, from: number, to: number, durationMs: number, peak = 0.05) {
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
      tone('square', 260, 330, 70, 0.03)
    },
    open() {
      tone('triangle', 180, 720, 220, 0.05)
    },
    win() {
      tone('triangle', 540, 980, 230, 0.055)
      window.setTimeout(() => tone('triangle', 780, 1320, 180, 0.05), 110)
    },
    lose() {
      tone('sawtooth', 210, 95, 280, 0.05)
    },
  }
}

export function LuckyBoxPage() {
  const navigate = useNavigate()
  const token = useSessionStore((s) => s.token)
  const userId = useSessionStore((s) => s.userId)
  const balance = useSessionStore((s) => s.balance)
  const setBalance = useSessionStore((s) => s.setBalance)
  const numericUserId = userId ? Number(userId) : NaN

  const sounds = useLuckyBoxSounds()
  const [bet, setBet] = useState(50)
  const [values, setValues] = useState<number[]>(() => shuffleValues(BOX_MULTIPLIERS))
  const [openedIndex, setOpenedIndex] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<RoundResult | null>(null)
  const [showPopup, setShowPopup] = useState(false)
  const [loseFx, setLoseFx] = useState(false)

  const displayValues = useMemo(
    () =>
      values.map((multiplier) => {
        if (multiplier === 0) return '0'
        return `${multiplier}x`
      }),
    [values],
  )

  const onPick = async (index: number) => {
    if (busy || openedIndex !== null) return
    setError(null)
    setResult(null)
    setShowPopup(false)
    if (!token?.trim() || !Number.isFinite(numericUserId)) {
      setError('Please login to play.')
      return
    }
    if (!Number.isFinite(bet) || bet < 1) {
      setError('Enter a valid bet amount.')
      return
    }

    sounds.click()
    setBusy(true)
    try {
      let init
      try {
        init = await clientApi.sessionInitiate({
          game_id: LUCKY_BOX_GAME_ID,
          host_id: numericUserId,
          users: [numericUserId],
          room_id: randomRoomId(),
          board_amount: bet,
        })
      } catch (firstError) {
        // Some backends only allow pre-registered game IDs.
        if (LUCKY_BOX_FALLBACK_GAME_ID === LUCKY_BOX_GAME_ID) {
          throw firstError
        }
        init = await clientApi.sessionInitiate({
          game_id: LUCKY_BOX_FALLBACK_GAME_ID,
          host_id: numericUserId,
          users: [numericUserId],
          room_id: randomRoomId(),
          board_amount: bet,
        })
      }

      sounds.open()
      setOpenedIndex(index)
      await delay(420)
      const selectedMultiplier = values[index]
      const payout = selectedMultiplier > 0 ? Math.max(1, Math.round(bet * selectedMultiplier)) : 0
      const win = selectedMultiplier > 0

      if (win) {
        await clientApi.sessionUpdate({
          game_session: init.game_session,
          coin_type: 'WIN',
          coin: payout,
          user_id: numericUserId,
          remark: `Lucky box win ${selectedMultiplier}x`,
        })
        sounds.win()
      } else {
        setLoseFx(true)
        window.setTimeout(() => setLoseFx(false), 340)
        sounds.lose()
      }

      const coin = await clientApi.getTotalCoin()
      setBalance(coin.coin)
      setResult({ multiplier: selectedMultiplier, payout, win })
      setShowPopup(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Round failed.')
      setOpenedIndex(null)
    } finally {
      setBusy(false)
    }
  }

  const onResetRound = () => {
    if (busy) return
    setValues(shuffleValues(BOX_MULTIPLIERS))
    setOpenedIndex(null)
    setResult(null)
    setError(null)
    setShowPopup(false)
    setLoseFx(false)
  }

  return (
    <main className="lucky-page">
      <header className="lucky-topbar">
        <button type="button" className="lucky-back-btn" onClick={() => navigate(-1)} aria-label="Back">
          ←
        </button>
        <h1>Lucky Box</h1>
        <div className="lucky-balance">
          <span>Balance</span>
          <strong>{formatCoinCompact(balance)} coins</strong>
        </div>
      </header>

      <section className={`lucky-board ${loseFx ? 'is-lose' : ''}`}>
        {displayValues.map((label, i) => {
          const opened = openedIndex === i
          const winPick = opened && result?.win
          const losePick = opened && result && !result.win
          return (
            <button
              key={`${label}-${i}`}
              type="button"
              className={`lucky-box ${opened ? 'opened' : ''} ${winPick ? 'is-win' : ''} ${losePick ? 'is-lose' : ''}`}
              disabled={busy || openedIndex !== null}
              onClick={() => {
                void onPick(i)
              }}
            >
              <span className="lucky-box-lid" />
              <span className="lucky-box-body">
                <span className="lucky-box-gem" />
                <span className="lucky-box-value">{opened ? label : '?'}</span>
              </span>
            </button>
          )
        })}
      </section>

      <section className="lucky-controls">
        <label htmlFor="lucky-bet" className="lucky-label">
          Bet amount
        </label>
        <div className="lucky-row">
          <input
            id="lucky-bet"
            className="lucky-bet-input"
            type="number"
            min={1}
            value={bet}
            onChange={(e) => setBet(Number(e.target.value))}
            disabled={busy || openedIndex !== null}
          />
          <button type="button" className="lucky-reset-btn" onClick={onResetRound} disabled={busy}>
            New Round
          </button>
        </div>
        <p className={`lucky-result-line ${result?.win ? 'win' : ''} ${result && !result.win ? 'lose' : ''}`}>
          {result
            ? result.win
              ? `You hit ${result.multiplier}x · +${formatCoinCompact(result.payout)}`
              : 'You opened 0 · Better luck next round'
            : 'Pick one box to reveal your multiplier'}
        </p>
        {error ? <p className="lucky-error">{error}</p> : null}
      </section>

      {showPopup && result ? (
        <div className="lucky-popup-overlay" role="dialog" aria-modal="true">
          <div className={`lucky-popup ${result.win ? 'win' : 'lose'}`}>
            <p className="lucky-popup-title">{result.win ? 'Lucky Win!' : 'Missed!'}</p>
            <p className="lucky-popup-mult">{result.multiplier === 0 ? '0' : `${result.multiplier}x`}</p>
            <p className="lucky-popup-text">{result.win ? `Payout: ${formatCoinCompact(result.payout)} coins` : 'No payout this round'}</p>
            <button type="button" className="lucky-popup-btn" onClick={() => setShowPopup(false)}>
              Continue
            </button>
          </div>
        </div>
      ) : null}
    </main>
  )
}
