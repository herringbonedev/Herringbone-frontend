import { useEffect, useState } from "react"

export type SchemaField = {
  path: string
  types: string[]
  examples: any[]
  enum: string[]
}

const API_BASE = `${(import.meta.env.VITE_HERRINGBONE_API_BASE ?? `${window.location.protocol}//${window.location.hostname}`)}:7014`

function authHeaders(extra?: Record<string, string>) {
  const token = localStorage.getItem("hb_token")
  return {
    Authorization: `Bearer ${token}`,
    ...(extra || {}),
  }
}

export function useSearchSchema(collection: string) {
  const [fields, setFields] = useState<SchemaField[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)

      try {
        const res = await fetch(
          `${API_BASE}/herringbone/search/${collection}/schema`,
          {
            headers: authHeaders({
              Accept: "application/json",
            }),
          }
        )

        const text = await res.text()
        const data = text.trim() ? JSON.parse(text) : null

        if (!res.ok) {
          if (res.status === 401) {
            throw new Error("Unauthorized – please log in again")
          }
          throw new Error(data?.detail || `HTTP ${res.status}`)
        }

        if (!cancelled) setFields(data.fields || [])
      } catch (e: any) {
        if (!cancelled) setError(e.message || "Schema load failed")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [collection])

  return { fields, loading, error }
}
