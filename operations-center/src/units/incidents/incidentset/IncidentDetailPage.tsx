import { useState } from "react"
import { useParams } from "react-router-dom"
import { useIncidentDetail } from "./useIncidentDetail"
import type { Incident } from "./incidentTypes"

const STATUSES = ["open", "investigating", "resolved"]
const PRIORITIES = ["low", "medium", "high", "critical"]

export default function IncidentDetailPage() {
	const params = useParams()

	// Hard guard: route param must exist
	if (!params.id) {
		return <div>Invalid incident ID</div>
	}

	const { incident, loading, error, reload } =
		useIncidentDetail(params.id)

	const [owner, setOwner] = useState("")
	const [status, setStatus] = useState("")
	const [priority, setPriority] = useState("")
	const [saving, setSaving] = useState(false)

	if (loading) return <div>Loading…</div>
	if (error || !incident) return <div>Error loading incident</div>

	// Initialize local state once
	if (!owner && !status && !priority) {
		setOwner(incident.owner ?? "")
		setStatus(incident.status)
		setPriority(incident.priority)
	}

	async function save() {
		setSaving(true)

		try {
			await fetch(
				"http://127.0.0.1:7011/incidents/incidentset/update_incident",
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						...incident,
						owner,
						status,
						priority,
						updated_at: new Date().toISOString(),
					}),
				}
			)
			reload()
		} catch {
			alert("Failed to update incident")
		} finally {
			setSaving(false)
		}
	}

	return (
		<div style={{ padding: "1.5rem", width: "100%" }}>
			<h1 style={{ marginBottom: "0.25rem" }}>
				{incident.title}
			</h1>

			<div
				style={{
					color: "var(--text-muted)",
					marginBottom: "1rem",
				}}
			>
				Status: <strong>{incident.status}</strong> · Priority:{" "}
				<strong>{incident.priority}</strong>
			</div>

			<div
				style={{
					display: "grid",
					gridTemplateColumns: "2fr 1fr",
					gap: "1.5rem",
				}}
			>
				<div>
					<div className="panel">
						<h3>Description</h3>
						<p>{incident.description}</p>
					</div>
				</div>

				<div>
					<div className="panel">
						<h3>Assignment</h3>

						<label>
							Owner
							<input
								type="text"
								value={owner}
								onChange={e => setOwner(e.target.value)}
								placeholder="username or email"
							/>
						</label>

						<label>
							Status
							<select
								value={status}
								onChange={e => setStatus(e.target.value)}
							>
								{STATUSES.map(s => (
									<option key={s} value={s}>
										{s}
									</option>
								))}
							</select>
						</label>

						<label>
							Priority
							<select
								value={priority}
								onChange={e => setPriority(e.target.value)}
							>
								{PRIORITIES.map(p => (
									<option key={p} value={p}>
										{p}
									</option>
								))}
							</select>
						</label>

						<button
							onClick={save}
							disabled={saving}
							style={{ marginTop: "0.75rem" }}
						>
							{saving ? "Saving…" : "Save Changes"}
						</button>
					</div>

					<div className="panel" style={{ marginTop: "1rem" }}>
						<h3>Linked Objects</h3>
						<div>
							Detections: {incident.detections?.length ?? 0}
						</div>
						<div>
							Events: {incident.events?.length ?? 0}
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}
