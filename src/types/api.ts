/** Laravel login */
export type LoginRequest = {
  email: string
  password: string
  game_id?: number
}

export type AppUser = {
  id: number
  name: string
  email: string
  user_id: string
  status: number
}

export type LoginResponse = {
  status: boolean
  token: string
  user: AppUser
}

export type AllBalanceResponse = {
  status: boolean
  star: number
  balance: number
  coin: number
  deposit: number
  withdraw: number
}

export type TotalCoinResponse = {
  status: boolean
  coin: number
}

export type TotalBalanceResponse = {
  status: boolean
  balance: number
}

export type SessionInitiateRequest = {
  game_id: number
  host_id: number
  users: number[]
  room_id: string
  board_amount: number
}

export type SessionInitiateResponse = {
  status: boolean
  game_session: string
  game_name: string
}

export type SessionUpdateRequest = {
  game_session: string
  coin_type: 'WIN'
  coin: number
  user_id: number
  remark?: string
}

export type SessionUpdateResponse = {
  status: boolean
  message?: string
  total_win?: number
  game_fee?: number
  grand_total?: number
}

export type GameHistoryItem = Record<string, unknown>
export type ActiveGameItem = Record<string, unknown>

/** Legacy game adapter shapes */
export type BetRequest = {
  gameId: string
  amount: number
  payload: Record<string, unknown>
}

export type BetResult = {
  payload: Record<string, unknown>
  newBalance?: number
}

export type ApiErrorShape = {
  message?: string
  error?: string
  code?: string
  details?: string
  errors?: Record<string, string[]>
}
