import { useEffect, useMemo, useRef, useState } from "react"
import { getUserFromToken } from "./jwt"
import "./auth.css"

type ScopeItem = {
  scope: string
  tier: "free" | "enterprise"
}

type ServiceAccount = {
  id: string
  service_name: string
  service_id: string
  scopes: string[]
  enabled: boolean
  created_at?: string
}

const AUTH_API_BASE = import.meta.env.VITE_AUTH_API_BASE || "http://localhost:7001"

function groupByPrefix(items: ScopeItem[]) {
  const groups: Record<string, ScopeItem[]> = {}
  for (const it of items) {
    const prefix = it.scope.split(":")[0] || "other"
    if (!groups[prefix]) groups[prefix] = []
    groups[prefix].push(it)
  }

  // stable sort within groups
  for (const k of Object.keys(groups)) {
    groups[k].sort((a, b) => a.scope.localeCompare(b.scope))
  }

  // return sorted groups by name
  return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b))
}

export default function ServiceAccountsPage() {
  const user = getUserFromToken()
  const token = localStorage.getItem("hb_token")

  const [serviceName, setServiceName] = useState("")
  const [allScopes, setAllScopes] = useState<ScopeItem[]>([])
  const [selectedScopes, setSelectedScopes] = useState<string[]>([])

  const [scopeOpen, setScopeOpen] = useState(false)
  const [scopeSearch, setScopeSearch] = useState("")

  const [services, setServices] = useState<ServiceAccount[]>([])
  const [loadingServices, setLoadingServices] = useState(false)

  const [createdToken, setCreatedToken] = useState<string | null>(null)
  const [loadingCreate, setLoadingCreate] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const dropdownRef = useRef<HTMLDivElement | null>(null)

  if (!user) return <div className="svc-error">Not authenticated</div>
  if (user.role !== "admin") return <div className="svc-error">Admin access required</div>

  async function loadServices() {
    try {
      setLoadingServices(true)
      const resp = await fetch(`${AUTH_API_BASE}/herringbone/auth/services`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!resp.ok) throw new Error(await resp.text())
      const data = await resp.json()
      setServices(data.services || [])
    } catch (e: any) {
      setError(e.message || "Failed to load services")
    } finally {
      setLoadingServices(false)
    }
  }

  async function loadScopes() {
    try {
      const resp = await fetch(`${AUTH_API_BASE}/herringbone/auth/scopes`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!resp.ok) throw new Error(await resp.text())
      const data = await resp.json()
      setAllScopes(data.scopes || [])
    } catch (e: any) {
      setError(e.message || "Failed to load scopes")
    }
  }

  useEffect(() => {
    loadServices()
    loadScopes()
  }, [])

  // close dropdown on outside click
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setScopeOpen(false)
      }
    }
    document.addEventListener("mousedown", onDown)
    return () => document.removeEventListener("mousedown", onDown)
  }, [])

  function toggleScope(scope: string) {
    setSelectedScopes(prev =>
      prev.includes(scope) ? prev.filter(s => s !== scope) : [...prev, scope]
    )
  }

  function removeSelected(scope: string) {
    setSelectedScopes(prev => prev.filter(s => s !== scope))
  }

  function clearForm() {
    setServiceName("")
    setSelectedScopes([])
    setScopeSearch("")
    setCreatedToken(null)
    setError(null)
  }

  const selectedCountLabel =
    selectedScopes.length === 0 ? "Select scopes" : `${selectedScopes.length} selected`

  const filteredScopes = useMemo(() => {
    const q = scopeSearch.trim().toLowerCase()
    if (!q) return allScopes
    return allScopes.filter(s => s.scope.toLowerCase().includes(q))
  }, [allScopes, scopeSearch])

  const grouped = useMemo(() => groupByPrefix(filteredScopes), [filteredScopes])

  const selectedAsItems = useMemo(() => {
    const map = new Map(allScopes.map(s => [s.scope, s] as const))
    return selectedScopes
      .map(s => map.get(s))
      .filter(Boolean) as ScopeItem[]
  }, [allScopes, selectedScopes])

  async function createService() {
    setError(null)
    setCreatedToken(null)
    setLoadingCreate(true)

    try {
      const r1 = await fetch(`${AUTH_API_BASE}/herringbone/auth/services/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ service_name: serviceName, scopes: selectedScopes }),
      })
      if (!r1.ok) throw new Error(await r1.text())

      const r2 = await fetch(`${AUTH_API_BASE}/herringbone/auth/service-token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ service: serviceName, scopes: selectedScopes }),
      })
      if (!r2.ok) throw new Error(await r2.text())

      const data = await r2.json()
      setCreatedToken(data.access_token)

      setServiceName("")
      setSelectedScopes([])
      setScopeSearch("")
      await loadServices()
    } catch (e: any) {
      setError(e.message || "Failed to create service")
    } finally {
      setLoadingCreate(false)
    }
  }

  async function generateTokenForService(service: ServiceAccount) {
    setError(null)
    setCreatedToken(null)

    try {
      const resp = await fetch(`${AUTH_API_BASE}/herringbone/auth/service-token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ service: service.service_name, scopes: service.scopes }),
      })
      if (!resp.ok) throw new Error(await resp.text())
      const data = await resp.json()
      setCreatedToken(data.access_token)
    } catch (e: any) {
      setError(e.message || "Failed to generate token")
    }
  }

  return (
    <div className="svc-page">
      <div className="svc-header">
        <div>
          <h1 className="svc-title">Service Accounts</h1>
          <div className="svc-subtitle">
            Register service identities and generate scoped tokens.
          </div>
        </div>
      </div>

      <div className="svc-card">
        <div className="svc-card-title">Create service</div>

        <div className="svc-fields">
          <div className="svc-field">
            <label className="svc-label">Service name</label>
            <input
              className="svc-input"
              value={serviceName}
              onChange={e => setServiceName(e.target.value)}
              placeholder="e.g. parser-extractor"
            />
          </div>

          <div className="svc-field svc-scope-select" ref={dropdownRef}>
            <label className="svc-label">Scopes</label>

            <button
              type="button"
              className="svc-scope-button"
              onClick={() => setScopeOpen(v => !v)}
            >
              <span>{selectedCountLabel}</span>
              <span className="svc-caret" aria-hidden="true">▾</span>
            </button>

            {selectedAsItems.length > 0 && (
              <div className="svc-chips">
                {selectedAsItems
                  .slice()
                  .sort((a, b) => a.scope.localeCompare(b.scope))
                  .map(s => (
                    <button
                      type="button"
                      key={s.scope}
                      className="svc-chip"
                      onClick={() => removeSelected(s.scope)}
                      title="Remove"
                    >
                      <span className="svc-chip-text">{s.scope}</span>
                      <span className={`svc-chip-tier ${s.tier}`}>{s.tier}</span>
                      <span className="svc-chip-x">×</span>
                    </button>
                  ))}
              </div>
            )}

            {scopeOpen && (
              <div className="svc-scope-dropdown" role="listbox">
                <div className="svc-scope-top">
                  <input
                    className="svc-scope-search"
                    placeholder="Search scopes..."
                    value={scopeSearch}
                    onChange={e => setScopeSearch(e.target.value)}
                    autoFocus
                  />
                </div>

                <div className="svc-scope-list">
                  {grouped.map(([group, items]) => (
                    <div key={group} className="svc-scope-group">
                      <div className="svc-scope-group-title">{group}</div>

                      {items.map(it => (
                        <label key={it.scope} className="svc-scope-item">
                          <input
                            type="checkbox"
                            checked={selectedScopes.includes(it.scope)}
                            onChange={() => toggleScope(it.scope)}
                          />
                          <span className="svc-scope-text">{it.scope}</span>
                          <span className={`svc-tier-badge ${it.tier}`}>{it.tier}</span>
                        </label>
                      ))}
                    </div>
                  ))}

                  {filteredScopes.length === 0 && (
                    <div className="svc-empty">No matching scopes</div>
                  )}
                </div>

                <div className="svc-scope-footer">
                  <button
                    type="button"
                    className="svc-link"
                    onClick={() => setSelectedScopes([])}
                  >
                    Clear selected
                  </button>
                  <button
                    type="button"
                    className="svc-link"
                    onClick={() => setScopeOpen(false)}
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="svc-actions">
          <button
            className="svc-primary"
            onClick={createService}
            disabled={loadingCreate || !serviceName}
          >
            {loadingCreate ? "Creating..." : "Create service"}
          </button>

          <button type="button" className="svc-secondary" onClick={clearForm}>
            Clear
          </button>
        </div>

        {error && <div className="svc-error svc-error-card">{error}</div>}

        {createdToken && (
          <div className="svc-token-box">
            <div className="svc-token-title">Service token</div>
            <div className="svc-token-subtitle">Copy now. This won’t be shown again.</div>

            <pre className="svc-token-pre">{createdToken}</pre>

            <div className="svc-actions">
              <button
                className="svc-secondary"
                onClick={() => navigator.clipboard.writeText(createdToken)}
              >
                Copy token
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="svc-section">
        <div className="svc-section-title">Registered services</div>

        {loadingServices ? (
          <div className="svc-muted">Loading services...</div>
        ) : (
          <table className="svc-table">
            <thead>
              <tr>
                <th>Service</th>
                <th>Scopes</th>
                <th>Enabled</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {services.map(s => (
                <tr key={s.id}>
                  <td className="svc-mono">{s.service_name}</td>
                  <td className="svc-mono">{s.scopes.join(", ") || "-"}</td>
                  <td>{s.enabled ? "Yes" : "No"}</td>
                  <td>{s.created_at ? new Date(s.created_at).toLocaleString() : "-"}</td>
                  <td>
                    <button
                      className="svc-btn-small"
                      onClick={() => generateTokenForService(s)}
                    >
                      Generate token
                    </button>
                  </td>
                </tr>
              ))}

              {services.length === 0 && (
                <tr>
                  <td colSpan={5} className="svc-empty">
                    No services registered
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
