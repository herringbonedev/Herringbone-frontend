import { useState } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import type { FormEvent } from "react"
import { apiFetch, clearContextState } from "../api"
import "../styles/ui.css"

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as any)?.from?.pathname || "/"
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      clearContextState()
      localStorage.removeItem("hb_token")
      const res = await apiFetch("/herringbone/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      })
      if (!res.ok) {
        const msg = await res.text()
        throw new Error(msg || "Login failed")
      }
      const data = await res.json()
      const token = data.access_token || data.token
      if (!token) throw new Error("Missing token")
      localStorage.setItem("hb_token", token)
      localStorage.removeItem("hb_context_token")
      localStorage.removeItem("hb_context_id")
      window.dispatchEvent(new Event("hb-context-changed"))
      navigate(from, { replace: true })
    } catch (err: any) {
      setError(err.message || "Login failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="hb-page-center">
      <div className="hb-login-container">
        <form onSubmit={submit} className="hb-card hb-login-card">
          <div className="hb-card-title">Sign In</div>
          <div className="hb-subtitle">Herringbone Operations Center</div>
          {error && <div className="hb-alert-error">{error}</div>}
          <div className="hb-form">
            <input className="hb-input" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <input className="hb-input" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <button className="hb-button-primary" disabled={loading} type="submit">
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
