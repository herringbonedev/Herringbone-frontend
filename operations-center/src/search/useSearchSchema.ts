import { useEffect, useState } from "react"
import { apiFetch } from "../api"

export type SchemaField = {
  path: string
  types: string[]
  enum?: string[]
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
        const res = await apiFetch(`/herringbone/search/${collection}/schema`)
        const data = await res.json()
        if (!res.ok) throw new Error(data?.detail || `HTTP ${res.status}`)

        const normalized: SchemaField[] = (data.fields || []).map((f: any) => ({
          path: f.path || f.name || "",
          types: Array.isArray(f.types)
            ? f.types
            : f.type
              ? [f.type]
              : [],
          enum: Array.isArray(f.enum) ? f.enum : undefined,
        }))

        if (!cancelled) setFields(normalized)
      } catch (e) {
        const err = e as Error
        if (!cancelled) setError(err.message || "Schema load failed")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [collection])

  return { fields, loading, error }
}