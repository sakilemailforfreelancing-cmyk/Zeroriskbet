import type { BetRequest as ApiBetRequest, BetResult as ApiBetResult } from '../../types/api'

export type Volatility = 'low' | 'medium' | 'high'

export type GameConfig = {
  id: string
  title: string
  rtp: number
  minBet: number
  maxBet: number
  volatility: Volatility
}

export type GameState = {
  status: 'idle' | 'spinning' | 'resolved'
  latestResult?: ApiBetResult
}

export type BetInput = {
  amount: number
  options: Record<string, unknown>
}

export type GameAdapter<TState extends GameState = GameState> = {
  config: GameConfig
  prepareBet: (input: BetInput) => ApiBetRequest
  applyResult: (previous: TState, apiResult: ApiBetResult) => TState
}
