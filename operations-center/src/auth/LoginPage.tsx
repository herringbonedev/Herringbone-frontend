import { useState } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import type { FormEvent, CSSProperties } from "react"

const AUTH_URL = import.meta.env.AUTH_ENABLED || "http://localhost:7001"

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
      const res = await fetch(`${AUTH_URL}/herringbone/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      })

      if (!res.ok) {
        const msg = await res.text()
        throw new Error(msg || "Login failed")
      }

      const data = await res.json()

      const token = data.access_token
      if (!token) throw new Error("Missing token")

      localStorage.setItem("hb_token", token)

      navigate(from, { replace: true })
    } catch (err: any) {
      setError(err.message || "Login failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.container}>
      <form onSubmit={submit} style={styles.card}>
        <h2 style={{ marginBottom: 12 }}>Herringbone Login</h2>

        {error && <div style={styles.error}>{error}</div>}

        <input
          style={styles.input}
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />

        <input
          style={styles.input}
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />

        <button style={styles.button} disabled={loading}>
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>
    </div>
  )
}

const styles: Record<string, CSSProperties> = {
  container: {
    display: "flex",
    height: "100vh",
    alignItems: "center",
    justifyContent: "center",
    background: "#0b0e14",
  },
  card: {
    width: 320,
    padding: 24,
    background: "#111827",
    borderRadius: 8,
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  input: {
    padding: 10,
    borderRadius: 4,
    border: "1px solid #333",
    background: "#0b0e14",
    color: "#fff",
  },
  button: {
    padding: 10,
    borderRadius: 4,
    border: "none",
    background: "#2563eb",
    color: "#fff",
    cursor: "pointer",
  },
  error: {
    background: "#7f1d1d",
    padding: 8,
    borderRadius: 4,
    color: "#fff",
  },
}