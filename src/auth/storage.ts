const TOKEN_KEY = 'zeroriskbet_token'
const SESSION_KEY = 'zeroriskbet_session'

export type StoredSession = {
  token: string
  userId: string
  email: string
  displayName: string
  publicUserId: string
}

export function saveAuthToStorage(session: StoredSession): void {
  localStorage.setItem(TOKEN_KEY, session.token)
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

export function loadAuthFromStorage(): StoredSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredSession
    if (!parsed?.token || !parsed.userId) return null
    return parsed
  } catch {
    return null
  }
}

export function clearAuthStorage(): void {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(SESSION_KEY)
}
