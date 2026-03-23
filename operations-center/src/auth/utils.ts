import { getActiveToken, getContextId } from "../api"

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

export function authHeaders(token?: string | null, extra?: Record<string, string>) {
  const headers: Record<string, string> = {
    ...(extra || {}),
  }

  const authToken = token === undefined ? getActiveToken() : token
  const ctx = getContextId()

  if (authToken) headers.Authorization = `Bearer ${authToken}`
  if (ctx) headers["X-Context-Id"] = ctx

  return headers
}
