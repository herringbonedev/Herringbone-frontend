import { Navigate, useLocation } from "react-router-dom"
import type { ReactNode } from "react"
import { clearToken, getToken } from "../api"
import { isJwtExpired } from "./jwt"

type Props = {
  children: ReactNode
}

export default function RequireAuth({ children }: Props) {
  const location = useLocation()
  const token = getToken()

  if (!token || isJwtExpired(token)) {
    clearToken()
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <>{children}</>
}
