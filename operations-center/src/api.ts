const CTX_KEY = "hb_context_id"
const CTX_TOKEN_KEY = "hb_context_token"

let contextTokenPromise: Promise<string | null> | null = null

export function getToken(): string | null {
  return localStorage.getItem("hb_token")
}

export function getContextToken(): string | null {
  return localStorage.getItem(CTX_TOKEN_KEY)
}

export function clearToken() {
  localStorage.removeItem("hb_token")
  localStorage.removeItem(CTX_TOKEN_KEY)
  localStorage.removeItem(CTX_KEY)
  contextTokenPromise = null
  window.dispatchEvent(new Event("hb-context-changed"))
}

export function clearContextState() {
  localStorage.removeItem(CTX_TOKEN_KEY)
  localStorage.removeItem(CTX_KEY)
  contextTokenPromise = null
  window.dispatchEvent(new Event("hb-context-changed"))
}

function getContext(): string | null {
  return localStorage.getItem(CTX_KEY)
}

function useBaseToken(path: string): boolean {
  return path === "/herringbone/auth/login" || path === "/herringbone/auth/context-token" || path === "/herringbone/auth/enterprise/me"
}

function redirectToLogin() {
  if (window.location.pathname === "/login") return
  setTimeout(() => {
    if (window.location.pathname !== "/login") {
      window.location.replace("/login")
    }
  }, 0)
}

async function requestContextToken(context: string, loginToken: string): Promise<string> {
  const res = await fetch("/herringbone/auth/context-token", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${loginToken}`,
      "X-Context-Id": context,
    },
  })
  if (res.status === 401) {
    throw new Error("Session expired")
  }
  if (res.status === 403 || res.status === 404) {
    localStorage.removeItem(CTX_TOKEN_KEY)
    throw new Error("Forbidden")
  }
  if (!res.ok) {
    throw new Error("Failed to obtain context token")
  }
  const data = await res.json()
  const token = data.access_token || data.token
  if (!token) {
    throw new Error("Missing context token")
  }
  localStorage.setItem(CTX_TOKEN_KEY, token)
  return token
}

async function ensureContextToken(forceRefresh = false): Promise<string | null> {
  const context = getContext()
  if (!context) return null
  const loginToken = getToken()
  if (!loginToken) return null
  if (forceRefresh) {
    localStorage.removeItem(CTX_TOKEN_KEY)
  } else {
    const existing = getContextToken()
    if (existing) return existing
  }
  if (contextTokenPromise) {
    return contextTokenPromise
  }
  contextTokenPromise = (async () => {
    try {
      return await requestContextToken(context, loginToken)
    } finally {
      contextTokenPromise = null
    }
  })()
  return contextTokenPromise
}

function buildHeaders(path: string, options: RequestInit, token: string | null) {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> | undefined),
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }
  const context = getContext()
  if (context && !useBaseToken(path)) {
    headers["X-Context-Id"] = context
  }
  if (options.body !== undefined && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json"
  }
  return headers
}

export async function apiFetch(path: string, options: RequestInit = {}) {
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
  let res = await fetch(path, {
    ...options,
    headers: buildHeaders(path, options, token),
  })
  if (res.status === 401 && context && !baseTokenMode) {
    try {
      const retryToken = await ensureContextToken(true)
      if (retryToken) {
        res = await fetch(path, {
          ...options,
          headers: buildHeaders(path, options, retryToken),
        })
      }
    } catch {
      localStorage.removeItem(CTX_TOKEN_KEY)
      contextTokenPromise = null
    }
  }
  if (res.status === 401) {
    clearToken()
    redirectToLogin()
    throw new Error("Session expired")
  }
  if (res.status === 403) {
    throw new Error("Forbidden")
  }
  return res
}
