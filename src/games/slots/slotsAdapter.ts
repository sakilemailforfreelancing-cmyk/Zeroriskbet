import type { BetResult } from '../../types/api'
import type { GameAdapter, GameState } from '../engine/types'

export const slotsAdapter: GameAdapter<GameState> = {
  config: {
    id: 'slots',
    title: 'Lucky Slots',
    rtp: 96.1,
    minBet: 10,
    maxBet: 10000,
    volatility: 'medium',
  },
  prepareBet: (input) => ({
    gameId: 'slots',
    amount: input.amount,
    payload: input.options,
  }),
  applyResult: (_previous, apiResult: BetResult) => ({
    status: 'resolved',
    latestResult: apiResult,
  }),
}
