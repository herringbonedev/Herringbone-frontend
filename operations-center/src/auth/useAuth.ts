import { useEffect, useState } from "react"
import { getUserFromToken, type UserInfo } from "./jwt"

export function useAuth() {
  const [user, setUser] = useState<UserInfo | null>(null)

  useEffect(() => {
    setUser(getUserFromToken())
  }, [])

  return user
}
