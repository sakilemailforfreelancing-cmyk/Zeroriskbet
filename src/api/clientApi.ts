import axios, { AxiosError, AxiosHeaders } from 'axios'
import { env } from '../config/env'
import { endpoints } from './endpoints'
import type {
  ActiveGameItem,
  AllBalanceResponse,
  ApiErrorShape,
  AppUser,
  GameHistoryItem,
  LoginRequest,
  LoginResponse,
  SessionInitiateRequest,
  SessionInitiateResponse,
  SessionUpdateRequest,
  SessionUpdateResponse,
  TotalBalanceResponse,
  TotalCoinResponse,
} from '../types/api'
import { useSessionStore } from '../store/useSessionStore'

export class ApiError extends Error {
  code: string
  details?: string
  errors?: Record<string, string[]>

  constructor(message: string, code = 'API_ERROR', details?: string, errors?: Record<string, string[]>) {
    super(message)
    this.code = code
    this.details = details
    this.errors = errors
  }
}

function messageFromLaravelData(data: unknown): string {
  if (data == null) return 'Request failed.'
  if (typeof data === 'string') {
    const t = data.trim()
    if (t.startsWith('<!DOCTYPE') || t.startsWith('<html')) {
      return 'Server returned HTML instead of JSON (wrong URL or API offline).'
    }
    return t.slice(0, 200) || 'Request failed.'
  }
  if (typeof data !== 'object') return 'Request failed.'
  const d = data as ApiErrorShape
  if (typeof d.message === 'string' && d.message) return d.message
  if (typeof d.error === 'string' && d.error) return d.error
  if (d.errors && typeof d.errors === 'object') {
    const first = Object.values(d.errors)[0]
    if (Array.isArray(first) && first[0]) return String(first[0])
  }
  return 'Request failed.'
}

function messageFromAxiosError(error: AxiosError<ApiErrorShape>): string {
  if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
    return 'Cannot reach the API (network/CORS). Run npm run dev so /api is proxied, or fix CORS on the server.'
  }
  if (error.code === 'ECONNABORTED') {
    return 'Request timed out.'
  }
  const status = error.response?.status
  const data = error.response?.data
  if (status === 301 || status === 302 || status === 303) {
    return 'API redirected the request. Set VITE_CLIENT_API_BASE_URL to the final https:// URL or use the dev proxy.'
  }
  const fromBody = messageFromLaravelData(data)
  if (fromBody !== 'Request failed.') {
    if (/GET method is not supported/i.test(fromBody)) {
      return `${fromBody} Use https:// for the API base or npm run dev with proxy.`
    }
    return fromBody
  }
  if (status) {
    return `Request failed (${status}${error.response?.statusText ? ` ${error.response.statusText}` : ''}).`
  }
  return error.message || 'Request failed.'
}

/** Sanctum tokens must not be stored or sent as `Bearer Bearer …`. */
function normalizeSanctumToken(raw: string): string {
  return raw.trim().replace(/^bearer\s+/i, '').trim()
}

function parseLoginResponse(raw: unknown): LoginResponse {
  if (!raw || typeof raw !== 'object') {
    throw new ApiError('Invalid login response.')
  }
  const r = raw as Record<string, unknown>
  let token: unknown = r.token ?? r.access_token
  let user: unknown = r.user
  if (r.data && typeof r.data === 'object') {
    const d = r.data as Record<string, unknown>
    token = token ?? d.token ?? d.access_token
    user = user ?? d.user
  }
  if (typeof token !== 'string' || !token.trim() || !user || typeof user !== 'object') {
    throw new ApiError('Invalid login response.')
  }
  return {
    status: r.status !== false,
    token: normalizeSanctumToken(token),
    user: user as AppUser,
  }
}

function resolveAccessToken(overrideToken?: string): string {
  const fromOverride = overrideToken?.trim()
  if (fromOverride) return normalizeSanctumToken(fromOverride)
  const fromStore = useSessionStore.getState().token?.trim()
  return fromStore ? normalizeSanctumToken(fromStore) : ''
}

function buildAuthHeaders(overrideToken?: string): AxiosHeaders {
  const headers = AxiosHeaders.from({
    Accept: 'application/json',
  })
  const token = resolveAccessToken(overrideToken)
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }
  return headers
}

const axiosDefaults = {
  baseURL: env.apiBaseUrl,
  timeout: 20000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
}

const api = axios.create(axiosDefaults)

/** Login and other unauthenticated POSTs — never send a stale Bearer from the session store. */
const bareApi = axios.create(axiosDefaults)

function attachErrorInterceptor(instance: typeof api) {
  instance.interceptors.response.use(
    (response) => response,
    (error: AxiosError<ApiErrorShape>) => {
      const data = error.response?.data
      const msg = messageFromAxiosError(error)
      const code =
        data && typeof data === 'object' && typeof data.code === 'string'
          ? data.code
          : String(error.response?.status ?? error.code ?? 'UNKNOWN')
      return Promise.reject(
        new ApiError(msg, code, error.response ? undefined : error.message, data?.errors),
      )
    },
  )
}

attachErrorInterceptor(api)
attachErrorInterceptor(bareApi)

api.interceptors.request.use((config) => {
  const headers = AxiosHeaders.from(config.headers ?? {})
  const existing = headers.get('Authorization') ?? headers.get('authorization')
  if (typeof existing === 'string' && existing.trim()) {
    return config
  }
  const token = useSessionStore.getState().token?.trim()
  if (!token) return config
  headers.set('Authorization', `Bearer ${normalizeSanctumToken(token)}`)
  config.headers = headers
  return config
})

function assertOk<T extends { status?: boolean }>(data: T, fallbackMsg: string): T {
  if (data && typeof data === 'object' && 'status' in data && data.status === false) {
    throw new ApiError(fallbackMsg)
  }
  return data
}

export const clientApi = {
  async login(body: LoginRequest): Promise<LoginResponse> {
    const game_id =
      body.game_id ?? (Number.isFinite(env.loginGameId) ? (env.loginGameId as number) : 1)

    try {
      const { data: raw } = await bareApi.post<LoginResponse & { message?: string; access_token?: string; data?: unknown }>(
        endpoints.appUserLogin,
        {
          email: body.email.trim(),
          password: body.password,
          game_id,
        },
      )
      assertOk(raw, 'Login failed.')
      return parseLoginResponse(raw)
    } catch (e) {
      if (e instanceof ApiError && /unauthenticated/i.test(e.message)) {
        throw new ApiError('Invalid email or password.')
      }
      throw e
    }
  },

  async getTotalCoin(): Promise<TotalCoinResponse> {
    const { data } = await api.get<TotalCoinResponse>(endpoints.appUserTotalCoin, {
      headers: buildAuthHeaders(),
    })
    assertOk(data, 'Could not load coin balance.')
    return data
  },

  async getTotalBalance(): Promise<TotalBalanceResponse> {
    const { data } = await api.get<TotalBalanceResponse>(endpoints.appUserTotalBalance, {
      headers: buildAuthHeaders(),
    })
    assertOk(data, 'Could not load balance.')
    return data
  },

  async getAllBalance(opts?: { accessToken?: string }): Promise<AllBalanceResponse> {
    const { data } = await api.get<AllBalanceResponse>(endpoints.appUserAllBalance, {
      headers: buildAuthHeaders(opts?.accessToken),
    })
    assertOk(data, 'Could not load balances.')
    return data
  },

  async getUserDetails(): Promise<unknown> {
    const { data } = await api.get<unknown>(endpoints.appUserUserDetails, {
      headers: buildAuthHeaders(),
    })
    return data
  },

  async getActiveGameList(): Promise<ActiveGameItem[]> {
    const { data } = await api.get<unknown>(endpoints.appUserGetActiveGameList, {
      headers: buildAuthHeaders(),
    })
    if (Array.isArray(data)) return data as ActiveGameItem[]
    if (data && typeof data === 'object' && Array.isArray((data as { data?: unknown }).data)) {
      return (data as { data: ActiveGameItem[] }).data
    }
    return []
  },

  async getGameHistory(): Promise<GameHistoryItem[]> {
    const { data } = await api.get<unknown>(endpoints.gameGameHistory, {
      headers: buildAuthHeaders(),
    })
    if (Array.isArray(data)) return data as GameHistoryItem[]
    if (data && typeof data === 'object' && Array.isArray((data as { data?: unknown }).data)) {
      return (data as { data: GameHistoryItem[] }).data
    }
    return []
  },

  async sessionInitiate(body: SessionInitiateRequest): Promise<SessionInitiateResponse> {
    const { data } = await api.post<SessionInitiateResponse>(endpoints.gameSessionInitiate, body, {
      headers: buildAuthHeaders(),
    })
    assertOk(data, 'Could not start game session.')
    return data
  },

  async sessionUpdate(body: SessionUpdateRequest): Promise<SessionUpdateResponse> {
    const { data } = await api.post<SessionUpdateResponse>(endpoints.gameSessionUpdate, body, {
      headers: buildAuthHeaders(),
    })
    assertOk(data, 'Could not update game session.')
    return data
  },
}
