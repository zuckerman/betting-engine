/**
 * Betfair Session Token Manager
 *
 * Handles login + automatic token refresh.
 * Tokens expire after 24h inactivity — this keeps them alive.
 *
 * Uses Betfair's Identity SSO (username/password non-interactive login).
 * For production with certificate login, swap the login endpoint.
 */

const LOGIN_URL = 'https://identitysso.betfair.com/api/login'
const KEEP_ALIVE_URL = 'https://identitysso.betfair.com/api/keepAlive'

// Token cached in memory across requests (per serverless instance)
let cachedToken: string | null = null
let tokenExpiry: number = 0
const TOKEN_TTL_MS = 6 * 60 * 60 * 1000 // refresh every 6h (well within 24h limit)

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Get a valid session token, logging in or refreshing as needed.
 * Safe to call on every request — uses cache when token is fresh.
 */
export async function getBetfairToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken
  }
  return refreshToken()
}

/**
 * Build Betfair API request headers using a fresh token.
 */
export async function getBetfairHeaders(): Promise<Record<string, string>> {
  const token = await getBetfairToken()
  return {
    'X-Application': process.env.BETFAIR_APP_KEY!,
    'X-Authentication': token,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }
}

export function isBetfairConfigured(): boolean {
  return !!(
    process.env.BETFAIR_APP_KEY &&
    process.env.BETFAIR_USERNAME &&
    process.env.BETFAIR_PASSWORD
  )
}

// ============================================================================
// INTERNAL
// ============================================================================

async function refreshToken(): Promise<string> {
  const appKey = process.env.BETFAIR_APP_KEY
  const username = process.env.BETFAIR_USERNAME
  const password = process.env.BETFAIR_PASSWORD

  if (!appKey || !username || !password) {
    throw new Error('Missing Betfair credentials: BETFAIR_APP_KEY, BETFAIR_USERNAME, BETFAIR_PASSWORD')
  }

  // Try keep-alive first if we have an existing token
  if (cachedToken) {
    try {
      const ka = await fetch(KEEP_ALIVE_URL, {
        method: 'GET',
        headers: {
          'X-Application': appKey,
          'X-Authentication': cachedToken,
          Accept: 'application/json',
        },
      })
      const kaData = await ka.json()
      if (kaData.status === 'SUCCESS') {
        tokenExpiry = Date.now() + TOKEN_TTL_MS
        return cachedToken
      }
    } catch {
      // Keep-alive failed — fall through to full login
    }
  }

  // Full login
  const body = new URLSearchParams({ username, password })
  const res = await fetch(LOGIN_URL, {
    method: 'POST',
    headers: {
      'X-Application': appKey,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: body.toString(),
  })

  if (!res.ok) {
    throw new Error(`Betfair login HTTP error: ${res.status}`)
  }

  const data = await res.json()

  if (data.status !== 'SUCCESS' || !data.token) {
    throw new Error(`Betfair login failed: ${data.error || data.status}`)
  }

  cachedToken = data.token
  tokenExpiry = Date.now() + TOKEN_TTL_MS

  console.log('[BetfairAuth] Token refreshed successfully')
  return cachedToken
}
