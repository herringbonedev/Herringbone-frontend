import { useEffect, useState } from "react"
import type { EventLog } from "./types"
import { apiFetch } from "../../../api"

export function useEventsApi() {
  const [logs, setLogs] = useState<EventLog[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await apiFetch(`/herringbone/logs/events`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setLogs(Array.isArray(data) ? data : [])
    } catch (e: any) {
      setError(e?.message || "Failed to load events")
      setLogs([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  return { logs, loading, error, reload: load }
}
