import { useIncidents } from "./useIncidents"

function fmt(ts?: string) {
	if (!ts) return ""
	return new Date(ts).toLocaleString()
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

			{!loading && incidents.length === 0 && <div>No incidents found.</div>}

			{!loading && incidents.length > 0 && (
				<table style={{ width: "100%", borderCollapse: "collapse" }}>
					<thead>
						<tr>
							<th align="left">Priority</th>
							<th align="left">Status</th>
							<th align="left">Title</th>
							<th align="left">Created</th>
							<th align="left">Updated</th>
							<th align="left">Owner</th>
						</tr>
					</thead>
					<tbody>
						{incidents.map(i => (
							<tr key={i._id}>
								<td>{i.priority ?? "—"}</td>
								<td>{i.status ?? "—"}</td>
								<td>{i.title ?? "(no title)"}</td>
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
