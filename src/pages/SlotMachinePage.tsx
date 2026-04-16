import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { clientApi } from '../api/clientApi'
import { ResultPopup } from '../components/slots/ResultPopup'
import { SpinButton } from '../components/slots/SpinButton'
import { formatCoinCompact } from '../formatCoin'
import { useSessionStore } from '../store/useSessionStore'

const SPIN_GAME_ID = 1
const SPIN_MS = 4300

type WheelSection =
  | { label: string; kind: 'lose'; color: string }
  | { label: string; kind: 'fixed'; value: number; color: string }
  | { label: string; kind: 'mult'; value: number; color: string }

const WHEEL_SECTIONS: WheelSection[] = [
  { label: '100', kind: 'fixed', value: 100, color: '#8a1f2c' },
  { label: '20', kind: 'fixed', value: 20, color: '#4437a7' },
  { label: '0', kind: 'lose', color: '#3f3d4c' },
  { label: 'x2', kind: 'mult', value: 2, color: '#b54f1f' },
  { label: '50', kind: 'fixed', value: 50, color: '#1f5ca8' },
  { label: 'LOSE', kind: 'lose', color: '#474351' },
  { label: 'x3', kind: 'mult', value: 3, color: '#b62a3d' },
  { label: '10', kind: 'fixed', value: 10, color: '#2f3fa2' },
  { label: '0', kind: 'lose', color: '#4a4655' },
  { label: '20', kind: 'fixed', value: 20, color: '#6a2f84' },
]

type SpinResult = {
  isWin: boolean
  amount: number
  label: string
}

function normalizeDeg(value: number): number {
  return ((value % 360) + 360) % 360
}

/**
 * Center angle of segment `i` in the same space as `conic-gradient(from -90deg, …)`:
 * stop 0° sits at 9 o'clock; angles increase clockwise (CSS convention).
 */
function segmentCenterDegCss(i: number, sectionCount: number): number {
  const a = 360 / sectionCount
  return -90 + i * a + a / 2
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

function randomRoomId(): string {
  return `spin_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

function getPayout(section: WheelSection, bet: number): SpinResult {
  if (section.kind === 'lose') {
    return { isWin: false, amount: 0, label: section.label }
  }
  if (section.kind === 'fixed') {
    return { isWin: section.value > 0, amount: section.value, label: section.label }
  }
  return { isWin: true, amount: bet * section.value, label: section.label }
}

function useSpinSounds() {
  const ctxRef = useRef<AudioContext | null>(null)
  const tickTimerRef = useRef<number | null>(null)

  function ensureCtx(): AudioContext | null {
    if (ctxRef.current) return ctxRef.current
    const Ctx =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return null
    ctxRef.current = new Ctx()
    return ctxRef.current
  }

  function shortTone(freqStart: number, freqEnd: number, durationMs: number, type: OscillatorType, gainPeak: number) {
    const ctx = ensureCtx()
    if (!ctx) return
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = type
    osc.frequency.value = freqStart
    gain.gain.value = 0.0001
    osc.connect(gain)
    gain.connect(ctx.destination)
    gain.gain.exponentialRampToValueAtTime(gainPeak, ctx.currentTime + 0.01)
    osc.frequency.exponentialRampToValueAtTime(freqEnd, ctx.currentTime + durationMs / 1000)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + durationMs / 1000)
    osc.start()
    osc.stop(ctx.currentTime + durationMs / 1000 + 0.01)
  }

  function playTick() {
    shortTone(220, 280, 40, 'square', 0.028)
  }

  function startTickLoop() {
    stopTickLoop()
    tickTimerRef.current = window.setInterval(() => playTick(), 78)
  }

  function stopTickLoop() {
    if (tickTimerRef.current !== null) {
      window.clearInterval(tickTimerRef.current)
      tickTimerRef.current = null
    }
  }

  function playStopClick() {
    shortTone(980, 700, 65, 'triangle', 0.05)
  }

  function playWin() {
    shortTone(460, 730, 180, 'triangle', 0.06)
    window.setTimeout(() => shortTone(640, 1000, 220, 'triangle', 0.065), 120)
  }

  function playLose() {
    shortTone(240, 140, 260, 'sawtooth', 0.045)
  }

  return { startTickLoop, stopTickLoop, playStopClick, playWin, playLose }
}

export function SlotMachinePage() {
  const navigate = useNavigate()
  const token = useSessionStore((s) => s.token)
  const userId = useSessionStore((s) => s.userId)
  const balance = useSessionStore((s) => s.balance)
  const setBalance = useSessionStore((s) => s.setBalance)
  const numericUserId = userId ? Number(userId) : NaN

  const sounds = useSpinSounds()

  const [busy, setBusy] = useState(false)
  const [bet, setBet] = useState(50)
  const [lastWin, setLastWin] = useState(0)
  const [showResult, setShowResult] = useState(false)
  const [resultWin, setResultWin] = useState(false)
  const [resultAmount, setResultAmount] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [loseFx, setLoseFx] = useState(false)
  const [winningIndex, setWinningIndex] = useState<number | null>(null)
  const [resultLabel, setResultLabel] = useState<string>('')
  const [wheelRotation, setWheelRotation] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const previousRotationRef = useRef(0)
  const wheelRef = useRef<HTMLDivElement | null>(null)
  const [wheelSize, setWheelSize] = useState(320)

  const anglePerSection = 360 / WHEEL_SECTIONS.length
  const wheelBackground = useMemo(() => {
    const chunks = WHEEL_SECTIONS.map((s, i) => `${s.color} ${i * anglePerSection}deg ${(i + 1) * anglePerSection}deg`)
    return `conic-gradient(from -90deg, ${chunks.join(',')})`
  }, [anglePerSection])
  const winningOverlay = useMemo(() => {
    if (winningIndex === null) return 'transparent'
    const start = winningIndex * anglePerSection
    const end = start + anglePerSection
    return `conic-gradient(from -90deg, transparent 0deg ${start}deg, rgba(255, 210, 120, 0.58) ${start}deg ${end}deg, transparent ${end}deg 360deg)`
  }, [anglePerSection, winningIndex])
  const labelPoints = useMemo(() => {
    const centerX = wheelSize / 2
    const centerY = wheelSize / 2
    const n = WHEEL_SECTIONS.length
    const innerRadius = wheelSize * 0.26
    const outerRadius = wheelSize * 0.36
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5

    return WHEEL_SECTIONS.map((_, i) => {
      const deg = segmentCenterDegCss(i, n)
      const rad = (deg * Math.PI) / 180
      const x = centerX + radius * Math.sin(rad)
      const y = centerY - radius * Math.cos(rad)
      return {
        x,
        y,
        textRotateDeg: deg,
      }
    })
  }, [wheelSize])

  useEffect(() => {
    return () => {
      sounds.stopTickLoop()
    }
  }, [sounds])

  useEffect(() => {
    const onResize = () => {
      if (!wheelRef.current) return
      setWheelSize(wheelRef.current.clientWidth || 320)
    }
    onResize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const sectionIndexFromRotation = (rotationDeg: number): number => {
    const localAtPointer = normalizeDeg(-rotationDeg)
    const u = normalizeDeg(localAtPointer + 90)
    return Math.floor(u / anglePerSection) % WHEEL_SECTIONS.length
  }

  const onSpin = async () => {
    setError(null)
    setWinningIndex(null)
    setResultLabel('')
    setShowResult(false)
    setLoseFx(false)

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
        game_id: SPIN_GAME_ID,
        host_id: numericUserId,
        users: [numericUserId],
        room_id: randomRoomId(),
        board_amount: bet,
      })

      const targetIndex = Math.floor(Math.random() * WHEEL_SECTIONS.length)

      const fullSpins = 3 + Math.floor(Math.random() * 3) // 3..5
      const targetCenter = segmentCenterDegCss(targetIndex, WHEEL_SECTIONS.length)
      const landingOffset = normalizeDeg(-targetCenter)
      const finalRotation = previousRotationRef.current + fullSpins * 360 + landingOffset

      sounds.startTickLoop()
      setSpinning(true)
      setWheelRotation(finalRotation)
      previousRotationRef.current = finalRotation

      // Per-section stop clicks while wheel slows down.
      WHEEL_SECTIONS.forEach((_, i) => {
        window.setTimeout(
          () => {
            sounds.playStopClick()
          },
          500 + i * (SPIN_MS / WHEEL_SECTIONS.length),
        )
      })

      await delay(SPIN_MS + 40)
      sounds.stopTickLoop()

      // Resolve from actual final rotation so payout always matches visual landing segment.
      const resolvedIndex = sectionIndexFromRotation(finalRotation)
      const targetSection = WHEEL_SECTIONS[resolvedIndex]
      const spinResult = getPayout(targetSection, bet)
      setWinningIndex(resolvedIndex)
      setResultLabel(targetSection.label)
      if (spinResult.isWin) {
        await clientApi.sessionUpdate({
          game_session: init.game_session,
          coin_type: 'WIN',
          coin: spinResult.amount,
          user_id: numericUserId,
          remark: `Spin wheel win: ${targetSection.label}`,
        })
        setLastWin(spinResult.amount)
        setResultWin(true)
        setResultAmount(spinResult.amount)
        sounds.playWin()
      } else {
        setLastWin(0)
        setResultWin(false)
        setResultAmount(0)
        setLoseFx(true)
        window.setTimeout(() => setLoseFx(false), 350)
        sounds.playLose()
      }

      const coin = await clientApi.getTotalCoin()
      setBalance(coin.coin)
      setShowResult(true)
      setSpinning(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Spin failed.')
      sounds.stopTickLoop()
      setSpinning(false)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="wheel-page">
      <header className="wheel-topbar">
        <button type="button" className="wheel-back-btn" onClick={() => navigate(-1)} aria-label="Back">
          ←
        </button>
        <h1>Casino Spin Wheel</h1>
        <div className="wheel-balance">
          <span>Balance</span>
          <strong>{formatCoinCompact(balance)} coins</strong>
        </div>
      </header>

      <section className={`wheel-stage ${loseFx ? 'lose-shake' : ''}`}>
        <div className="wheel-pointer" />
        <div
          ref={wheelRef}
          className={`wheel-disc ${spinning ? 'is-spinning' : ''}`}
          style={{
            transform: `rotate(${wheelRotation}deg)`,
            transitionDuration: `${SPIN_MS}ms`,
            background: wheelBackground,
          }}
        >
          <div className={`wheel-win-overlay ${winningIndex !== null ? 'active' : ''}`} style={{ background: winningOverlay }} />
          <div className="wheel-inner-ring" />
          {WHEEL_SECTIONS.map((section, i) => {
            const point = labelPoints[i]
            return (
              <div
                key={`${section.label}-${i}`}
                className={`wheel-label ${section.label.length >= 4 ? 'is-long' : ''} ${winningIndex === i ? 'is-winning' : ''}`}
                style={{
                  left: `${point.x}px`,
                  top: `${point.y}px`,
                  transform: `translate(-50%, -50%) rotate(${point.textRotateDeg}deg)`,
                }}
              >
                {section.label}
              </div>
            )
          })}
        </div>
      </section>

      <section className="wheel-controls">
        <div className="wheel-stat">
          <span>Bet</span>
          <input
            type="number"
            min={1}
            value={bet}
            onChange={(e) => setBet(Number(e.target.value))}
            disabled={busy}
            className="wheel-bet-input"
          />
        </div>
        <div className="wheel-stat">
          <span>WIN</span>
          <strong>{lastWin > 0 ? `+${formatCoinCompact(lastWin)}` : '-'}</strong>
        </div>
        <SpinButton busy={busy} onClick={() => void onSpin()} />
      </section>

      {error ? <p className="wheel-error">{error}</p> : null}

      <ResultPopup open={showResult} isWin={resultWin} amount={resultAmount} resultLabel={resultLabel} onClose={() => setShowResult(false)} />
    </main>
  )
}
