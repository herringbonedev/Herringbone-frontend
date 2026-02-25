import { useEffect, useState } from "react"
import type { EventLog } from "./types"

function safeJsonParse(text: string) {
  let t = (text ?? "").trim()

  if (
    (t.startsWith("'") && t.endsWith("'")) ||
    (t.startsWith('"') && t.endsWith('"'))
  ) {
    t = t.slice(1, -1).trim()
  }

  if (
    (t.startsWith("b'") && t.endsWith("'")) ||
    (t.startsWith('b"') && t.endsWith('"'))
  ) {
    t = t.slice(2, -1).trim()
  }

  if (t.charCodeAt(0) === 0xfeff) {
    t = t.slice(1)
  }

  if (!t) return []

  return JSON.parse(t)
}

function authHeaders(extra?: Record<string, string>) {
  const token = localStorage.getItem("hb_token")
  return {
    Authorization: `Bearer ${token}`,
    ...(extra || {}),
  }
}

export function useEventsApi() {
  const [logs, setLogs] = useState<EventLog[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/herringbone/logs/events`, {
        headers: authHeaders(),
      })

      if (!res.ok) {
        const body = await res.text().catch(() => "")
        if (res.status === 401) {
          throw new Error("Unauthorized – please log in again")
        }
        throw new Error(body || `HTTP ${res.status}`)
      }

      const text = await res.text()
      const data = safeJsonParse(text)

      setLogs(Array.isArray(data) ? (data as EventLog[]) : [])
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
