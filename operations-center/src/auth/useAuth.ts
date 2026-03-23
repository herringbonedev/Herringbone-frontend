import { useEffect, useState } from "react"
import { getUserFromToken, type UserInfo } from "./jwt"

export function useAuth() {
  const [user, setUser] = useState<UserInfo | null>(null)

  useEffect(() => {
    function refresh() {
      setUser(getUserFromToken())
    }

    refresh()

    window.addEventListener("hb-context-changed", refresh)
    window.addEventListener("storage", refresh)

    return () => {
      window.removeEventListener("hb-context-changed", refresh)
      window.removeEventListener("storage", refresh)
    }
  }, [])

  return user
}