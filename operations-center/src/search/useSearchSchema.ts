import { useEffect, useState } from "react"
import { apiFetch } from "../api"

export function useSearchSchema(collection: string) {
  const [fields, setFields] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)

      try {
        const res = await apiFetch(`/herringbone/search/${collection}/schema`)
        const data = await res.json()
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
