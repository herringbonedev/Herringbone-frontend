import { Link, Outlet, useNavigate } from "react-router-dom"
import { useEffect, useState } from "react"

type UserInfo = {
  id: string
  email: string
}

type NavItem = {
  label?: string
  path?: string
  element?: React.ReactNode
  position?: "left" | "right"
  order?: number
}

function getUserFromToken(): UserInfo | null {
  const token = localStorage.getItem("hb_token")
  if (!token) return null

  try {
    const [, payload] = token.split(".")
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"))
    const data = JSON.parse(json)

    // optional expiration check
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

const coreNav: NavItem[] = [
  { label: "Home", path: "/", order: 10 },
  { label: "Log Ingestion", path: "/logingestion", order: 20 },
  { label: "CardSet", path: "/cardset", order: 30 },
  { label: "RuleSet", path: "/ruleset", order: 40 },
  { label: "Incidents", path: "/incidents", order: 50 },
  { label: "Search", path: "/search", order: 60 },
  { label: "Teams", path: "/teams", order: 70 },
  { label: "Services", path: "/services", order: 80 },
]

async function loadNavExtensions(): Promise<NavItem[]> {
  let items: NavItem[] = []

  try {
    // @ts-ignore
    const mod = await import("./enterprise/navigation")
    items = items.concat(mod.enterpriseNav || [])
  } catch {}

  try {
    // @ts-ignore
    const mod = await import("./plugins/navigation")
    items = items.concat(mod.pluginNav || [])
  } catch {}

  return items
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
              <span key={idx}>{item.element}</span>
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
                <span key={idx}>{item.element}</span>
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