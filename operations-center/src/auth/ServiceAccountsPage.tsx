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
  created_at?: any
}

const AUTH_API_BASE = `${import.meta.env.VITE_HERRINGBONE_API_BASE || `${window.location.protocol}//${window.location.hostname}`}:7001`

function groupByPrefix(items: ScopeItem[]) {
  const groups: Record<string, ScopeItem[]> = {}
  for (const it of items) {
    const prefix = it.scope.split(":")[0] || "other"
    if (!groups[prefix]) groups[prefix] = []
    groups[prefix].push(it)
  }
  for (const k of Object.keys(groups)) {
    groups[k].sort((a, b) => a.scope.localeCompare(b.scope))
  }
  return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b))
}

function safeDateString(v: any) {
  if (!v) return "-"
  // If API returns a real ISO string, this works.
  // If it returns a Mongo-ish object, this may still fail — keep it defensive.
  try {
    const d = new Date(v)
    if (isNaN(d.getTime())) return String(v)
    return d.toLocaleString()
  } catch {
    return String(v)
  }
}

function authHeaders(token: string | null, extra?: Record<string, string>) {
  if (!token) return extra || {}
  return { Authorization: `Bearer ${token}`, ...(extra || {}) }
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

  // Manage existing service state
  const [manageOpen, setManageOpen] = useState(false)
  const [manageService, setManageService] = useState<ServiceAccount | null>(null)
  const [manageSelected, setManageSelected] = useState<string[]>([])
  const [manageSearch, setManageSearch] = useState("")
  const [manageDropdownOpen, setManageDropdownOpen] = useState(false)
  const [loadingManageAction, setLoadingManageAction] = useState(false)

  const dropdownRef = useRef<HTMLDivElement | null>(null)
  const manageDropdownRef = useRef<HTMLDivElement | null>(null)

  if (!user) return <div className="svc-error">Not authenticated</div>
  if (user.role !== "admin") return <div className="svc-error">Admin access required</div>
  if (!token) return <div className="svc-error">Missing token</div>

  async function loadServices() {
    try {
      setLoadingServices(true)
      const resp = await fetch(`${AUTH_API_BASE}/herringbone/auth/services`, {
        headers: authHeaders(token),
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
        headers: authHeaders(token),
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // close dropdown on outside click
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setScopeOpen(false)
      }
      if (manageDropdownRef.current && !manageDropdownRef.current.contains(e.target as Node)) {
        setManageDropdownOpen(false)
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
    return selectedScopes.map(s => map.get(s)).filter(Boolean) as ScopeItem[]
  }, [allScopes, selectedScopes])

  // Manage dropdown derived
  const manageFilteredScopes = useMemo(() => {
    const q = manageSearch.trim().toLowerCase()
    if (!q) return allScopes
    return allScopes.filter(s => s.scope.toLowerCase().includes(q))
  }, [allScopes, manageSearch])

  const manageGrouped = useMemo(
    () => groupByPrefix(manageFilteredScopes),
    [manageFilteredScopes]
  )

  const manageSelectedItems = useMemo(() => {
    const map = new Map(allScopes.map(s => [s.scope, s] as const))
    return manageSelected.map(s => map.get(s)).filter(Boolean) as ScopeItem[]
  }, [allScopes, manageSelected])

  function openManage(service: ServiceAccount) {
    setError(null)
    setCreatedToken(null)
    setManageService(service)
    setManageSelected(service.scopes ? [...service.scopes] : [])
    setManageSearch("")
    setManageDropdownOpen(false)
    setManageOpen(true)
  }

  function closeManage() {
    setManageOpen(false)
    setManageService(null)
    setManageSelected([])
    setManageSearch("")
    setManageDropdownOpen(false)
    setLoadingManageAction(false)
  }

  function toggleManageScope(scope: string) {
    setManageSelected(prev =>
      prev.includes(scope) ? prev.filter(s => s !== scope) : [...prev, scope]
    )
  }

  function removeManageSelected(scope: string) {
    setManageSelected(prev => prev.filter(s => s !== scope))
  }

  async function createService() {
    setError(null)
    setCreatedToken(null)
    setLoadingCreate(true)

    try {
      const r1 = await fetch(`${AUTH_API_BASE}/herringbone/auth/services/register`, {
        method: "POST",
        headers: authHeaders(token, { "Content-Type": "application/json" }),
        body: JSON.stringify({ service_name: serviceName, scopes: selectedScopes }),
      })
      if (!r1.ok) throw new Error(await r1.text())

      const r2 = await fetch(`${AUTH_API_BASE}/herringbone/auth/service-token`, {
        method: "POST",
        headers: authHeaders(token, { "Content-Type": "application/json" }),
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
        headers: authHeaders(token, { "Content-Type": "application/json" }),
        body: JSON.stringify({ service: service.service_name, scopes: service.scopes }),
      })
      if (!resp.ok) throw new Error(await resp.text())
      const data = await resp.json()
      setCreatedToken(data.access_token)
    } catch (e: any) {
      setError(e.message || "Failed to generate token")
    }
  }

  async function deleteService(service: ServiceAccount) {
    setError(null)
    setCreatedToken(null)

    const ok = window.confirm(
      `Delete service "${service.service_name}"?\n\nThis removes the service account record. Any already-issued tokens will still validate until expiry unless you implement token revocation.`
    )
    if (!ok) return

    try {
      const resp = await fetch(
        `${AUTH_API_BASE}/herringbone/auth/services/${encodeURIComponent(service.service_name)}`,
        {
          method: "DELETE",
          headers: authHeaders(token),
        }
      )
      if (!resp.ok) throw new Error(await resp.text())
      await loadServices()
      if (manageService?.service_name === service.service_name) closeManage()
    } catch (e: any) {
      setError(e.message || "Failed to delete service")
    }
  }

  async function applyScopeChanges() {
    if (!manageService) return

    setError(null)
    setCreatedToken(null)
    setLoadingManageAction(true)

    try {
      const current = new Set(manageService.scopes || [])
      const desired = new Set(manageSelected)

      const toAdd: string[] = []
      const toRemove: string[] = []

      for (const s of desired) if (!current.has(s)) toAdd.push(s)
      for (const s of current) if (!desired.has(s)) toRemove.push(s)

      // Add first
      if (toAdd.length > 0) {
        const rAdd = await fetch(`${AUTH_API_BASE}/herringbone/auth/services/scopes/add`, {
          method: "POST",
          headers: authHeaders(token, { "Content-Type": "application/json" }),
          body: JSON.stringify({ service_name: manageService.service_name, scopes: toAdd }),
        })
        if (!rAdd.ok) throw new Error(await rAdd.text())
      }

      // Remove
      if (toRemove.length > 0) {
        const rRem = await fetch(`${AUTH_API_BASE}/herringbone/auth/services/scopes/remove`, {
          method: "POST",
          headers: authHeaders(token, { "Content-Type": "application/json" }),
          body: JSON.stringify({ service_name: manageService.service_name, scopes: toRemove }),
        })
        if (!rRem.ok) throw new Error(await rRem.text())
      }

      await loadServices()

      // Refresh manageService from updated list (so generate-token uses updated scopes)
      // const updated = services.find(s => s.service_name === manageService.service_name)
      // services state may be stale until loadServices resolves; do a lightweight refetch
      const resp = await fetch(`${AUTH_API_BASE}/herringbone/auth/services`, {
        headers: authHeaders(token),
      })
      if (resp.ok) {
        const data = await resp.json()
        const list = (data.services || []) as ServiceAccount[]
        setServices(list)
        const u = list.find(s => s.service_name === manageService.service_name) || null
        setManageService(u)
        if (u) setManageSelected(u.scopes ? [...u.scopes] : [])
      }
    } catch (e: any) {
      setError(e.message || "Failed to update scopes")
    } finally {
      setLoadingManageAction(false)
    }
  }

  async function generateTokenFromManage() {
    if (!manageService) return
    setError(null)
    setCreatedToken(null)

    try {
      const resp = await fetch(`${AUTH_API_BASE}/herringbone/auth/service-token`, {
        method: "POST",
        headers: authHeaders(token, { "Content-Type": "application/json" }),
        body: JSON.stringify({
          service: manageService.service_name,
          scopes: manageSelected,
        }),
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

        <div className="svc-actions">
          <button className="svc-secondary" onClick={loadServices} disabled={loadingServices}>
            Refresh
          </button>
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
              <span className="svc-caret" aria-hidden="true">
                ▾
              </span>
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
                  <button type="button" className="svc-link" onClick={() => setScopeOpen(false)}>
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
              <button className="svc-secondary" onClick={() => navigator.clipboard.writeText(createdToken)}>
                Copy token
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Manage panel */}
      {manageOpen && manageService && (
        <div className="svc-card" style={{ marginTop: 16 }}>
          <div className="svc-card-title">Manage service: <span className="svc-mono">{manageService.service_name}</span></div>

          <div className="svc-fields">
            <div className="svc-field">
              <label className="svc-label">Current scopes</label>
              <div className="svc-muted svc-mono" style={{ lineHeight: 1.6 }}>
                {(manageService.scopes || []).join(", ") || "-"}
              </div>
            </div>

            <div className="svc-field svc-scope-select" ref={manageDropdownRef}>
              <label className="svc-label">Edit scopes</label>

              <button
                type="button"
                className="svc-scope-button"
                onClick={() => setManageDropdownOpen(v => !v)}
              >
                <span>
                  {manageSelected.length === 0 ? "Select scopes" : `${manageSelected.length} selected`}
                </span>
                <span className="svc-caret" aria-hidden="true">
                  ▾
                </span>
              </button>

              {manageSelectedItems.length > 0 && (
                <div className="svc-chips">
                  {manageSelectedItems
                    .slice()
                    .sort((a, b) => a.scope.localeCompare(b.scope))
                    .map(s => (
                      <button
                        type="button"
                        key={s.scope}
                        className="svc-chip"
                        onClick={() => removeManageSelected(s.scope)}
                        title="Remove"
                      >
                        <span className="svc-chip-text">{s.scope}</span>
                        <span className={`svc-chip-tier ${s.tier}`}>{s.tier}</span>
                        <span className="svc-chip-x">×</span>
                      </button>
                    ))}
                </div>
              )}

              {manageDropdownOpen && (
                <div className="svc-scope-dropdown" role="listbox">
                  <div className="svc-scope-top">
                    <input
                      className="svc-scope-search"
                      placeholder="Search scopes..."
                      value={manageSearch}
                      onChange={e => setManageSearch(e.target.value)}
                      autoFocus
                    />
                  </div>

                  <div className="svc-scope-list">
                    {manageGrouped.map(([group, items]) => (
                      <div key={group} className="svc-scope-group">
                        <div className="svc-scope-group-title">{group}</div>

                        {items.map(it => (
                          <label key={it.scope} className="svc-scope-item">
                            <input
                              type="checkbox"
                              checked={manageSelected.includes(it.scope)}
                              onChange={() => toggleManageScope(it.scope)}
                            />
                            <span className="svc-scope-text">{it.scope}</span>
                            <span className={`svc-tier-badge ${it.tier}`}>{it.tier}</span>
                          </label>
                        ))}
                      </div>
                    ))}

                    {manageFilteredScopes.length === 0 && (
                      <div className="svc-empty">No matching scopes</div>
                    )}
                  </div>

                  <div className="svc-scope-footer">
                    <button
                      type="button"
                      className="svc-link"
                      onClick={() => setManageSelected([])}
                    >
                      Clear selected
                    </button>
                    <button type="button" className="svc-link" onClick={() => setManageDropdownOpen(false)}>
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
              onClick={applyScopeChanges}
              disabled={loadingManageAction}
            >
              {loadingManageAction ? "Saving..." : "Save scopes"}
            </button>

            <button
              className="svc-secondary"
              onClick={generateTokenFromManage}
              disabled={loadingManageAction}
            >
              Generate token (selected scopes)
            </button>

            <button className="svc-secondary" onClick={closeManage} disabled={loadingManageAction}>
              Close
            </button>

            <button
              className="svc-btn-small"
              onClick={() => deleteService(manageService)}
              disabled={loadingManageAction}
              style={{ marginLeft: "auto" }}
            >
              Delete service
            </button>
          </div>
        </div>
      )}

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
                  <td className="svc-mono">{(s.scopes || []).join(", ") || "-"}</td>
                  <td>{s.enabled ? "Yes" : "No"}</td>
                  <td>{safeDateString(s.created_at)}</td>
                  <td style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <button className="svc-btn-small" onClick={() => generateTokenForService(s)}>
                      Generate token
                    </button>
                    <button className="svc-btn-small" onClick={() => openManage(s)}>
                      Manage
                    </button>
                    <button className="svc-btn-small" onClick={() => deleteService(s)}>
                      Delete
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
