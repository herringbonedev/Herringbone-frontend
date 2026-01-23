import { useParams } from "react-router-dom"
import { useIncidentDetail } from "./useIncidentDetail"
import { useIncidentEvents } from "./eventsApi"
import { addIncidentNote, updateIncident } from "./incidentApi"
import { useState, useEffect } from "react"
import "./incidents.css"

function fmt(ts: string) {
	return new Date(ts).toLocaleString()
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

	// Local editable owner field
	const [owner, setOwner] = useState("")

	const eventIds = incident?.events ?? []

	const {
		events: relatedEvents,
		loading: eventsLoading,
	} = useIncidentEvents(eventIds)

	const indicators = buildIndicators(relatedEvents)

	// Keep owner in sync with backend value
	useEffect(() => {
		if (incident) {
			setOwner(incident.owner ?? "")
		}
	}, [incident?.owner])

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
			await addIncidentNote(i._id, "analyst", note.trim())
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

					<input
						className="incident-pill owner"
						placeholder="Assign to…"
						value={owner}
						disabled={updating}
						onChange={e => setOwner(e.target.value)}
						onBlur={() => updateField("owner", owner || null)}
						onKeyDown={e => {
							if (e.key === "Enter") {
								updateField("owner", owner || null)
							}
						}}
					/>
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

					{eventsLoading && (
						<div className="empty">Loading events…</div>
					)}

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
