import { useEffect, useState } from "react"

export type SchemaField = {
  path: string
  types: string[]
  examples: any[]
  enum: string[]
}

const API_BASE = "http://127.0.0.1:7014"

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
          { headers: { Accept: "application/json" } }
        )

        const text = await res.text()
        const data = text.trim() ? JSON.parse(text) : null

        if (!res.ok) throw new Error(data?.detail || `HTTP ${res.status}`)

        if (!cancelled) setFields(data.fields || [])
      } catch (e: any) {
        if (!cancelled) setError(e.message || "Schema load failed")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [collection])

  return { fields, loading, error }
}
