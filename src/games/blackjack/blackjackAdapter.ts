import type { BetResult } from '../../types/api'
import type { GameAdapter, GameState } from '../engine/types'

export const blackjackAdapter: GameAdapter<GameState> = {
  config: {
    id: 'blackjack',
    title: 'Blackjack',
    rtp: 99.0,
    minBet: 25,
    maxBet: 50000,
    volatility: 'low',
  },
  prepareBet: (input) => ({
    gameId: 'blackjack',
    amount: input.amount,
    payload: input.options,
  }),
  applyResult: (_previous, apiResult: BetResult) => ({
    status: 'resolved',
    latestResult: apiResult,
  }),
}
