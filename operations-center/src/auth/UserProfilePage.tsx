import { useState } from "react"
import { getUserFromToken } from "./jwt"

export default function UserProfilePage() {
  const [showToken, setShowToken] = useState(false)

  const user = getUserFromToken()
  const token = localStorage.getItem("hb_token")

  return (
    <div style={{ padding: 24 }}>
      <h2>User Profile</h2>

      {!user && (
        <pre style={{ color: "red" }}>
          Not authenticated
        </pre>
      )}

      {user && (
        <>
          <pre
            style={{
              marginTop: 12,
              padding: 12,
              background: "#0b0e14",
              border: "1px solid #333",
              borderRadius: 6,
              color: "#e5e7eb",
              overflow: "auto",
            }}
          >
{JSON.stringify(user, null, 2)}
          </pre>

          <div style={{ marginTop: 16 }}>
            <button
              onClick={() => setShowToken(v => !v)}
              style={{
                padding: "6px 10px",
                borderRadius: 4,
                border: "1px solid #333",
                background: "transparent",
                color: "inherit",
                cursor: "pointer",
              }}
            >
              {showToken ? "Hide token" : "Show token"}
            </button>
          </div>

          {showToken && token && (
            <pre
              style={{
                marginTop: 12,
                padding: 12,
                background: "#020617",
                border: "1px solid #333",
                borderRadius: 6,
                color: "#93c5fd",
                overflow: "auto",
                wordBreak: "break-all",
              }}
            >
{token}
            </pre>
          )}
        </>
      )}
    </div>
  )
}
