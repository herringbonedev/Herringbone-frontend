import { pushNotification } from "./notifications"

const CTX_KEY = "hb_context_id"
const CTX_TOKEN_KEY = "hb_context_token"

let contextTokenPromise: Promise<string | null> | null = null

function log(...args: any[]) {
  console.log("Herringbone:", ...args)
}

function decode(token: string | null): any | null {
  if (!token) return null
  try {
    return JSON.parse(atob(token.split(".")[1]))
  } catch {
    return null
  }
}

export function getToken(): string | null {
  return localStorage.getItem("hb_token")
}

export function getContextToken(): string | null {
  return localStorage.getItem(CTX_TOKEN_KEY)
}

export function clearToken() {
  console.error("Herringbone: CLEAR TOKEN CALLED")
  console.trace()

  localStorage.removeItem("hb_token")
  localStorage.removeItem(CTX_TOKEN_KEY)
  localStorage.removeItem(CTX_KEY)
  contextTokenPromise = null
  window.dispatchEvent(new Event("hb-context-changed"))
}

export function clearContextState() {
  console.warn("Herringbone: clearContextState")

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
  console.warn("Herringbone: redirectToLogin")

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
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ context_id: context }),
  })

  log("context-token status", res.status)

  if (!res.ok) return null

  const data = await res.json()
  const token = data.access_token || data.token

  if (!token) return null

  const decoded = decode(token)

  if (decoded?.context_id !== context) {
    console.error("Herringbone: received context token for wrong context", {
      expected_context: context,
      token_context: decoded?.context_id,
    })
    return null
  }

  localStorage.setItem(CTX_TOKEN_KEY, token)
  return token
}

async function ensureContextToken(forceRefresh = false): Promise<string | null> {
  const context = getContext()
  const loginToken = getToken()

  if (!loginToken) return null
  if (!context) return loginToken

  const existing = getContextToken()

  if (!forceRefresh && existing) {
    const decoded = decode(existing)

    if (decoded?.context_id === context) {
      return existing
    }

    console.warn("Herringbone: context mismatch → dropping stale token", {
      token_context: decoded?.context_id,
      current_context: context,
    })

    localStorage.removeItem(CTX_TOKEN_KEY)
  }

  if (forceRefresh) {
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

function hasJsonBody(body: BodyInit | null | undefined): boolean {
  if (!body) return false
  if (typeof body === "string") return true
  if (body instanceof FormData) return false
  if (body instanceof URLSearchParams) return false
  if (body instanceof Blob) return false
  if (body instanceof ArrayBuffer) return false
  return true
}

function normalizeBody(body: BodyInit | null | undefined): BodyInit | null | undefined {
  if (!body) return body
  if (typeof body === "string") return body
  if (body instanceof FormData) return body
  if (body instanceof URLSearchParams) return body
  if (body instanceof Blob) return body
  if (body instanceof ArrayBuffer) return body
  return JSON.stringify(body)
}

function buildHeaders(
  token: string | null,
  body: BodyInit | null | undefined,
  existingHeaders?: HeadersInit,
) {
  const headers = new Headers(existingHeaders || {})

  if (token) {
    headers.set("Authorization", `Bearer ${token}`)
  }

  if (hasJsonBody(body) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json")
  }

  headers.delete("X-Herringbone-Context")
  headers.delete("X-Herringbone-Org")

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

    if (!token) {
      console.warn("Herringbone: no context token → forcing refresh")

      token = await ensureContextToken(true)

      if (!token) {
        console.error("Herringbone: failed to obtain context token → blocking request")
        throw new Error("Context not ready")
      }
    }
  } else {
    token = getToken()
  }

  const body = normalizeBody(options.body)

  let res = await fetch(path, {
    ...options,
    body,
    headers: buildHeaders(token, body, options.headers),
  })

  log("response", path, res.status)

  if (res.status === 401 && !baseTokenMode) {
    console.warn("Herringbone: retrying with fresh context token")

    const retryToken = await ensureContextToken(true)

    if (retryToken) {
      res = await fetch(path, {
        ...options,
        body,
        headers: buildHeaders(retryToken, body, options.headers),
      })
    }
  }

  if (res.status === 401) {
    if (baseTokenMode) {
      console.error("Herringbone: BASE TOKEN INVALID → logging out")

      clearToken()
      redirectToLogin()
      throw new Error("Session expired")
    }

    console.warn("Herringbone: 401 on non-base request → not logging out", {
      path,
      context,
    })

    return res
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

window.addEventListener("hb-context-changed", () => {
  console.log("Herringbone: context changed → clearing token cache")
  contextTokenPromise = null
})