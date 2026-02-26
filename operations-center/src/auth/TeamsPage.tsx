import { useEffect, useMemo, useState } from "react"
import "./auth.css"
import { apiFetch } from "../api"

type TeamUser = {
  email: string
  role: string
}

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

  // NEW: create user form state
  const [newEmail, setNewEmail] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [creating, setCreating] = useState(false)

  const token = localStorage.getItem("hb_token")

  async function loadUsers() {
    if (!token) {
      setError("Not authenticated")
      setLoading(false)
      return
    }

    try {
      const res = await apiFetch(`/herringbone/auth/users`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      setUsers(data.users || [])
    } catch (e: any) {
      setError(e.message || "Failed to load users")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
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

  async function changeRole(email: string, role: string) {
    setError(null)

    try {
      const res = await apiFetch(`/herringbone/auth/users/role`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, role }),
      })

      if (!res.ok) throw new Error(await res.text())

      await loadUsers()
    } catch (e: any) {
      setError(e.message || "Failed to update role")
    }
  }

  async function deleteUser(email: string) {
    setError(null)

    const ok = window.confirm(`Delete user "${email}"?\n\nThis cannot be undone.`)
    if (!ok) return

    try {
      const res = await apiFetch(`/herringbone/auth/users`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      })

      if (!res.ok) throw new Error(await res.text())

      await loadUsers()
    } catch (e: any) {
      setError(e.message || "Failed to delete user")
    }
  }

  // NEW: create user
  async function createUser() {
    if (!newEmail || !newPassword) {
      setError("Email and password required")
      return
    }

    setCreating(true)
    setError(null)

    try {
      const res = await apiFetch(`/herringbone/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: newEmail,
          password: newPassword,
        }),
      })

      if (!res.ok) throw new Error(await res.text())

      setNewEmail("")
      setNewPassword("")
      await loadUsers()
    } catch (e: any) {
      setError(e.message || "Failed to create user")
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="tm-page">
      <div className="tm-header">
        <div>
          <h1 className="tm-title">Teams</h1>
          <div className="tm-subtitle">Users and roles for this workspace.</div>
        </div>

        <div className="tm-actions">
          <button className="tm-secondary" onClick={loadUsers} disabled={loading}>
            Refresh
          </button>
        </div>
      </div>

      {/* NEW: Create user card */}
      <div className="tm-card" style={{ marginBottom: 16 }}>
        <div className="tm-card-top">
          <strong>Create user</strong>
        </div>

        <div className="tm-controls">
          <div className="tm-control">
            <label className="tm-label">Email</label>
            <input
              className="tm-input"
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              placeholder="user@example.com"
            />
          </div>

          <div className="tm-control">
            <label className="tm-label">Password</label>
            <input
              className="tm-input"
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="Minimum 8 characters"
            />
          </div>

          <div className="tm-control" style={{ alignSelf: "flex-end" }}>
            <button
              className="tm-primary"
              onClick={createUser}
              disabled={creating}
            >
              {creating ? "Creating…" : "Create user"}
            </button>
          </div>
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
        </div>

        {loading && <div className="tm-muted">Loading…</div>}
        {error && <div className="tm-error">{error}</div>}

        {!loading && !error && (
          <table className="tm-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Role</th>
                <th style={{ width: 240 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u, i) => (
                <tr key={`${u.email}-${i}`}>
                  <td className="tm-mono">{u.email}</td>
                  <td>
                    <span className={roleClass(u.role)}>{roleLabel(u.role)}</span>
                  </td>
                  <td style={{ display: "flex", gap: 8 }}>
                    <select
                      className="tm-select tm-small"
                      value={u.role}
                      onChange={e => changeRole(u.email, e.target.value)}
                    >
                      <option value="admin">Admin</option>
                      <option value="analyst">Analyst</option>
                    </select>

                    <button
                      className="tm-btn-danger"
                      onClick={() => deleteUser(u.email)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={3} className="tm-empty">
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
