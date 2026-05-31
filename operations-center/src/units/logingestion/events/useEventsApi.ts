import { useEffect, useState } from "react"
import type { EventLog } from "./types"
import { apiFetch } from "../../../api"

type EventsPayload =
  | EventLog[]
  | {
      events?: EventLog[]
      logs?: EventLog[]
      items?: EventLog[]
      results?: EventLog[]
      data?: EventLog[]
      total?: number
      count?: number
      limit?: number
    }

function extractEvents(payload: EventsPayload): EventLog[] {
  if (Array.isArray(payload)) return payload
  if (!payload || typeof payload !== "object") return []

  for (const key of ["events", "logs", "items", "results", "data"] as const) {
    const value = payload[key]
    if (Array.isArray(value)) return value
  }

  return []
}

const MAX_BACKEND_EVENTS = 500

export function useEventsApi(limit = 100) {
  const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), MAX_BACKEND_EVENTS)
  const [logs, setLogs] = useState<EventLog[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [backendNotice, setBackendNotice] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    setBackendNotice(null)

    try {
      const requested = String(safeLimit)
      const qs = new URLSearchParams({
        // herringbone-logs currently uses `n` for event count.
        // Keep common aliases too so this remains compatible if the API is normalized later.
        n: requested,
        limit: requested,
        page_size: requested,
        per_page: requested,
        count: requested,
        _: String(Date.now()),
      })

      const res = await apiFetch(`/herringbone/logs/events?${qs.toString()}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      const data = await res.json() as EventsPayload
      const extracted = extractEvents(data)
      setLogs(extracted)

      if (limit > MAX_BACKEND_EVENTS) {
        setBackendNotice(`The backend supports up to ${MAX_BACKEND_EVENTS} events per request. Showing ${extracted.length} events.`)
      } else if (extracted.length < safeLimit && extracted.length === 25) {
        setBackendNotice(`Requested ${safeLimit} events, but the backend returned 25. The UI is displaying every event it received.`)
      } else if (extracted.length < safeLimit) {
        setBackendNotice(`Requested ${safeLimit} events, but the backend returned ${extracted.length}. The UI is displaying every event it received.`)
      }
    } catch (e: any) {
      setError(e?.message || "Failed to load events")
      setLogs([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [safeLimit])

  return { logs, loading, error, backendNotice, requestedLimit: safeLimit, reload: load }
}
