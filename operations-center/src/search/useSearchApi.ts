import { useState } from "react"

const API_BASE = "http://127.0.0.1:7014"

export type SearchResponse = {
  collection: string
  count: number
  results: any[]
  next_after?: string | null
}

async function safeReadJson(res: Response) {
  const text = await res.text()
  const trimmed = text.trim()

  if (!trimmed) return null

  try {
    return JSON.parse(trimmed)
  } catch {
    throw new Error(
      `Backend returned non-JSON (HTTP ${res.status}): ${trimmed.slice(0, 120)}`
    )
  }
}

export function useSearchApi() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function search(
    collection: string,
    query: Record<string, any>,
    limit = 100,
    after?: string | null,
    fromTs?: string | null,
    toTs?: string | null,
    severityMin?: number | null,
    severityMax?: number | null
  ) {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()

      params.set("limit", String(limit))
      params.set("q", JSON.stringify(query))

      if (after) params.set("after", after)
      if (fromTs) params.set("from_ts", fromTs)
      if (toTs) params.set("to_ts", toTs)

      if (severityMin !== null && severityMin !== undefined) {
        params.set("severity_min", String(severityMin))
      }

      if (severityMax !== null && severityMax !== undefined) {
        params.set("severity_max", String(severityMax))
      }

      const res = await fetch(
        `${API_BASE}/herringbone/search/${collection}?${params.toString()}`,
        { headers: { Accept: "application/json" } }
      )

      const data = await safeReadJson(res)

      if (!res.ok) {
        const msg =
          typeof data?.detail === "string"
            ? data.detail
            : `HTTP ${res.status}`
        throw new Error(msg)
      }

      return data as SearchResponse
    } catch (err: any) {
      const msg = err?.message || "Search failed"
      setError(msg)
      throw err
    } finally {
      setLoading(false)
    }
  }

  return { search, loading, error }
}
