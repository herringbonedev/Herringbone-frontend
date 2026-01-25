import { useEffect, useState } from "react"

type TeamUser = {
  email: string
  role: string
}

const AUTH_URL = import.meta.env.VITE_AUTH_URL || "http://localhost:7001"
const AUTH_ENABLED = import.meta.env.VITE_AUTH_ENABLED === "true"

export default function TeamsPage() {
  const [users, setUsers] = useState<TeamUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!AUTH_ENABLED) return

    const token = localStorage.getItem("hb_token")
    if (!token) {
      setError("Not authenticated")
      setLoading(false)
      return
    }

    fetch(`${AUTH_URL}/herringbone/auth/users`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then(async res => {
        if (!res.ok) {
          throw new Error(await res.text())
        }
        return res.json()
      })
      .then(data => {
        setUsers(data.users || [])
      })
      .catch(err => {
        setError(err.message || "Failed to load users")
      })
      .finally(() => setLoading(false))
  }, [])

  if (!AUTH_ENABLED) {
    return (
      <div style={{ padding: 24 }}>
        <h2>Teams</h2>
        <p style={{ color: "#888" }}>Authentication is disabled.</p>
      </div>
    )
  }

  return (
    <div style={{ padding: 24 }}>
      <h2>Teams</h2>

      {loading && <p>Loading…</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      {!loading && !error && (
        <table
          style={{
            marginTop: 12,
            borderCollapse: "collapse",
            width: "100%",
            maxWidth: 600,
          }}
        >
          <thead>
            <tr>
              <th style={th}>Email</th>
              <th style={th}>Role</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u, i) => (
              <tr key={i}>
                <td style={td}>{u.email}</td>
                <td style={td}>{u.role}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

const th: React.CSSProperties = {
  textAlign: "left",
  borderBottom: "1px solid #333",
  padding: "6px 8px",
}

const td: React.CSSProperties = {
  borderBottom: "1px solid #222",
  padding: "6px 8px",
}
