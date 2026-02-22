import { useParams } from "react-router-dom"
import { useIncidentDetail } from "./useIncidentDetail"
import { useIncidentEvents } from "./eventsApi"
import { addIncidentNote, updateIncident } from "./incidentApi"
import { useState, useEffect } from "react"
import "./incidents.css"

type TeamUser = {
  email: string
  role: string
}

function fmt(ts: string) {
  return new Date(ts).toLocaleString()
}

function getCurrentUserEmail(): string {
  const token = localStorage.getItem("hb_token")
  if (!token) return "unknown"

  try {
    const payload = JSON.parse(atob(token.split(".")[1]))
    return payload.email || payload.sub || "unknown"
  } catch {
    return "unknown"
  }
}

function buildIndicators(events: any[]) {
  const map = new Map<string, Set<string>>()

  for (const ev of events) {
    if (!ev.parsed) continue

    for (const [key, values] of Object.entries(ev.parsed)) {
      if (!Array.isArray(values) || values.length === 0) continue
      if (!map.has(key)) map.set(key, new Set())
      for (const v of values) {
        map.get(key)!.add(v)
      }
    }
  }

  return Array.from(map.entries()).map(([key, values]) => ({
    key,
    values: Array.from(values),
  }))
}

export default function IncidentDetailPage() {
  const { incidentId } = useParams()
  const { incident, loading, error, reload } = useIncidentDetail(incidentId!)
  const [note, setNote] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [updating, setUpdating] = useState(false)

  const [owner, setOwner] = useState("")

  const [users, setUsers] = useState<TeamUser[]>([])
  const [usersLoading, setUsersLoading] = useState(true)

  const eventIds = incident?.events ?? []

  const {
    events: relatedEvents,
    loading: eventsLoading,
  } = useIncidentEvents(eventIds)

  const indicators = buildIndicators(relatedEvents)

  useEffect(() => {
    if (incident) {
      setOwner(incident.owner ?? "")
    }
  }, [incident?.owner])

  useEffect(() => {
    const token = localStorage.getItem("hb_token")
    if (!token) {
      setUsersLoading(false)
      return
    }

    const base = import.meta.env.VITE_HERRINGBONE_API_BASE + ":7001"

    fetch(`${base}/herringbone/auth/users`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then(res => res.json())
      .then(data => {
        setUsers(data.users || [])
      })
      .catch(() => {})
      .finally(() => setUsersLoading(false))
  }, [])

  if (loading) return <div className="page">Loading…</div>
  if (error) return <div className="page error">{error}</div>
  if (!incident) return <div className="page">Incident not found</div>

  const i = incident

  async function updateField(field: string, value: any) {
    setUpdating(true)
    try {
      await updateIncident(i._id, { [field]: value })
      await reload()
    } finally {
      setUpdating(false)
    }
  }

  async function submitNote() {
    if (!note.trim()) return
    setSubmitting(true)
    try {
      const author = getCurrentUserEmail()
	  await addIncidentNote(i._id, author, note.trim())
      setNote("")
      await reload()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="incident-page">
      <div className="incident-panel incident-header">
        <h2>{i.title ?? "Untitled Incident"}</h2>

        <div className="incident-meta">
          <select
            className="incident-pill priority"
            value={i.priority ?? "low"}
            disabled={updating}
            onChange={e => updateField("priority", e.target.value)}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>

          <select
            className="incident-pill status"
            value={i.status ?? "open"}
            disabled={updating}
            onChange={e => updateField("status", e.target.value)}
          >
            <option value="open">Open</option>
            <option value="investigating">Investigating</option>
            <option value="resolved">Resolved</option>
          </select>

          <select
            className="incident-pill owner"
            value={owner}
            disabled={updating || usersLoading}
            onChange={e => {
              const val = e.target.value
              setOwner(val)
              updateField("owner", val || null)
            }}
          >
            <option value="">Unassigned</option>

            {users.map(u => (
              <option key={u.email} value={u.email}>
                {u.email} ({u.role})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="incident-grid">
        <div className="incident-panel">
          <div className="section-title">Indicators</div>

          {indicators.length === 0 && (
            <div className="empty">No indicators extracted</div>
          )}

          <div className="indicator-table">
            {indicators.map(ind => (
              <div key={ind.key} className="indicator-row">
                <div className="indicator-key">{ind.key}</div>
                <div className="indicator-values">
                  {ind.values.join(", ")}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="incident-panel">
          <div className="section-title">Related Events</div>

          {eventsLoading && <div className="empty">Loading events…</div>}

          {!eventsLoading && relatedEvents.length === 0 && (
            <div className="empty">No related events</div>
          )}

          <div className="mono-list">
            {relatedEvents.map(ev => (
              <div key={ev._id} className="event-row">
                <span className="event-id">{ev._id}</span>
                {ev.state?.severity !== null &&
                  ev.state?.severity !== undefined && (
                    <span className="event-severity">
                      Severity {ev.state.severity}
                    </span>
                  )}
              </div>
            ))}
          </div>
        </div>

        <div className="incident-panel">
          <div className="section-title">Notes</div>

          {i.notes.length === 0 && (
            <div className="empty">No notes yet</div>
          )}

          <div className="note-list">
            {i.notes.map((n, idx) => (
              <div key={idx} className="note-item">
                <div className="note-meta">
                  <span>{n.author}</span>
                  <span>{fmt(n.timestamp)}</span>
                </div>
                <div className="note-body">{n.message}</div>
              </div>
            ))}
          </div>

          <div className="note-input">
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={2}
              placeholder="Add analyst note…"
            />
            <button onClick={submitNote} disabled={submitting}>
              {submitting ? "Adding…" : "Add"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
