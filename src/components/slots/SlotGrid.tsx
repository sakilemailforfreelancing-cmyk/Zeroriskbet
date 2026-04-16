import { ReelColumn } from './ReelColumn'

type SlotGridProps = {
  grid: string[][]
  spinningColumns: boolean[]
  winningRow: number | null
  loseFx: boolean
}

export function SlotGrid({ grid, spinningColumns, winningRow, loseFx }: SlotGridProps) {
  return (
    <section className={`slot-grid-wrap ${loseFx ? 'lose-shake' : ''}`}>
      <div className="slot-grid">
        {grid.map((column, i) => (
          <ReelColumn key={i} symbols={column} spinning={spinningColumns[i]} winningRow={winningRow} />
        ))}
      </div>
    </section>
  )
}
