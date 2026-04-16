type AppEnv = {
  apiBaseUrl: string
  loginGameId: number | undefined
  loginAllowHttp: boolean
  useDevProxy: boolean
}

function normalizeBaseUrl(raw: string): string {
  return raw.trim().replace(/\s+/g, '').replace(/\/+$/, '')
}

const rawBase = import.meta.env.VITE_CLIENT_API_BASE_URL ?? 'https://bdgamersclub.com'
const rawGameId = import.meta.env.VITE_LOGIN_GAME_ID
const productionBase = normalizeBaseUrl(typeof rawBase === 'string' ? rawBase : String(rawBase))
const useDevProxy = import.meta.env.VITE_USE_DEV_PROXY === 'true'

export const env: AppEnv = {
  // Use direct HTTPS API in dev by default to avoid proxy redirect chains (301 -> 401).
  // Set VITE_USE_DEV_PROXY=true only when your backend cannot be called directly.
  apiBaseUrl: import.meta.env.DEV ? (useDevProxy ? '' : productionBase) : productionBase,
  loginGameId:
    rawGameId !== undefined && rawGameId !== '' && rawGameId !== null
      ? Number(rawGameId)
      : undefined,
  loginAllowHttp: import.meta.env.VITE_LOGIN_ALLOW_HTTP === 'true',
  useDevProxy,
}
