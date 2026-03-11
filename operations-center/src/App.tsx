import { Link, Outlet, useNavigate } from "react-router-dom"
import { useEffect, useState } from "react"
import type { NavItem } from "./navigation/types"
import { coreNav } from "./navigation/coreNav"
import { loadNavExtensions } from "./navigation/loadNavExtensions"

type UserInfo = {
  id: string
  email: string
}

function getUserFromToken(): UserInfo | null {
  const token = localStorage.getItem("hb_token")
  if (!token) return null

  try {
    const [, payload] = token.split(".")
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"))
    const data = JSON.parse(json)

    if (data.exp && Date.now() >= data.exp * 1000) {
      localStorage.removeItem("hb_token")
      return null
    }

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
  const [navItems, setNavItems] = useState<NavItem[]>(coreNav)

  useEffect(() => {
    setUser(getUserFromToken())

    async function loadNav() {
      const extra = await loadNavExtensions()

      const merged = [...coreNav, ...extra].sort(
        (a, b) => (a.order || 100) - (b.order || 100)
      )

      setNavItems(merged)
    }

    loadNav()
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

        {navItems
          .filter((i) => i.position !== "right")
          .map((item, idx) =>
            item.element ? (
              <span key={item.label || item.path || `nav-left-${idx}`}>
                {item.element}
              </span>
            ) : (
              item.path && (
                <Link key={item.path} to={item.path}>
                  {item.label}
                </Link>
              )
            )
          )}

        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            gap: "0.75rem",
            alignItems: "center",
          }}
        >
          {navItems
            .filter((i) => i.position === "right")
            .map((item, idx) =>
              item.element ? (
                <span key={item.label || item.path || `nav-right-${idx}`}>
                  {item.element}
                </span>
              ) : (
                item.path && (
                  <Link key={item.path} to={item.path}>
                    {item.label}
                  </Link>
                )
              )
            )}

          {user && <Link to="/profile">{user.email}</Link>}

          {user && (
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