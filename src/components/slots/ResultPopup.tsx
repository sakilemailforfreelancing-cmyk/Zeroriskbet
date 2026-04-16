type ResultPopupProps = {
  open: boolean
  isWin: boolean
  amount: number
  resultLabel?: string
  onClose: () => void
}

export function ResultPopup({ open, isWin, amount, resultLabel, onClose }: ResultPopupProps) {
  if (!open) return null

  return (
    <div className="slot-result-overlay" role="dialog" aria-modal="true">
      <div className={`slot-result-card ${isWin ? 'win' : 'lose'}`}>
        <p className="slot-result-title">{isWin ? 'JACKPOT WIN' : 'Better luck next spin'}</p>
        <p className="slot-result-sub">{isWin ? `+${amount} coins` : 'No winning line this time'}</p>
        {resultLabel ? <p className="slot-result-sub">Landed on: {resultLabel}</p> : null}
        <button type="button" className="slot-result-btn" onClick={onClose}>
          Continue
        </button>
      </div>
    </div>
  )
}
