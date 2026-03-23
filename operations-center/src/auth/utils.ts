export type ScopeItem = {
  scope: string
  tier: "free" | "enterprise"
}

export function groupByPrefix(items: ScopeItem[]) {
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

export function safeDateString(v: any) {
  if (!v) return "-"
  try {
    const d = new Date(v)
    if (isNaN(d.getTime())) return String(v)
    return d.toLocaleString()
  } catch {
    return String(v)
  }
}

const CTX_KEY = "hb_context_id"

export function authHeaders(token: string | null, extra?: Record<string, string>) {
  const ctx = localStorage.getItem(CTX_KEY)

  const headers: Record<string, string> = {
    ...(extra || {})
  }

  if (token) headers["Authorization"] = `Bearer ${token}`
  if (ctx) headers["X-Herringbone-Context"] = ctx

  return headers
}