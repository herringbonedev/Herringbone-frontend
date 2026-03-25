<<<<<<< HEAD
const TOKEN_KEY = "hb_token"
=======
import { pushNotification } from "./notifications"

>>>>>>> c46d298 (update)
const CTX_KEY = "hb_context_id"
const CTX_TOKEN_KEY = "hb_context_token"

let contextTokenPromise: Promise<string | null> | null = null
let contextTokenPromiseContext: string | null = null

function readStorage(key: string): string | null {
  return localStorage.getItem(key)
}

function writeStorage(key: string, value: string) {
  localStorage.setItem(key, value)
}

function removeStorage(key: string) {
  localStorage.removeItem(key)
}

function dispatchContextChanged() {
  window.dispatchEvent(new Event("hb-context-changed"))
}

function decodeBase64Url(value: string): string {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/")
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4)
  return atob(padded)
}

function parseJwt(token: string | null): Record<string, unknown> | null {
  if (!token) return null

  try {
    const [, payload] = token.split(".")
    if (!payload) return null
    return JSON.parse(decodeBase64Url(payload))
  } catch {
    return null
  }
}

function isJwtExpired(token: string | null): boolean {
  const payload = parseJwt(token)
  if (!payload || typeof payload.exp !== "number") return true
  return Date.now() >= payload.exp * 1000
}

function tokenContextId(token: string | null): string | null {
  const payload = parseJwt(token)
  return typeof payload?.context_id === "string" ? payload.context_id : null
}

function clearInflightContextRequest() {
  contextTokenPromise = null
  contextTokenPromiseContext = null
}

function log(...args: any[]) {
  console.log("[HB API]", ...args)
}

export function getToken(): string | null {
  const token = readStorage(TOKEN_KEY)
  if (!token) return null
  if (isJwtExpired(token)) {
    removeStorage(TOKEN_KEY)
    clearContextState()
    return null
  }
  return token
}

export function getContextId(): string | null {
  return readStorage(CTX_KEY)
}

export function setContextId(contextId: string | null) {
  if (contextId) {
    writeStorage(CTX_KEY, contextId)
  } else {
    removeStorage(CTX_KEY)
  }

  const currentContextToken = readStorage(CTX_TOKEN_KEY)
  if (!contextId || tokenContextId(currentContextToken) !== contextId) {
    removeStorage(CTX_TOKEN_KEY)
  }

  clearInflightContextRequest()
  dispatchContextChanged()
}

export function getContextToken(): string | null {
  const selectedContext = getContextId()
  const token = readStorage(CTX_TOKEN_KEY)
  if (!token) return null
  if (isJwtExpired(token)) {
    removeStorage(CTX_TOKEN_KEY)
    clearInflightContextRequest()
    return null
  }
  if (!selectedContext) {
    removeStorage(CTX_TOKEN_KEY)
    clearInflightContextRequest()
    return null
  }
  if (tokenContextId(token) !== selectedContext) {
    removeStorage(CTX_TOKEN_KEY)
    clearInflightContextRequest()
    return null
  }
  return token
}

export function getActiveToken(): string | null {
  return getContextToken() || getToken()
}

export function clearToken() {
<<<<<<< HEAD
  removeStorage(TOKEN_KEY)
  removeStorage(CTX_TOKEN_KEY)
  removeStorage(CTX_KEY)
  clearInflightContextRequest()
  dispatchContextChanged()
}

export function clearContextState() {
  removeStorage(CTX_TOKEN_KEY)
  removeStorage(CTX_KEY)
  clearInflightContextRequest()
  dispatchContextChanged()
=======
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
>>>>>>> c46d298 (update)
}

function useBaseToken(path: string): boolean {
  return (
    path === "/herringbone/auth/login" ||
    path === "/herringbone/auth/context-token" ||
    path === "/herringbone/auth/enterprise/me"
  )
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

<<<<<<< HEAD
  if (!res.ok) {
    return null
  }
=======
  if (!res.ok) return null
>>>>>>> c46d298 (update)

  const data = await res.json()
  const token = data.access_token || data.token

  if (!token) return null
  if (tokenContextId(token) !== context) return null

  writeStorage(CTX_TOKEN_KEY, token)
  return token
}

async function ensureContextToken(forceRefresh = false): Promise<string | null> {
  const context = getContextId()
  const loginToken = getToken()

  if (!loginToken) return null
  if (!context) return null

  if (!forceRefresh) {
    const existing = getContextToken()
    if (existing) return existing
  } else {
<<<<<<< HEAD
    removeStorage(CTX_TOKEN_KEY)
  }

  if (contextTokenPromise && contextTokenPromiseContext === context) {
    return contextTokenPromise
  }

  clearInflightContextRequest()
  contextTokenPromiseContext = context
  contextTokenPromise = (async () => {
    try {
      const ctxToken = await requestContextToken(context, loginToken)
      if (!ctxToken) return null
      if (getContextId() !== context) return null
      return ctxToken
    } finally {
      clearInflightContextRequest()
    }
  })()
=======
    localStorage.removeItem(CTX_TOKEN_KEY)
  }

  if (contextTokenPromise) return contextTokenPromise

  contextTokenPromise = requestContextToken(context, loginToken)
    .catch(() => null)
    .finally(() => {
      contextTokenPromise = null
    })
>>>>>>> c46d298 (update)

  return contextTokenPromise
}

<<<<<<< HEAD
function buildHeaders(path: string, options: RequestInit, token: string | null) {
  const headers = new Headers(options.headers || undefined)
=======
function buildHeaders(path: string, token: string | null, hasBody: boolean) {
  const headers: Record<string, string> = {}
>>>>>>> c46d298 (update)

  if (token) {
    headers.set("Authorization", `Bearer ${token}`)
  } else {
    headers.delete("Authorization")
  }

<<<<<<< HEAD
  const context = getContextId()
  if (context && !useBaseToken(path)) {
    headers.set("X-Context-Id", context)
  } else {
    headers.delete("X-Context-Id")
  }

  if (options.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json")
  }

=======
  if (hasBody) {
    headers["Content-Type"] = "application/json"
  }

  if (!useBaseToken(path)) {
    const ctx = getContext()
    if (ctx) {
      headers["X-Herringbone-Context"] = ctx
    }
  }

>>>>>>> c46d298 (update)
  return headers
}

export async function apiFetch(path: string, options: RequestInit = {}) {
<<<<<<< HEAD
  const context = getContextId()
  const baseTokenMode = useBaseToken(path)

  let token: string | null
=======
  log("apiFetch", path)

  const context = getContext()
  const baseTokenMode = useBaseToken(path)

  let token: string | null = null

>>>>>>> c46d298 (update)
  if (baseTokenMode) {
    token = getToken()
  } else if (context) {
    token = await ensureContextToken()
    if (!token) {
      const deniedResponse = new Response("Context token unavailable", {
        status: 403,
        statusText: "Forbidden",
      })
      return deniedResponse
    }
  } else {
    token = getToken()
  }

<<<<<<< HEAD
=======
  // 🔥 CRITICAL FIX: ALWAYS serialize body correctly
  let body = options.body
  if (body && typeof body !== "string") {
    body = JSON.stringify(body)
  }

>>>>>>> c46d298 (update)
  let res = await fetch(path, {
    ...options,
    body,
    headers: buildHeaders(path, token, !!body),
  })

<<<<<<< HEAD
  if (res.status === 401 && !baseTokenMode && context) {
    try {
      const retryToken = await ensureContextToken(true)
      if (retryToken) {
        res = await fetch(path, {
          ...options,
          headers: buildHeaders(path, options, retryToken),
        })
      }
    } catch {
      removeStorage(CTX_TOKEN_KEY)
      clearInflightContextRequest()
    }
  }

  if (res.status === 401) {
    clearToken()
    redirectToLogin()
    throw new Error("Session expired")
  }

=======
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

  if (res.status === 401 && !baseTokenMode) {
    console.warn("[HB API] retrying with fresh context token")

    const retryToken = await ensureContextToken(true)

    if (retryToken) {
      res = await fetch(path, {
        ...options,
        body,
        headers: buildHeaders(path, retryToken, !!body),
      })
    }
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

>>>>>>> c46d298 (update)
  return res
}