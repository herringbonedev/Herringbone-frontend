import { Link, Outlet, useNavigate } from "react-router-dom"
import { useEffect, useState } from "react"

type UserInfo = {
  id: string
  email: string
}

const authEnabled = import.meta.env.VITE_AUTH_ENABLED === "true"

function getUserFromToken(): UserInfo | null {
  const token = localStorage.getItem("hb_token")
  if (!token) return null

  try {
    const [, payload] = token.split(".")
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"))
    const data = JSON.parse(json)

    return {
      id: data.sub,
      email: data.email,
    }
  } catch {
    return null
  }
}

function App() {
  const navigate = useNavigate()
  const [user, setUser] = useState<UserInfo | null>(null)

  useEffect(() => {
    setUser(getUserFromToken())
  }, [])

  function logout() {
    localStorage.removeItem("hb_token")
    setUser(null)
    navigate("/login", { replace: true })
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          gap: "1rem",
          padding: "0.75rem 1rem",
          borderBottom: "1px solid var(--border)",
          background: "var(--bg-panel)",
          alignItems: "center",
        }}
      >
        <strong>Herringbone</strong>

        <Link to="/">Home</Link>
        <Link to="/logingestion">Log Ingestion</Link>
        <Link to="/cardset">CardSet</Link>
        <Link to="/ruleset">RuleSet</Link>
        <Link to="/incidents">Incidents</Link>
        <Link to="/search">Search</Link>
        {authEnabled && user && <Link to="/teams">Teams</Link>}

        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            gap: "0.75rem",
            alignItems: "center",
          }}
        >
          {authEnabled && user && <Link to="/profile">{user.email}</Link>}

          {user && (
            <>

              <button
                onClick={logout}
                style={{
                  padding: "4px 8px",
                  borderRadius: 4,
                  border: "1px solid var(--border)",
                  background: "transparent",
                  color: "inherit",
                  cursor: "pointer",
                }}
              >
                Logout
              </button>
            </>
          )}
        </div>
      </div>

      <div style={{ padding: "1rem" }}>
        <Outlet />
      </div>
    </div>
  )
}

export default App
