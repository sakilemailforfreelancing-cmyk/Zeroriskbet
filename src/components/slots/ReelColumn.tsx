type ReelColumnProps = {
  symbols: string[]
  spinning: boolean
  winningRow: number | null
}

export function ReelColumn({ symbols, spinning, winningRow }: ReelColumnProps) {
  return (
    <div className={`slot-column ${spinning ? 'is-spinning' : ''}`}>
      {symbols.map((symbol, rowIndex) => (
        <div key={`${symbol}-${rowIndex}`} className={`slot-cell ${winningRow === rowIndex ? 'is-winning' : ''}`}>
          <span className="slot-symbol">{symbol}</span>
        </div>
      ))}
    </div>
  )
}
