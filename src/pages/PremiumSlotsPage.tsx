import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { clientApi } from '../api/clientApi'
import { ResultPopup } from '../components/slots/ResultPopup'
import { SlotGrid } from '../components/slots/SlotGrid'
import { SpinButton } from '../components/slots/SpinButton'
import { formatCoinCompact } from '../formatCoin'
import { useSessionStore } from '../store/useSessionStore'

const SLOT_GAME_ID: number = 1
const SYMBOLS = ['🍒', '🍋', '🔔', '💎', '7', '⭐']
const COLUMN_COUNT = 5
const ROW_COUNT = 3

function randomRoomId(): string {
  return `slots_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

function pickSymbol(): string {
  return SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]
}

function createRandomGrid(): string[][] {
  return Array.from({ length: COLUMN_COUNT }, () => Array.from({ length: ROW_COUNT }, () => pickSymbol()))
}

function createFinalGrid(win: boolean): { grid: string[][]; winningRow: number | null; winnerSymbol: string | null } {
  const grid = createRandomGrid()
  if (!win) {
    return { grid, winningRow: null, winnerSymbol: null }
  }
  const winningRow = Math.floor(Math.random() * ROW_COUNT)
  const winnerSymbol = pickSymbol()
  for (let col = 0; col < COLUMN_COUNT; col += 1) {
    grid[col][winningRow] = winnerSymbol
  }
  return { grid, winningRow, winnerSymbol }
}

export function PremiumSlotsPage() {
  const navigate = useNavigate()
  const token = useSessionStore((s) => s.token)
  const userId = useSessionStore((s) => s.userId)
  const balance = useSessionStore((s) => s.balance)
  const setBalance = useSessionStore((s) => s.setBalance)
  const numericUserId = userId ? Number(userId) : NaN

  const [grid, setGrid] = useState<string[][]>(() => createRandomGrid())
  const [spinningColumns, setSpinningColumns] = useState<boolean[]>(() => Array(COLUMN_COUNT).fill(false))
  const [winningRow, setWinningRow] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [bet, setBet] = useState(50)
  const [lastWin, setLastWin] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [loseFx, setLoseFx] = useState(false)
  const [showResult, setShowResult] = useState(false)
  const [resultWin, setResultWin] = useState(false)
  const [resultAmount, setResultAmount] = useState(0)
  const [resultLabel, setResultLabel] = useState<string>('')

  const betText = useMemo(() => formatCoinCompact(bet), [bet])

  const onSpin = async () => {
    if (busy) return
    setError(null)
    setShowResult(false)
    setWinningRow(null)
    setResultLabel('')
    if (!token?.trim() || !Number.isFinite(numericUserId)) {
      setError('Please login to play.')
      return
    }
    if (!Number.isFinite(bet) || bet < 1) {
      setError('Please enter a valid bet.')
      return
    }

    setBusy(true)
    try {
      const init = await clientApi.sessionInitiate({
        game_id: SLOT_GAME_ID,
        host_id: numericUserId,
        users: [numericUserId],
        room_id: randomRoomId(),
        board_amount: bet,
      })

      setSpinningColumns(Array(COLUMN_COUNT).fill(true))
      const willWin = Math.random() < 0.33
      const final = createFinalGrid(willWin)

      for (let i = 0; i < COLUMN_COUNT; i += 1) {
        window.setTimeout(() => {
          setSpinningColumns((prev) => prev.map((v, idx) => (idx === i ? false : v)))
        }, 420 + i * 180)
      }

      await delay(420 + COLUMN_COUNT * 180 + 60)
      setGrid(final.grid)
      setWinningRow(final.winningRow)

      if (willWin && final.winnerSymbol) {
        const payout = Math.max(1, Math.round(bet * 3))
        await clientApi.sessionUpdate({
          game_session: init.game_session,
          coin_type: 'WIN',
          coin: payout,
          user_id: numericUserId,
          remark: `Premium slots win on ${final.winnerSymbol}`,
        })
        setLastWin(payout)
        setResultWin(true)
        setResultAmount(payout)
        setResultLabel(final.winnerSymbol)
      } else {
        setLastWin(0)
        setResultWin(false)
        setResultAmount(0)
        setLoseFx(true)
        window.setTimeout(() => setLoseFx(false), 320)
      }

      const coin = await clientApi.getTotalCoin()
      setBalance(coin.coin)
      setShowResult(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Spin failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="slot-page">
      <header className="slot-topbar">
        <button type="button" className="slot-back-btn" onClick={() => navigate(-1)} aria-label="Back">
          ←
        </button>
        <h1>Premium Slots</h1>
        <div className="slot-balance">
          <span>Balance</span>
          <strong>{formatCoinCompact(balance)} coins</strong>
        </div>
      </header>

      <SlotGrid grid={grid} spinningColumns={spinningColumns} winningRow={winningRow} loseFx={loseFx} />

      <section className="slot-controls">
        <div className="slot-stat">
          <span>Bet</span>
          <input
            type="number"
            min={1}
            value={bet}
            onChange={(e) => setBet(Number(e.target.value))}
            disabled={busy}
            className="slot-bet-input"
          />
        </div>
        <div className="slot-stat">
          <span>Last win</span>
          <strong>{lastWin > 0 ? `+${formatCoinCompact(lastWin)}` : '-'}</strong>
          <span style={{ marginTop: '0.22rem' }}>Current bet: {betText}</span>
        </div>
        <SpinButton busy={busy} onClick={() => void onSpin()} />
      </section>

      {error ? <p className="slot-error">{error}</p> : null}

      <ResultPopup open={showResult} isWin={resultWin} amount={resultAmount} resultLabel={resultLabel} onClose={() => setShowResult(false)} />
    </main>
  )
}
