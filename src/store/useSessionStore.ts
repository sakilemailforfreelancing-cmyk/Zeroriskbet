import { create } from 'zustand'
import { clearAuthStorage } from '../auth/storage'

type SessionState = {
  token: string | null
  userId: string | null
  email: string | null
  displayName: string | null
  publicUserId: string | null
  balance: number
  setSession: (payload: {
    token: string
    userId: string
    email: string
    displayName: string
    publicUserId: string
  }) => void
  setBalance: (coins: number) => void
  clearSession: () => void
}

export const useSessionStore = create<SessionState>((set) => ({
  token: null,
  userId: null,
  email: null,
  displayName: null,
  publicUserId: null,
  balance: 0,
  setSession: (payload) => set(() => ({ ...payload })),
  setBalance: (coins) => set(() => ({ balance: coins })),
  clearSession: () => {
    clearAuthStorage()
    set(() => ({
      token: null,
      userId: null,
      email: null,
      displayName: null,
      publicUserId: null,
      balance: 0,
    }))
  },
}))
