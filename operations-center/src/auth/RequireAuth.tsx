import { Navigate, useLocation } from "react-router-dom"
import type { ReactNode } from "react"

type Props = {
  children: ReactNode
}

export default function RequireAuth({ children }: Props) {
  const location = useLocation()

  const token = localStorage.getItem("hb_token")

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <>{children}</>
}
