export function getToken(): string | null {
  return localStorage.getItem("hb_token")
}

function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]))
    return Date.now() >= payload.exp * 1000
  } catch {
    return true
  }
}

export function isAuthenticated(): boolean {
  const token = getToken()
  if (!token) return false

  if (isTokenExpired(token)) {
    localStorage.removeItem("hb_token")
    return false
  }

  return true
}