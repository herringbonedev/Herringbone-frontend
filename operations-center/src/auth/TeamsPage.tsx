import { useEffect, useMemo, useState } from "react"
import "./auth.css"

type TeamUser = {
  email: string
  role: string
}

const AUTH_URL = import.meta.env.VITE_AUTH_URL || "http://localhost:7001"

function roleLabel(role?: string) {
  const r = (role || "").toLowerCase()
  if (r === "admin") return "Admin"
  if (r === "analyst") return "Analyst"
  return role || "Unknown"
}

function roleClass(role?: string) {
  const r = (role || "").toLowerCase()
  if (r === "admin") return "tm-badge admin"
  if (r === "analyst") return "tm-badge analyst"
  return "tm-badge"
}

export default function TeamsPage() {
  const [users, setUsers] = useState<TeamUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [query, setQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState<"all" | "admin" | "analyst" | "other">("all")

  useEffect(() => {
    const token = localStorage.getItem("hb_token")
    if (!token) {
      setError("Not authenticated")
      setLoading(false)
      return
    }

    fetch(`${AUTH_URL}/herringbone/auth/users`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async res => {
        if (!res.ok) throw new Error(await res.text())
        return res.json()
      })
      .then(data => setUsers(data.users || []))
      .catch(err => setError(err.message || "Failed to load users"))
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return users.filter(u => {
      const emailOk = !q || (u.email || "").toLowerCase().includes(q)

      const r = (u.role || "").toLowerCase()
      const roleOk =
        roleFilter === "all" ||
        (roleFilter === "admin" && r === "admin") ||
        (roleFilter === "analyst" && r === "analyst") ||
        (roleFilter === "other" && r !== "admin" && r !== "analyst")

      return emailOk && roleOk
    })
  }, [users, query, roleFilter])

  return (
    <div className="tm-page">
      <div className="tm-header">
        <div>
          <h1 className="tm-title">Teams</h1>
          <div className="tm-subtitle">Users and roles for this workspace.</div>
        </div>
      </div>

      <div className="tm-card">
        <div className="tm-card-top">
          <div className="tm-controls">
            <div className="tm-control">
              <label className="tm-label">Search</label>
              <input
                className="tm-input"
                placeholder="Search by email…"
                value={query}
                onChange={e => setQuery(e.target.value)}
              />
            </div>

            <div className="tm-control">
              <label className="tm-label">Role</label>
              <select
                className="tm-select"
                value={roleFilter}
                onChange={e => setRoleFilter(e.target.value as any)}
              >
                <option value="all">All</option>
                <option value="admin">Admin</option>
                <option value="analyst">Analyst</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div className="tm-metrics">
            <div className="tm-metric">
              <div className="tm-metric-label">Total</div>
              <div className="tm-metric-value">{users.length}</div>
            </div>
            <div className="tm-metric">
              <div className="tm-metric-label">Showing</div>
              <div className="tm-metric-value">{filtered.length}</div>
            </div>
          </div>
        </div>

        {loading && <div className="tm-muted">Loading…</div>}

        {error && <div className="tm-error">{error}</div>}

        {!loading && !error && (
          <table className="tm-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Role</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u, i) => (
                <tr key={`${u.email}-${i}`}>
                  <td className="tm-mono">{u.email}</td>
                  <td>
                    <span className={roleClass(u.role)}>{roleLabel(u.role)}</span>
                  </td>
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={2} className="tm-empty">
                    No users found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
