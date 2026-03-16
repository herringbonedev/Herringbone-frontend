import { Fragment, useEffect, useMemo, useState } from "react"
import { apiFetch } from "../api"
import "../styles/ui.css"

type TeamUser = {
  email: string
  scopes: string[]
}

type ScopeItem = {
  scope: string
  category: string
  action: string
  description: string
  tier: string
  ui_group: string
  order: number
}

function normalizeScopes(raw: unknown): ScopeItem[] {
  if (!Array.isArray(raw)) return []

  return raw
    .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
    .map((item) => ({
      scope: typeof item.scope === "string" ? item.scope : "",
      category: typeof item.category === "string" ? item.category : "other",
      action: typeof item.action === "string" ? item.action : "",
      description: typeof item.description === "string" ? item.description : "",
      tier: typeof item.tier === "string" ? item.tier : "free",
      ui_group: typeof item.ui_group === "string" ? item.ui_group : "General",
      order: typeof item.order === "number" ? item.order : 0,
    }))
    .filter((s) => s.scope.length > 0)
}

function groupScopes(items: ScopeItem[]) {
  const groups: Record<string, ScopeItem[]> = {}

  for (const item of items) {
    const group = item.ui_group || "General"
    if (!groups[group]) groups[group] = []
    groups[group].push(item)
  }

  return Object.entries(groups)
    .map(([group, values]) => [
      group,
      [...values].sort((a, b) => a.order - b.order),
    ] as const)
    .sort(([a], [b]) => a.localeCompare(b))
}

export default function TeamsPage() {
  const [users, setUsers] = useState<TeamUser[]>([])
  const [scopes, setScopes] = useState<ScopeItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function loadUsers() {
    try {
      const res = await apiFetch("/herringbone/auth/users")
      if (!res.ok) throw new Error(await res.text())

      const data = await res.json()
      setUsers(Array.isArray(data.users) ? data.users : [])
    } catch (err: any) {
      setError(err.message || "Failed to load users")
    } finally {
      setLoading(false)
    }
  }

  async function loadScopes() {
    try {
      const res = await apiFetch("/herringbone/auth/scopes")
      if (!res.ok) throw new Error(await res.text())

      const data = await res.json()
      setScopes(normalizeScopes(data.scopes))
    } catch (err: any) {
      setError(err.message || "Failed to load scopes")
    }
  }

  useEffect(() => {
    void loadUsers()
    void loadScopes()
  }, [])

  return (
    <div className="hb-page" style={{ width: "100%", maxWidth: "none" }}>
      <div className="hb-header">
        <div>
          <h1 className="hb-title">Team</h1>
          <div className="hb-subtitle">Users and permissions for this workspace</div>
        </div>
      </div>

      {error && <div className="hb-alert-error">{error}</div>}

      <CreateUserCard onCreated={loadUsers} />

      <UsersSection
        users={users}
        scopes={scopes}
        loading={loading}
        onChange={loadUsers}
      />
    </div>
  )
}

function CreateUserCard({ onCreated }: { onCreated: () => void }) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  async function create() {
    setLoading(true)

    const res = await apiFetch("/herringbone/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    })

    setLoading(false)

    if (!res.ok) {
      alert("Failed to create user")
      return
    }

    setEmail("")
    setPassword("")
    onCreated()
  }

  return (
    <div className="hb-card" style={{ marginBottom: 20 }}>
      <div className="hb-card-title">Create User</div>

      <div style={{ display: "flex", gap: 12 }}>
        <input
          className="hb-input"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          className="hb-input"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          className="hb-button-primary"
          onClick={create}
          disabled={!email || !password || loading}
        >
          {loading ? "Creating..." : "Create User"}
        </button>
      </div>
    </div>
  )
}

function UsersSection({
  users,
  scopes,
  loading,
  onChange,
}: {
  users: TeamUser[]
  scopes: ScopeItem[]
  loading: boolean
  onChange: () => void
}) {
  const [expandedUser, setExpandedUser] = useState<string | null>(null)

  if (loading) return <div className="hb-empty">Loading users...</div>

  return (
    <div className="hb-card">
      <div className="hb-card-title">Team Members</div>

      <div className="hb-table-wrapper">
        <table className="hb-table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Scopes</th>
              <th style={{ width: 220 }}>Actions</th>
            </tr>
          </thead>

          <tbody>
            {users.map((user) => (
              <Fragment key={user.email}>
                <UserRow
                  user={user}
                  expanded={expandedUser === user.email}
                  onEdit={() =>
                    setExpandedUser((v) => (v === user.email ? null : user.email))
                  }
                  onDeleted={() => {
                    if (expandedUser === user.email) setExpandedUser(null)
                    onChange()
                  }}
                />

                {expandedUser === user.email && (
                  <UserEditorRow
                    user={user}
                    scopes={scopes}
                    onCancel={() => setExpandedUser(null)}
                    onSaved={() => {
                      setExpandedUser(null)
                      onChange()
                    }}
                  />
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function UserRow({
  user,
  expanded,
  onEdit,
  onDeleted,
}: {
  user: TeamUser
  expanded: boolean
  onEdit: () => void
  onDeleted: () => void
}) {
  async function remove() {
    if (!confirm(`Delete ${user.email}?`)) return

    const res = await apiFetch("/herringbone/auth/users", {
      method: "DELETE",
      body: JSON.stringify({ email: user.email }),
    })

    if (!res.ok) {
      alert("Delete failed")
      return
    }

    onDeleted()
  }

  return (
    <tr>
      <td className="hb-mono">{user.email}</td>

      <td>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {user.scopes.map((scope) => (
            <span key={scope} className="hb-scope-chip">
              {scope}
            </span>
          ))}
        </div>
      </td>

      <td>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="hb-button" onClick={onEdit}>
            {expanded ? "Close" : "Edit"}
          </button>

          <button className="hb-button-danger" onClick={remove}>
            Delete
          </button>
        </div>
      </td>
    </tr>
  )
}

function UserEditorRow({
  user,
  scopes,
  onCancel,
  onSaved,
}: {
  user: TeamUser
  scopes: ScopeItem[]
  onCancel: () => void
  onSaved: () => void
}) {
  const [selectedScopes, setSelectedScopes] = useState<string[]>(user.scopes)

  const grouped = useMemo(() => groupScopes(scopes), [scopes])

  function toggle(scope: string) {
    setSelectedScopes((s) =>
      s.includes(scope) ? s.filter((x) => x !== scope) : [...s, scope]
    )
  }

  async function save() {
    const res = await apiFetch("/herringbone/auth/users/scopes", {
      method: "POST",
      body: JSON.stringify({
        email: user.email,
        scopes: selectedScopes,
      }),
    })

    if (!res.ok) {
      alert("Failed to update scopes")
      return
    }

    onSaved()
  }

  return (
    <tr>
      <td colSpan={3}>
        <div
          style={{
            background: "#020617",
            border: "1px solid #1f2937",
            padding: 16,
            borderRadius: 8,
            marginTop: 6,
          }}
        >
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 600 }}>
              Edit scopes for <span className="hb-mono">{user.email}</span>
            </div>
          </div>

          {grouped.map(([group, items]) => (
            <div key={group} style={{ marginBottom: 18 }}>
              <div className="hb-subtitle" style={{ marginBottom: 8 }}>
                {group}
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                  gap: 8,
                }}
              >
                {items.map((item) => {
                  const active = selectedScopes.includes(item.scope)

                  return (
                    <button
                      key={item.scope}
                      type="button"
                      onClick={() => toggle(item.scope)}
                      style={{
                        textAlign: "left",
                        padding: "10px 12px",
                        borderRadius: 8,
                        background: active ? "#1e3a8a" : "#0f172a",
                        border: active
                          ? "1px solid #2563eb"
                          : "1px solid #1e293b",
                        cursor: "pointer",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: 4,
                        }}
                      >
                        <span className="hb-mono">{item.scope}</span>

                        {item.tier === "enterprise" && (
                          <span
                            style={{
                              fontSize: 10,
                              padding: "2px 6px",
                              borderRadius: 4,
                              background: "#7c2d12",
                            }}
                          >
                            enterprise
                          </span>
                        )}
                      </div>

                      <div style={{ fontSize: 12, opacity: 0.75 }}>
                        {item.description}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}

          <div style={{ display: "flex", gap: 10 }}>
            <button className="hb-button-primary" onClick={save}>
              Save
            </button>

            <button className="hb-button-secondary" onClick={onCancel}>
              Cancel
            </button>
          </div>
        </div>
      </td>
    </tr>
  )
}