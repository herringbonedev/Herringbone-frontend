export type UserInfo = {
  id: string
  email?: string
}

export type JwtPayload = {
  sub?: string
  email?: string
  exp?: number
  [key: string]: unknown
}

function decodeBase64Url(value: string): string {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/")
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4)
  return atob(padded)
}

export function parseJwt(token: string | null): JwtPayload | null {
  if (!token) return null

  try {
    const [, payload] = token.split(".")
    if (!payload) return null
    return JSON.parse(decodeBase64Url(payload))
  } catch {
    return null
  }
}

export function isJwtExpired(token: string | null): boolean {
  const payload = parseJwt(token)
  if (!payload || typeof payload.exp !== "number") return true
  return Date.now() >= payload.exp * 1000
}

export function getUserFromToken(): UserInfo | null {
  const data = parseJwt(localStorage.getItem("hb_token"))
  if (!data?.sub) return null

  return {
    id: data.sub,
    email: typeof data.email === "string" ? data.email : undefined,
  }
}
