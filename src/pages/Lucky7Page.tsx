import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { clientApi } from '../api/clientApi'
import { formatCoinCompact } from '../formatCoin'
import { useSessionStore } from '../store/useSessionStore'

const LUCKY7_GAME_ID: number = 9
const LUCKY7_FALLBACK_GAME_ID: number = 1
const REVEAL_MS = 1300
const CARD_COUNT = 8

function randomRoomId(): string {
  return `lucky7_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

function randomNumber(): number {
  return Math.floor(Math.random() * 10) + 1
}

function createLuckyBoard(): number[] {
  const board = Array.from({ length: CARD_COUNT }, () => randomNumber())
  if (!board.includes(7)) {
    board[Math.floor(Math.random() * CARD_COUNT)] = 7
  }
  return board
}

function useLucky7Sounds() {
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
    gain.gain.exponentialRampToValueAtTime(peak, ctx.currentTime + 0.02)
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), ctx.currentTime + durationMs / 1000)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + durationMs / 1000)
    osc.start()
    osc.stop(ctx.currentTime + durationMs / 1000 + 0.02)
  }

  return {
    click() {
      pulse('square', 260, 420, 90, 0.035)
    },
    open() {
      pulse('triangle', 220, 980, 260, 0.045)
    },
    flip() {
      pulse('triangle', 260, 900, 240, 0.04)
    },
    sparkle() {
      pulse('square', 740, 1180, 140, 0.036)
      window.setTimeout(() => pulse('triangle', 980, 1360, 120, 0.03), 70)
    },
    win() {
      pulse('triangle', 430, 860, 220, 0.06)
      window.setTimeout(() => pulse('triangle', 640, 1220, 230, 0.058), 100)
      window.setTimeout(() => pulse('triangle', 840, 1520, 180, 0.054), 190)
    },
    lose() {
      pulse('sawtooth', 240, 110, 280, 0.045)
    },
  }
}

export function Lucky7Page() {
  const navigate = useNavigate()
  const token = useSessionStore((s) => s.token)
  const userId = useSessionStore((s) => s.userId)
  const balance = useSessionStore((s) => s.balance)
  const setBalance = useSessionStore((s) => s.setBalance)
  const numericUserId = userId ? Number(userId) : NaN
  const sounds = useLucky7Sounds()

  const [cards, setCards] = useState<number[]>(() => createLuckyBoard())
  const [bet, setBet] = useState(50)
  const [busy, setBusy] = useState(false)
  const [revealing, setRevealing] = useState(false)
  const [pressingIndex, setPressingIndex] = useState<number | null>(null)
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [revealedNumber, setRevealedNumber] = useState<number | null>(null)
  const [isWin, setIsWin] = useState<boolean | null>(null)
  const [winAmount, setWinAmount] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [jackpotFx, setJackpotFx] = useState(false)
  const [loseFx, setLoseFx] = useState(false)
  const [loseSoftFx, setLoseSoftFx] = useState(false)

  const resultLabel = useMemo(() => {
    if (revealedNumber === null) return '—'
    return String(revealedNumber)
  }, [revealedNumber])

  const resetRoundState = () => {
    setCards(createLuckyBoard())
    setPressingIndex(null)
    setSelectedIndex(null)
    setRevealedNumber(null)
    setIsWin(null)
    setWinAmount(0)
    setJackpotFx(false)
    setLoseFx(false)
    setLoseSoftFx(false)
    setRevealing(false)
    setError(null)
  }

  const onPickCard = async (cardIndex: number) => {
    if (busy || revealing || selectedIndex !== null) return
    setError(null)
    if (!token?.trim() || !Number.isFinite(numericUserId)) {
      setError('Please login to play.')
      return
    }
    if (!Number.isFinite(bet) || bet < 1) {
      setError('Enter a valid bet amount.')
      return
    }

    sounds.click()
    setSelectedIndex(cardIndex)
    setPressingIndex(cardIndex)
    setBusy(true)
    try {
      let init
      try {
        init = await clientApi.sessionInitiate({
          game_id: LUCKY7_GAME_ID,
          host_id: numericUserId,
          users: [numericUserId],
          room_id: randomRoomId(),
          board_amount: bet,
        })
      } catch (firstError) {
        if (LUCKY7_FALLBACK_GAME_ID === LUCKY7_GAME_ID) throw firstError
        init = await clientApi.sessionInitiate({
          game_id: LUCKY7_FALLBACK_GAME_ID,
          host_id: numericUserId,
          users: [numericUserId],
          room_id: randomRoomId(),
          board_amount: bet,
        })
      }

      await delay(110)
      setPressingIndex(null)
      setRevealing(true)
      sounds.open()
      sounds.flip()
      window.setTimeout(() => sounds.sparkle(), 260)
      const rolled = cards[cardIndex]
      await delay(REVEAL_MS)
      setRevealing(false)
      setRevealedNumber(rolled)

      const win = rolled === 7
      const payout = win ? Math.max(1, Math.round(bet * 7)) : 0
      setIsWin(win)
      setWinAmount(payout)

      if (win) {
        await clientApi.sessionUpdate({
          game_session: init.game_session,
          coin_type: 'WIN',
          coin: payout,
          user_id: numericUserId,
          remark: 'Lucky 7 jackpot',
        })
        setJackpotFx(true)
        sounds.win()
      } else {
        setLoseFx(true)
        setLoseSoftFx(true)
        window.setTimeout(() => setLoseFx(false), 350)
        window.setTimeout(() => setLoseSoftFx(false), 620)
        sounds.lose()
      }

      const coin = await clientApi.getTotalCoin()
      setBalance(coin.coin)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lucky 7 play failed.')
      setRevealing(false)
      setPressingIndex(null)
      setSelectedIndex(null)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className={`lucky7-page ${jackpotFx ? 'jackpot-glow' : ''} ${loseSoftFx ? 'lose-soft' : ''}`}>
      <header className="lucky7-topbar">
        <button type="button" className="lucky7-back-btn" onClick={() => navigate(-1)} aria-label="Back">
          ←
        </button>
        <h1>Lucky 7</h1>
        <div className="lucky7-balance">
          <span>Balance</span>
          <strong>{formatCoinCompact(balance)} coins</strong>
        </div>
      </header>

      <section className="lucky7-result-zone">
        <p className={`lucky7-result-number ${revealedNumber !== null ? 'revealed' : ''} ${revealedNumber === 7 ? 'jackpot' : ''}`}>{resultLabel}</p>
        {revealedNumber === 7 ? <p className="lucky7-jackpot-text">JACKPOT 7</p> : null}
      </section>

      <section className={`lucky7-card-stage ${loseFx ? 'lose-shake' : ''}`}>
        <div className={`lucky7-particles ${revealing ? 'active' : ''}`} />
        <div className="lucky7-board">
          {cards.map((value, index) => {
            const selected = selectedIndex === index
            const dimmed = selectedIndex !== null && !selected
            const pressing = pressingIndex === index
            const revealed = selected && !revealing
            return (
              <button
                key={index}
                type="button"
                className={`lucky7-card ${selected ? 'selected' : ''} ${dimmed ? 'dimmed' : ''} ${pressing ? 'pressing' : ''} ${revealing && selected ? 'flipping' : ''} ${revealed ? 'revealed' : ''}`}
                onClick={() => {
                  void onPickCard(index)
                }}
                disabled={busy || revealing || selectedIndex !== null}
              >
                <span className="lucky7-card-front">LUCKY</span>
                <span className="lucky7-card-back">{value}</span>
                <span className={`lucky7-card-burst ${selected ? 'active' : ''}`} />
              </button>
            )
          })}
        </div>
      </section>

      <section className="lucky7-controls">
        <label htmlFor="lucky7-bet" className="lucky7-label">
          Bet amount
        </label>
        <input
          id="lucky7-bet"
          className="lucky7-bet-input"
          type="number"
          min={1}
          value={bet}
          disabled={busy || revealing || selectedIndex !== null}
          onChange={(e) => setBet(Number(e.target.value))}
        />
        <button type="button" className="lucky7-reset-btn" onClick={resetRoundState} disabled={busy || revealing}>
          Next Round
        </button>
        <p className={`lucky7-result-line ${isWin ? 'win' : ''} ${isWin === false ? 'lose' : ''}`}>
          {isWin === null ? 'Pick one card to reveal your lucky number.' : isWin ? `BIG WIN +${formatCoinCompact(winAmount)} coins` : 'Not 7 this time.'}
        </p>
        {error ? <p className="lucky7-error">{error}</p> : null}
      </section>
    </main>
  )
}
