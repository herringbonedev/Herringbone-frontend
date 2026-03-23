import { useMemo, useState } from "react"
import { clearToken, getActiveToken } from "../api"
import { getUserFromToken } from "./jwt"
import "../styles/ui.css"

function decodeToken(token: string | null) {
  if (!token) return null
  try {
    const payload = token.split(".")[1]
    return JSON.parse(atob(payload))
  } catch {
    return null
  }
}

function formatTime(ts?: number) {
  if (!ts) return "-"
  const d = new Date(ts * 1000)
  if (isNaN(d.getTime())) return "-"
  return d.toLocaleString()
}

function copy(text?: string) {
  if (!text) return
  navigator.clipboard.writeText(text)
}

export default function UserProfilePage() {
  const [showToken, setShowToken] = useState(false)
  const user = getUserFromToken()
  const token = getActiveToken()
  const payload = useMemo(() => decodeToken(token), [token])

  function logout() {
    clearToken()
    window.location.href = "/login"
  }

  return (
    <div className="hb-page">
      <div className="hb-header">
        <h1 className="hb-title">User Profile</h1>
        <div className="hb-subtitle">
          Account identity and session information
        </div>
      </div>

      <div className="hb-card">
        {!user && (
          <div className="hb-alert-error">
            Not authenticated
          </div>
        )}

        {user && (
          <>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                marginBottom: 24,
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: "50%",
                  background: "#1e293b",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 600,
                  fontSize: 18,
                }}
              >
                {user.email?.[0]?.toUpperCase()}
              </div>

              <div>
                <div style={{ fontWeight: 600 }}>
                  {user.email}
                </div>

                <div className="hb-subtitle">
                  User ID {user.id}
                </div>
              </div>
            </div>

            <div className="hb-profile-grid">
              <div className="hb-profile-row">
                <div className="hb-profile-label">Email</div>
                <div className="hb-profile-value hb-mono">
                  {user.email}

                  <button
                    className="hb-button-secondary"
                    style={{ marginLeft: 10 }}
                    onClick={() => copy(user.email)}
                  >
                    Copy
                  </button>
                </div>
              </div>

              <div className="hb-profile-row">
                <div className="hb-profile-label">User ID</div>
                <div className="hb-profile-value hb-mono">
                  {user.id}

                  <button
                    className="hb-button-secondary"
                    style={{ marginLeft: 10 }}
                    onClick={() => copy(user.id)}
                  >
                    Copy
                  </button>
                </div>
              </div>

              {payload?.context_id && (
                <div className="hb-profile-row">
                  <div className="hb-profile-label">Context</div>
                  <div className="hb-profile-value">
                    {String(payload.context_id)}
                  </div>
                </div>
              )}
            </div>

            <div className="hb-section-divider" />

            {payload && (
              <div className="hb-profile-grid">
                <div className="hb-profile-row">
                  <div className="hb-profile-label">Issuer</div>
                  <div className="hb-profile-value">
                    {typeof payload.iss === "string" ? payload.iss : "-"}
                  </div>
                </div>

                <div className="hb-profile-row">
                  <div className="hb-profile-label">Issued</div>
                  <div className="hb-profile-value">
                    {formatTime(typeof payload.iat === "number" ? payload.iat : undefined)}
                  </div>
                </div>

                <div className="hb-profile-row">
                  <div className="hb-profile-label">Expires</div>
                  <div className="hb-profile-value">
                    {formatTime(typeof payload.exp === "number" ? payload.exp : undefined)}
                  </div>
                </div>
              </div>
            )}

            <div className="hb-section-divider" />

            <div className="hb-actions">
              <button
                className="hb-button-secondary"
                onClick={() => setShowToken((v) => !v)}
              >
                {showToken ? "Hide Token" : "Show Token"}
              </button>

              <button
                className="hb-button-danger"
                onClick={logout}
              >
                Logout
              </button>
            </div>

            {showToken && token && (
              <div>
                <div
                  style={{
                    marginTop: 12,
                    marginBottom: 6,
                    fontSize: 12,
                    color: "#f59e0b",
                  }}
                >
                  Warning: This token grants API access. Do not share it.
                </div>

                <pre className="hb-code-block">
{token}
                </pre>

                <button
                  className="hb-button-secondary"
                  onClick={() => copy(token)}
                >
                  Copy Token
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
