import { Link, Outlet } from "react-router-dom"

function App() {
  return (
    <div>
      {/* Top menu bar */}
      <div
        style={{
          display: "flex",
          gap: "1rem",
          padding: "0.75rem 1rem",
          borderBottom: "1px solid var(--border)",
          background: "var(--bg-panel)",
        }}
      >
        <strong>Herringbone</strong>
        <Link to="/">Home</Link>
        <Link to="/logingestion">Log Ingestion</Link>
        <Link to="/cardset">CardSet</Link>
        <Link to="/ruleset">RuleSet</Link>
      </div>

      {/* Page content */}
      <div style={{ padding: "1rem" }}>
        <Outlet />
      </div>
    </div>
  )
}

export default App
