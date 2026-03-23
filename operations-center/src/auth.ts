import { clearToken, getToken } from "./api"
import { isJwtExpired } from "./auth/jwt"

export function isAuthenticated(): boolean {
  const token = getToken()
  if (!token) return false

  if (isJwtExpired(token)) {
    clearToken()
    return false
  }

  return true
}
