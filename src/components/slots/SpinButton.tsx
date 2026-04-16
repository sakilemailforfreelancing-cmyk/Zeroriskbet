type SpinButtonProps = {
  busy: boolean
  onClick: () => void
}

export function SpinButton({ busy, onClick }: SpinButtonProps) {
  return (
    <button type="button" className="slot-spin-btn" disabled={busy} onClick={onClick}>
      {busy ? 'Spinning...' : 'SPIN'}
    </button>
  )
}
