import { Fragment, useEffect, useMemo, useState } from "react"
import { apiFetch } from "../api"
import { getUserFromToken } from "./jwt"
import "../styles/ui.css"

type ServiceAccount = {
  id: string
  service_name: string
  scopes: string[]
  enabled: boolean
  created_at?: any
}

type ScopeItem = {
  scope: string
  description: string
  tier: string
  ui_group: string
  order: number
}

function normalizeScopes(raw: unknown): ScopeItem[] {
  if (!Array.isArray(raw)) return []

  return raw
    .map((s: any) => ({
      scope: s.scope ?? "",
      description: s.description ?? "",
      tier: s.tier ?? "free",
      ui_group: s.ui_group ?? "General",
      order: s.order ?? 0,
    }))
    .filter((s) => s.scope)
}

function groupScopes(items: ScopeItem[]) {
  const groups: Record<string, ScopeItem[]> = {}

  for (const s of items) {
    const g = s.ui_group || "General"
    if (!groups[g]) groups[g] = []
    groups[g].push(s)
  }

  return Object.entries(groups)
    .map(([g, v]) => [g, v.sort((a, b) => a.order - b.order)] as const)
    .sort(([a], [b]) => a.localeCompare(b))
}

function safeDate(v: any) {
  if (!v) return "-"
  const d = new Date(v)
  return isNaN(d.getTime()) ? String(v) : d.toLocaleString()
}

export default function ServiceAccountsPage() {
  const user = getUserFromToken()
  const token = localStorage.getItem("hb_token")

  const [services, setServices] = useState<ServiceAccount[]>([])
  const [scopes, setScopes] = useState<ScopeItem[]>([])
  const [loading, setLoading] = useState(true)

  const [expandedToken, setExpandedToken] = useState<string | null>(null)
  const [tokenValue, setTokenValue] = useState<string | null>(null)

  const [expandedEditor, setExpandedEditor] = useState<string | null>(null)

  const [serviceName, setServiceName] = useState("")

  if (!user || !token) {
    return <div className="hb-alert-error">Authentication required</div>
  }

  async function load() {
    const [svcRes, scopeRes] = await Promise.all([
      apiFetch("/herringbone/auth/services"),
      apiFetch("/herringbone/auth/scopes"),
    ])

    const svc = await svcRes.json()
    const scp = await scopeRes.json()

    setServices(svc.services || [])
    setScopes(normalizeScopes(scp.scopes))
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  async function createService() {
    if (!serviceName) return

    const res = await apiFetch("/herringbone/auth/services/register", {
      method: "POST",
      body: JSON.stringify({
        service_name: serviceName,
        scopes: [],
      }),
    })

    if (!res.ok) return alert("Create failed")

    setServiceName("")
    load()
  }

  async function deleteService(service: ServiceAccount) {
    if (!confirm(`Delete ${service.service_name}?`)) return

    const res = await apiFetch(`/herringbone/auth/services/${service.service_name}`, {
      method: "DELETE",
    })

    if (!res.ok) return alert("Delete failed")

    load()
  }

  async function generateToken(service: ServiceAccount) {
    if (expandedToken === service.id) {
      setExpandedToken(null)
      setTokenValue(null)
      return
    }

    const res = await apiFetch("/herringbone/auth/service-token", {
      method: "POST",
      body: JSON.stringify({
        service: service.service_name,
        scopes: service.scopes,
      }),
    })

    if (!res.ok) return alert("Token generation failed")

    const data = await res.json()

    setExpandedToken(service.id)
    setTokenValue(data.access_token)
    setExpandedEditor(null)
  }

  return (
    <div className="hb-page" style={{ width: "100%", maxWidth: "none" }}>
      <div className="hb-header">
        <h1 className="hb-title">Service Accounts</h1>
        <div className="hb-subtitle">
          Internal identities used by Herringbone services
        </div>
      </div>

      <div className="hb-card" style={{ marginBottom: 20 }}>
        <div className="hb-card-title">Create Service Account</div>

        <div style={{ display: "flex", gap: 12 }}>
          <input
            className="hb-input"
            placeholder="parser-extractor"
            value={serviceName}
            onChange={(e) => setServiceName(e.target.value)}
          />

          <button className="hb-button-primary" onClick={createService}>
            Create
          </button>
        </div>
      </div>

      <div className="hb-card">
        <div className="hb-card-title">Services</div>

        {loading ? (
          <div className="hb-empty">Loading...</div>
        ) : (
          <div className="hb-table-wrapper">
            <table className="hb-table">
              <thead>
                <tr>
                  <th>Service</th>
                  <th>Scopes</th>
                  <th>Enabled</th>
                  <th>Created</th>
                  <th style={{ width: 240 }}>Actions</th>
                </tr>
              </thead>

              <tbody>
                {services.map((svc) => (
                  <Fragment key={svc.id}>
                    <tr>
                      <td className="hb-mono">{svc.service_name}</td>

                      <td>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {svc.scopes.map((s) => (
                            <span key={s} className="hb-scope-chip">
                              {s}
                            </span>
                          ))}
                        </div>
                      </td>

                      <td>{svc.enabled ? "Yes" : "No"}</td>
                      <td>{safeDate(svc.created_at)}</td>

                      <td>
                        <div style={{ display: "flex", gap: 10 }}>
                          <button
                            className="hb-button"
                            onClick={() => generateToken(svc)}
                          >
                            Token
                          </button>

                          <button
                            className="hb-button"
                            onClick={() =>
                              setExpandedEditor(
                                expandedEditor === svc.id ? null : svc.id
                              )
                            }
                          >
                            Edit
                          </button>

                          <button
                            className="hb-button-danger"
                            onClick={() => deleteService(svc)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>

                    {expandedToken === svc.id && tokenValue && (
                      <tr>
                        <td colSpan={5}>
                          <div
                            style={{
                              background: "#020617",
                              border: "1px solid #1f2937",
                              padding: 16,
                              borderRadius: 8,
                            }}
                          >
                            <pre
                              style={{
                                whiteSpace: "pre-wrap",
                                wordBreak: "break-all",
                                color: "#93c5fd",
                                margin: 0,
                              }}
                            >
{tokenValue}
                            </pre>
                          </div>
                        </td>
                      </tr>
                    )}

                    {expandedEditor === svc.id && (
                      <ServiceEditorRow
                        service={svc}
                        scopes={scopes}
                        onCancel={() => setExpandedEditor(null)}
                        onSaved={() => {
                          setExpandedEditor(null)
                          load()
                        }}
                      />
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function ServiceEditorRow({
  service,
  scopes,
  onCancel,
  onSaved,
}: {
  service: ServiceAccount
  scopes: ScopeItem[]
  onCancel: () => void
  onSaved: () => void
}) {
  const [selected, setSelected] = useState<string[]>(service.scopes)
  const grouped = useMemo(() => groupScopes(scopes), [scopes])

  function toggle(scope: string) {
    setSelected((s) =>
      s.includes(scope) ? s.filter((x) => x !== scope) : [...s, scope]
    )
  }

  async function save() {
    const res = await apiFetch("/herringbone/auth/services/scopes/set", {
      method: "POST",
      body: JSON.stringify({
        service_name: service.service_name,
        scopes: selected,
      }),
    })

    if (!res.ok) return alert("Failed to update scopes")

    onSaved()
  }

  return (
    <tr>
      <td colSpan={5}>
        <div
          style={{
            background: "#020617",
            border: "1px solid #1f2937",
            padding: 16,
            borderRadius: 8,
          }}
        >
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 600 }}>
              Edit scopes for <span className="hb-mono">{service.service_name}</span>
            </div>
            <div className="hb-subtitle">
              Select permissions for this service
            </div>
          </div>

          <div style={{ display: "grid", gap: 18 }}>
            {grouped.map(([group, items]) => (
              <div key={group}>
                <div className="hb-subtitle" style={{ marginBottom: 8 }}>
                  {group}
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))",
                    gap: 8,
                  }}
                >
                  {items.map((item) => {
                    const active = selected.includes(item.scope)

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
                        }}
                      >
                        <div className="hb-mono">{item.scope}</div>

                        <div style={{ fontSize: 12, opacity: 0.75 }}>
                          {item.description}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 20, display: "flex", gap: 10 }}>
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