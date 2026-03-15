import { useEffect, useMemo, useState } from "react"
import "./auth.css"
import { apiFetch } from "../api"

type TeamUser = {
  email: string
  scopes: string[]
}

function normalizeScopes(value: string): string[] {
  return Array.from(
    new Set(
      value
        .split(",")
        .map(s => s.trim())
        .filter(Boolean)
    )
  )
}

function scopesToText(scopes?: string[]) {
  return (scopes || []).join(", ")
}

function userBadge(scopes?: string[]) {
  const s = scopes || []

  if (s.includes("*")) {
    return {
      label: "Platform Admin",
      className: "tm-badge admin",
    }
  }

  if (s.length > 0) {
    return {
      label: "Scoped User",
      className: "tm-badge analyst",
    }
  }

  return {
    label: "No Scopes",
    className: "tm-badge",
  }
}

export default function TeamsPage() {
  const [users, setUsers] = useState<TeamUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [query, setQuery] = useState("")
  const [scopeFilter, setScopeFilter] = useState("")

  const [newEmail, setNewEmail] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [creating, setCreating] = useState(false)

  const [editingScopes, setEditingScopes] = useState<Record<string, string>>({})
  const [savingUser, setSavingUser] = useState<string | null>(null)

  const token = localStorage.getItem("hb_token")

  async function loadUsers() {
    if (!token) {
      setError("Not authenticated")
      setLoading(false)
      return
    }

    try {
      setError(null)

      const res = await apiFetch(`/herringbone/auth/users`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!res.ok) throw new Error(await res.text())

      const data = await res.json()
      const nextUsers: TeamUser[] = data.users || []

      setUsers(nextUsers)

      const nextEditing: Record<string, string> = {}
      for (const u of nextUsers) {
        nextEditing[u.email] = scopesToText(u.scopes)
      }
      setEditingScopes(nextEditing)
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
    const sf = scopeFilter.trim().toLowerCase()

    return users.filter(u => {
      const emailOk = !q || (u.email || "").toLowerCase().includes(q)

      const joinedScopes = (u.scopes || []).join(" ").toLowerCase()
      const scopeOk = !sf || joinedScopes.includes(sf)

      return emailOk && scopeOk
    })
  }, [users, query, scopeFilter])

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

  async function saveScopes(email: string) {
    setSavingUser(email)
    setError(null)

    try {
      const scopes = normalizeScopes(editingScopes[email] || "")

      const res = await apiFetch(`/herringbone/auth/users/scopes`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, scopes }),
      })

      if (!res.ok) throw new Error(await res.text())

      await loadUsers()
    } catch (e: any) {
      setError(e.message || "Failed to update scopes")
    } finally {
      setSavingUser(null)
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

  return (
    <div className="tm-page">
      <div className="tm-header">
        <div>
          <h1 className="tm-title">Teams</h1>
          <div className="tm-subtitle">Users and scopes for this workspace.</div>
        </div>

        <div className="tm-actions">
          <button className="tm-secondary" onClick={loadUsers} disabled={loading}>
            Refresh
          </button>
        </div>
      </div>

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
              {creating ? "Creating..." : "Create user"}
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
                placeholder="Search by email..."
                value={query}
                onChange={e => setQuery(e.target.value)}
              />
            </div>

            <div className="tm-control">
              <label className="tm-label">Scope filter</label>
              <input
                className="tm-input"
                placeholder="Filter by scope..."
                value={scopeFilter}
                onChange={e => setScopeFilter(e.target.value)}
              />
            </div>
          </div>
        </div>

        {loading && <div className="tm-muted">Loading...</div>}
        {error && <div className="tm-error">{error}</div>}

        {!loading && !error && (
          <table className="tm-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Access</th>
                <th>Scopes</th>
                <th style={{ width: 320 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u, i) => {
                const badge = userBadge(u.scopes)

                return (
                  <tr key={`${u.email}-${i}`}>
                    <td className="tm-mono">{u.email}</td>
                    <td>
                      <span className={badge.className}>{badge.label}</span>
                    </td>
                    <td>
                      <input
                        className="tm-input"
                        value={editingScopes[u.email] ?? ""}
                        onChange={e =>
                          setEditingScopes(prev => ({
                            ...prev,
                            [u.email]: e.target.value,
                          }))
                        }
                        placeholder="logs:read, search:query"
                      />
                    </td>
                    <td style={{ display: "flex", gap: 8 }}>
                      <button
                        className="tm-secondary"
                        onClick={() => saveScopes(u.email)}
                        disabled={savingUser === u.email}
                      >
                        {savingUser === u.email ? "Saving..." : "Save scopes"}
                      </button>

                      <button
                        className="tm-btn-danger"
                        onClick={() => deleteUser(u.email)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                )
              })}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="tm-empty">
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