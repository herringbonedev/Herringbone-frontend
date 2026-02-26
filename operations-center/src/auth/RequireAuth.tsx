import { Navigate, useLocation } from "react-router-dom"
import type { ReactNode } from "react"

type Props = {
  children: ReactNode
}

function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]))
    return Date.now() >= payload.exp * 1000
  } catch {
    return true
  }
}

export default function RequireAuth({ children }: Props) {
  const location = useLocation()

  const token = localStorage.getItem("hb_token")

  if (!token || isTokenExpired(token)) {
    localStorage.removeItem("hb_token")
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <>{children}</>
}