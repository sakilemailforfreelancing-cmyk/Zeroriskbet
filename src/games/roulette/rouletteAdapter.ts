import type { BetResult } from '../../types/api'
import type { GameAdapter, GameState } from '../engine/types'

export const rouletteAdapter: GameAdapter<GameState> = {
  config: {
    id: 'roulette',
    title: 'Roulette',
    rtp: 97.3,
    minBet: 10,
    maxBet: 20000,
    volatility: 'high',
  },
  prepareBet: (input) => ({
    gameId: 'roulette',
    amount: input.amount,
    payload: input.options,
  }),
  applyResult: (_previous, apiResult: BetResult) => ({
    status: 'resolved',
    latestResult: apiResult,
  }),
}
