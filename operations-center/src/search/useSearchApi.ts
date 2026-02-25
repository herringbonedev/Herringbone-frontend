import { useState } from "react"

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
  return JSON.parse(trimmed)
}

function authHeaders(extra?: Record<string, string>) {
  const token = localStorage.getItem("hb_token")
  return {
    Authorization: `Bearer ${token}`,
    ...(extra || {}),
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
    filterField?: string | null,
    filterKind?: "range" | "in" | null,
    filterMin?: number | null,
    filterMax?: number | null,
    filterIn?: string | null
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

      if (filterField) params.set("filter_field", filterField)
      if (filterKind) params.set("filter_kind", filterKind)
      if (filterMin != null) params.set("filter_min", String(filterMin))
      if (filterMax != null) params.set("filter_max", String(filterMax))
      if (filterIn) params.set("filter_in", filterIn)

      const res = await fetch(
        `/herringbone/search/${collection}?${params.toString()}`,
        {
          headers: authHeaders({
            Accept: "application/json",
          }),
        }
      )

      const data = await safeReadJson(res)

      if (!res.ok) {
        if (res.status === 401) {
          throw new Error("Unauthorized – please log in again")
        }
        throw new Error(data?.detail || `HTTP ${res.status}`)
      }

      return data as SearchResponse
    } catch (err: any) {
      setError(err.message || "Search failed")
      throw err
    } finally {
      setLoading(false)
    }
  }

  return { search, loading, error }
}
