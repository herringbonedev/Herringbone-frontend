import { useNavigate } from "react-router-dom"
import { useIncidentList } from "./useIncidentList"

function fmt(ts?: string) {
	if (!ts) return ""
	return new Date(ts).toLocaleString()
}

export default function IncidentListPage() {
	const { incidents, loading, error, reload } = useIncidentList()
	const navigate = useNavigate()

	return (
		<div style={{ padding: "1.25rem" }}>
			<h2>Incidents</h2>

			<div style={{ marginBottom: "0.75rem" }}>
				<button onClick={reload}>Reload</button>
			</div>

			{loading && <div>Loading…</div>}
			{error && <div style={{ color: "red" }}>{error}</div>}

			{!loading && incidents.length === 0 && <div>No incidents found.</div>}

			{!loading && incidents.length > 0 && (
				<table style={{ width: "100%", borderCollapse: "collapse" }}>
					<thead>
						<tr>
							<th>Priority</th>
							<th>Status</th>
							<th>Title</th>
							<th>Events</th>
							<th>Detections</th>
							<th>Notes</th>
							<th>Created</th>
							<th>Updated</th>
							<th>Owner</th>
						</tr>
					</thead>
					<tbody>
						{incidents.map(i => (
							<tr
								key={i._id}
								style={{ cursor: "pointer" }}
								onClick={() => navigate(`/incidents/${i._id}`)}
							>
								<td>{i.priority ?? "—"}</td>
								<td>{i.status ?? "—"}</td>
								<td>{i.title ?? "(no title)"}</td>
								<td>{i.events.length}</td>
								<td>{i.detections.length}</td>
								<td>{i.notes.length}</td>
								<td>{fmt(i.created_at)}</td>
								<td>{fmt(i.updated_at)}</td>
								<td>{i.owner ?? "Unassigned"}</td>
							</tr>
						))}
					</tbody>
				</table>
			)}
		</div>
	)
}
