import { Navigate, useLocation } from "react-router-dom"
import type { ReactNode } from "react"

const AUTH_ENABLED = import.meta.env.AUTH_ENABLED === "true"

type Props = {
  children: ReactNode
}

export default function RequireAuth({ children }: Props) {
  const location = useLocation()

  if (!AUTH_ENABLED) {
    return <>{children}</>
  }

  const token = localStorage.getItem("hb_token")

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <>{children}</>
}
