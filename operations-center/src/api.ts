import { pushNotification } from "./notifications"

const CTX_KEY = "hb_context_id"
const CTX_TOKEN_KEY = "hb_context_token"

let contextTokenPromise: Promise<string | null> | null = null

function log(...args: any[]) {
  console.log("[HB API]", ...args)
}

export function getToken(): string | null {
  return localStorage.getItem("hb_token")
}

export function getContextToken(): string | null {
  return localStorage.getItem(CTX_TOKEN_KEY)
}

export function clearToken() {
  console.error("[HB API] CLEAR TOKEN CALLED")
  console.trace()

  localStorage.removeItem("hb_token")
  localStorage.removeItem(CTX_TOKEN_KEY)
  localStorage.removeItem(CTX_KEY)
  contextTokenPromise = null
  window.dispatchEvent(new Event("hb-context-changed"))
}

export function clearContextState() {
  console.warn("[HB API] clearContextState")

  localStorage.removeItem(CTX_TOKEN_KEY)
  localStorage.removeItem(CTX_KEY)
  contextTokenPromise = null
  window.dispatchEvent(new Event("hb-context-changed"))
}

function getContext(): string | null {
  return localStorage.getItem(CTX_KEY)
}

function useBaseToken(path: string): boolean {
  return (
    path === "/herringbone/auth/login" ||
    path === "/herringbone/auth/context-token" ||
    path === "/herringbone/auth/enterprise/me"
  )
}

function redirectToLogin() {
  console.warn("[HB API] redirectToLogin")

  if (window.location.pathname === "/login") return
  setTimeout(() => {
    window.location.replace("/login")
  }, 0)
}

async function requestContextToken(context: string, loginToken: string): Promise<string | null> {
  log("requestContextToken", context)

  const res = await fetch("/herringbone/auth/context-token", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${loginToken}`,
      "X-Herringbone-Context": context,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ context_id: context }),
  })

  log("context-token status", res.status)

  if (!res.ok) return null

  const data = await res.json()
  const token = data.access_token || data.token

  if (!token) return null

  localStorage.setItem(CTX_TOKEN_KEY, token)
  return token
}

async function ensureContextToken(forceRefresh = false): Promise<string | null> {
  const context = getContext()
  const loginToken = getToken()

  if (!loginToken) return null
  if (!context) return loginToken

  if (!forceRefresh) {
    const existing = getContextToken()
    if (existing) return existing
  } else {
    localStorage.removeItem(CTX_TOKEN_KEY)
  }

  if (contextTokenPromise) return contextTokenPromise

  contextTokenPromise = requestContextToken(context, loginToken)
    .catch(() => null)
    .finally(() => {
      contextTokenPromise = null
    })

  return contextTokenPromise
}

function buildHeaders(path: string, token: string | null, hasBody: boolean) {
  const headers: Record<string, string> = {}

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  if (hasBody) {
    headers["Content-Type"] = "application/json"
  }

  if (!useBaseToken(path)) {
    const ctx = getContext()
    if (ctx) {
      headers["X-Herringbone-Context"] = ctx
    }
  }

  return headers
}

export async function apiFetch(path: string, options: RequestInit = {}) {
  log("apiFetch", path)

  const context = getContext()
  const baseTokenMode = useBaseToken(path)

  let token: string | null = null

  if (baseTokenMode) {
    token = getToken()
  } else if (context) {
    token = await ensureContextToken()
    if (!token) token = getToken()
  } else {
    token = getToken()
  }

  // 🔥 CRITICAL FIX: ALWAYS serialize body correctly
  let body = options.body
  if (body && typeof body !== "string") {
    body = JSON.stringify(body)
  }

  let res = await fetch(path, {
    ...options,
    body,
    headers: buildHeaders(path, token, !!body),
  })

  log("response", path, res.status)

  if (res.status === 401 && !baseTokenMode) {
    const retryToken = await ensureContextToken(true)

    if (retryToken) {
      res = await fetch(path, {
        ...options,
        body,
        headers: buildHeaders(path, retryToken, !!body),
      })
    }
  }

  if (res.status === 401) {
    clearToken()
    redirectToLogin()
    throw new Error("Session expired")
  }

  if (res.status === 403) {
    let message = "Insufficient permissions"

    try {
      const data = await res.clone().json()
      if (data?.detail) message = data.detail
    } catch {}

    pushNotification({
      type: "error",
      message,
    })

    return res
  }

  return res
}