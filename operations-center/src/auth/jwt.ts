export type UserInfo = {
  id: string
  email?: string
  scopes: string[]
}

export function getUserFromToken(): UserInfo | null {
  const token = localStorage.getItem("hb_token")
  if (!token) return null

  try {
    const [, payload] = token.split(".")
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"))
    const data = JSON.parse(json)

    return {
      id: data.sub,
      email: data.email,
      scopes: data.scopes || [],
    }
  } catch {
    return null
  }
}