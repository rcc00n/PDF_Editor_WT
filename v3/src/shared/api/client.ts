import { API_BASE_URL } from './config'

const ACCESS_TOKEN_KEY = 'rf_access_token'
const REFRESH_TOKEN_KEY = 'rf_refresh_token'

export function getStoredAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY)
}

export function getStoredRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY)
}

export function storeTokens(access: string, refresh?: string) {
  localStorage.setItem(ACCESS_TOKEN_KEY, access)
  if (refresh) localStorage.setItem(REFRESH_TOKEN_KEY, refresh)
}

export function clearStoredTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
}

function joinUrl(path: string) {
  if (!API_BASE_URL) return path
  if (API_BASE_URL.endsWith('/') && path.startsWith('/')) return `${API_BASE_URL}${path.slice(1)}`
  if (!API_BASE_URL.endsWith('/') && !path.startsWith('/')) return `${API_BASE_URL}/${path}`
  return `${API_BASE_URL}${path}`
}

async function refreshAccessToken() {
  const refresh = getStoredRefreshToken()
  if (!refresh) return null
  const res = await fetch(joinUrl('/auth/refresh/'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh })
  })
  if (!res.ok) {
    clearStoredTokens()
    return null
  }
  const data = await res.json()
  if (data.access) {
    storeTokens(data.access, data.refresh)
    return data.access
  }
  return null
}

export async function apiFetch(path: string, options: RequestInit = {}, useAuth = true, retry = true) {
  const headers = new Headers(options.headers || {})
  if (useAuth) {
    const token = getStoredAccessToken()
    if (token) headers.set('Authorization', `Bearer ${token}`)
  }
  const res = await fetch(joinUrl(path), { ...options, headers })
  if (res.status === 401 && useAuth && retry) {
    const refreshed = await refreshAccessToken()
    if (refreshed) {
      const retryHeaders = new Headers(options.headers || {})
      retryHeaders.set('Authorization', `Bearer ${refreshed}`)
      return fetch(joinUrl(path), { ...options, headers: retryHeaders })
    }
  }
  return res
}

export async function apiJson(path: string, options: RequestInit = {}, useAuth = true) {
  const res = await apiFetch(path, options, useAuth)
  const text = await res.text()
  let data: any = null
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = text
    }
  }
  if (!res.ok) {
    const message = data?.detail || data?.message || res.statusText || 'Request failed'
    throw new Error(message)
  }
  return data
}
