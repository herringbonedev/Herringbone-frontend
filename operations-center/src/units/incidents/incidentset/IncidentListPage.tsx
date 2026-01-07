import { useIncidents } from "./useIncidents"
import type { Incident } from "./types"

function fmt(ts?: string) {
	if (!ts) return ""
	try {
		return new Date(ts).toLocaleString()
	} catch {
		return ts
	}
}

export default function IncidentListPage() {
	const { incidents, loading, error, reload } = useIncidents()

	return (
		<div style={{ padding: "1.25rem" }}>
			<h2>Incidents</h2>

			<div style={{ marginBottom: "0.75rem" }}>
				<button onClick={reload}>Reload</button>
			</div>

			{loading && <div>Loading…</div>}
			{error && <div style={{ color: "red" }}>{error}</div>}

			{!loading && incidents.length === 0 && (
				<div>No incidents found.</div>
			)}

			{!loading && incidents.length > 0 && (
				<table style={{ width: "100%", borderCollapse: "collapse" }}>
					<thead>
						<tr>
							<th align="left">Severity</th>
							<th align="left">Status</th>
							<th align="left">Title</th>
							<th align="left">Created</th>
							<th align="left">Updated</th>
						</tr>
					</thead>
					<tbody>
						{incidents.map((i: Incident) => (
							<tr key={i._id}>
								<td>{i.severity ?? "—"}</td>
								<td>{i.status ?? "—"}</td>
								<td>{i.title ?? "(no title)"}</td>
								<td>{fmt(i.created_at)}</td>
								<td>{fmt(i.updated_at)}</td>
							</tr>
						))}
					</tbody>
				</table>
			)}
		</div>
	)
}
