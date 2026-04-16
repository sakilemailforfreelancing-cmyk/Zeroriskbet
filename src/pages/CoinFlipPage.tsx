import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { clientApi } from '../api/clientApi'
import { formatCoinCompact } from '../formatCoin'
import { useSessionStore } from '../store/useSessionStore'

const COIN_FLIP_GAME_ID: number = 8
const COIN_FLIP_FALLBACK_GAME_ID: number = 1
const FLIP_MS = 1250

type CoinSide = 'HEAD' | 'TAIL'

function randomRoomId(): string {
  return `coinflip_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

function normalizeDeg(value: number): number {
  return ((value % 360) + 360) % 360
}

function oppositeSide(side: CoinSide): CoinSide {
  return side === 'HEAD' ? 'TAIL' : 'HEAD'
}

function useCoinFlipSounds() {
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
    gain.gain.exponentialRampToValueAtTime(peak, ctx.currentTime + 0.02)
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), ctx.currentTime + durationMs / 1000)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + durationMs / 1000)
    osc.start()
    osc.stop(ctx.currentTime + durationMs / 1000 + 0.02)
  }

  return {
    flip() {
      tone('triangle', 330, 1100, 340, 0.045)
      window.setTimeout(() => tone('square', 900, 560, 260, 0.03), 130)
    },
    win() {
      tone('triangle', 520, 920, 210, 0.055)
      window.setTimeout(() => tone('triangle', 760, 1260, 180, 0.052), 110)
    },
    lose() {
      tone('sawtooth', 260, 120, 280, 0.05)
    },
  }
}

export function CoinFlipPage() {
  const navigate = useNavigate()
  const token = useSessionStore((s) => s.token)
  const userId = useSessionStore((s) => s.userId)
  const balance = useSessionStore((s) => s.balance)
  const setBalance = useSessionStore((s) => s.setBalance)
  const numericUserId = userId ? Number(userId) : NaN

  const sounds = useCoinFlipSounds()

  const [bet, setBet] = useState(50)
  const [choice, setChoice] = useState<CoinSide>('HEAD')
  const [result, setResult] = useState<CoinSide>('HEAD')
  const [spinning, setSpinning] = useState(false)
  const [coinDeg, setCoinDeg] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [roundText, setRoundText] = useState('Choose HEAD or TAIL and flip.')
  const [popupOpen, setPopupOpen] = useState(false)
  const [isWin, setIsWin] = useState<boolean | null>(null)
  const [winAmount, setWinAmount] = useState(0)
  const [flash, setFlash] = useState(false)
  const [shake, setShake] = useState(false)

  const onFlip = async () => {
    if (spinning || busy) return
    setError(null)
    setPopupOpen(false)
    setIsWin(null)
    setWinAmount(0)
    if (!token?.trim() || !Number.isFinite(numericUserId)) {
      setError('Please login to play.')
      return
    }
    if (!Number.isFinite(bet) || bet < 1) {
      setError('Enter a valid bet amount.')
      return
    }

    setBusy(true)
    try {
      let init
      try {
        init = await clientApi.sessionInitiate({
          game_id: COIN_FLIP_GAME_ID,
          host_id: numericUserId,
          users: [numericUserId],
          room_id: randomRoomId(),
          board_amount: bet,
        })
      } catch (firstError) {
        if (COIN_FLIP_FALLBACK_GAME_ID === COIN_FLIP_GAME_ID) {
          throw firstError
        }
        init = await clientApi.sessionInitiate({
          game_id: COIN_FLIP_FALLBACK_GAME_ID,
          host_id: numericUserId,
          users: [numericUserId],
          room_id: randomRoomId(),
          board_amount: bet,
        })
      }

      const win = Math.random() < 0.5
      const landed: CoinSide = win ? choice : oppositeSide(choice)
      const fullTurns = 5 + Math.floor(Math.random() * 3)
      // Keep final coin orientation upright; side is decided by state/image after animation.
      const finalFaceDeg = 0
      setSpinning(true)
      sounds.flip()
      setRoundText('Flipping coin...')
      setCoinDeg((prev) => {
        const currentFaceDeg = normalizeDeg(prev)
        const deltaToTarget = normalizeDeg(finalFaceDeg - currentFaceDeg)
        return prev + fullTurns * 360 + deltaToTarget
      })
      await delay(FLIP_MS + 30)
      setSpinning(false)
      // Update the visible side only after the flip animation completes.
      setResult(landed)

      const payout = win ? Math.max(1, Math.round(bet * 2)) : 0
      setIsWin(win)
      setWinAmount(payout)
      setRoundText(win ? `You won with ${landed}!` : `Coin landed on ${landed}.`)

      if (win) {
        await clientApi.sessionUpdate({
          game_session: init.game_session,
          coin_type: 'WIN',
          coin: payout,
          user_id: numericUserId,
          remark: `Coin flip win on ${landed}`,
        })
        setFlash(true)
        window.setTimeout(() => setFlash(false), 360)
        sounds.win()
      } else {
        setShake(true)
        window.setTimeout(() => setShake(false), 320)
        sounds.lose()
      }

      const coin = await clientApi.getTotalCoin()
      setBalance(coin.coin)
      setPopupOpen(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Flip failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="coinflip-page">
      <header className="coinflip-topbar">
        <button type="button" className="coinflip-back-btn" onClick={() => navigate(-1)} aria-label="Back">
          ←
        </button>
        <h1>Heads or Tails</h1>
        <div className="coinflip-balance">
          <span>Balance</span>
          <strong>{formatCoinCompact(balance)} coins</strong>
        </div>
      </header>

      <section className={`coinflip-stage ${flash ? 'is-flash' : ''} ${shake ? 'is-shake' : ''}`}>
        <div className="coinflip-coin-wrap">
          <div
            className={`coinflip-coin ${spinning ? 'spinning' : ''} ${isWin ? 'is-win' : ''} ${isWin === false ? 'is-lose' : ''}`}
            style={{ transform: `rotateX(${coinDeg}deg)` }}
          >
            <div className={`coinflip-face ${result === 'HEAD' ? 'head' : 'tail'}`}>
              <img
                className="coinflip-face-image"
                src={result === 'HEAD' ? '/images/coin-head.svg' : '/images/coin-tail.svg'}
                alt={result === 'HEAD' ? 'Head side' : 'Tail side'}
              />
            </div>
          </div>
        </div>
        <p className="coinflip-result-live">{spinning ? 'FLIPPING...' : result}</p>
      </section>

      <section className="coinflip-controls">
        <div className="coinflip-choice-row">
          <button
            type="button"
            className={`coinflip-choice ${choice === 'HEAD' ? 'active' : ''}`}
            disabled={spinning || busy}
            onClick={() => setChoice('HEAD')}
          >
            HEAD
          </button>
          <button
            type="button"
            className={`coinflip-choice ${choice === 'TAIL' ? 'active' : ''}`}
            disabled={spinning || busy}
            onClick={() => setChoice('TAIL')}
          >
            TAIL
          </button>
        </div>
        <label htmlFor="coinflip-bet" className="coinflip-label">
          Bet amount
        </label>
        <input
          id="coinflip-bet"
          className="coinflip-bet-input"
          type="number"
          min={1}
          value={bet}
          disabled={spinning || busy}
          onChange={(e) => setBet(Number(e.target.value))}
        />
        <button type="button" className="coinflip-flip-btn" onClick={() => void onFlip()} disabled={spinning || busy}>
          {spinning ? 'Flipping...' : busy ? 'Loading...' : 'Flip'}
        </button>
        <p className="coinflip-round-text">{roundText}</p>
        {error ? <p className="coinflip-error">{error}</p> : null}
      </section>

      {popupOpen && isWin !== null ? (
        <div className="coinflip-popup-overlay" role="dialog" aria-modal="true">
          <div className={`coinflip-popup ${isWin ? 'win' : 'lose'}`}>
            <p className="coinflip-popup-title">{isWin ? 'WIN 2x' : 'You Lose'}</p>
            <p className="coinflip-popup-sub">{isWin ? `+${formatCoinCompact(winAmount)} coins` : 'Try again next flip'}</p>
            <button type="button" className="coinflip-popup-btn" onClick={() => setPopupOpen(false)}>
              Continue
            </button>
          </div>
        </div>
      ) : null}
    </main>
  )
}
