import { useEffect, useState } from "react"

const API_BASE =
  `${import.meta.env.VITE_HERRINGBONE_API_BASE || `${window.location.protocol}//${window.location.hostname}`}:7010`

export type Summary = {
  events_24h: number
  detected: number
  undetected: number
  high_severity: number
  failed: number
}

export type RecentEvent = {
  event_id: string
  ingested_at?: string
  source?: { address?: string }
  detected: boolean
  severity?: number
  error?: string
}

export type RecentDetection = {
  event_id: string
  severity?: number
  inserted_at?: string
}

export type RecentIncident = {
  incident_id: string
  title: string
  status: string
  priority: string
  owner: string | null
  created_at?: string
}

export type IncidentThroughputPoint = {
  ts: number   // unix ms timestamp
  open: number
  resolved: number
}

function authFetch(url: string) {
  const token = localStorage.getItem("hb_token")

  return fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
}

export function useDashboardApi() {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [events, setEvents] = useState<RecentEvent[]>([])
  const [detections, setDetections] = useState<RecentDetection[]>([])
  const [incidents, setIncidents] = useState<RecentIncident[]>([])
  const [throughput, setThroughput] = useState<IncidentThroughputPoint[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)

    try {
      const [s, e, d, i, t] = await Promise.all([
        authFetch(`${API_BASE}/herringbone/logs/dashboard/summary`),
        authFetch(`${API_BASE}/herringbone/logs/dashboard/recent-events?n=10`),
        authFetch(`${API_BASE}/herringbone/logs/dashboard/recent-detections?n=10`),
        authFetch(`${API_BASE}/herringbone/logs/dashboard/recent-incidents?n=10`),
        authFetch(`${API_BASE}/herringbone/logs/dashboard/incidents-throughput?days=7`),
      ])

      if (!s.ok || !e.ok || !d.ok || !i.ok || !t.ok) {
        if ([s, e, d, i, t].some(r => r.status === 401)) {
          throw new Error("Unauthorized – please log in again")
        }
        throw new Error("Failed to load dashboard data")
      }

      const summaryJson = await s.json()
      const eventsJson = await e.json()
      const detectionsJson = await d.json()
      const incidentsJson = await i.json()
      const throughputJson = await t.json()

      setSummary(summaryJson)
      setEvents(eventsJson)
      setDetections(detectionsJson)
      setIncidents(incidentsJson)

      const normalizedThroughput: IncidentThroughputPoint[] = (throughputJson || []).map((p: any) => ({
        ts: typeof p.ts === "string" ? Date.parse(p.ts) : Number(p.ts),
        open: Number(p.open) || 0,
        resolved: Number(p.resolved) || 0,
      }))

      setThroughput(normalizedThroughput)
    } catch (err: any) {
      setError(err?.message || "Failed to load dashboard")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  return {
    summary,
    events,
    detections,
    incidents,
    throughput,
    loading,
    error,
    reload: load,
  }
}
