import { Link } from "react-router-dom"
import { useIncidentList } from "./useIncidentList"

export default function IncidentListPage() {
	const { incidents, loading, error, reload } = useIncidentList()

	return (
		<div style={{ padding: "1rem" }}>
			<h2>Incidents</h2>

			{error && (
				<div className="panel sev-med">
					{error}
					<button onClick={reload} style={{ marginLeft: "1rem" }}>
						Retry
					</button>
				</div>
			)}

			<table>
				<thead>
					<tr>
						<th>Created</th>
						<th>Title</th>
						<th>Status</th>
						<th>Priority</th>
						<th>Owner</th>
					</tr>
				</thead>
				<tbody>
					{incidents.map((incident, idx) => {
						let id: string | null = null

						if (typeof incident._id === "string") {
							id = incident._id
						} else if (
							incident._id &&
							typeof incident._id === "object" &&
							"$oid" in incident._id
						) {
							id = (incident._id as any).$oid
						}

						if (!id) {
							// Skip broken rows instead of poisoning routing
							return null
						}

						return (
							<tr key={id}>
								<td>
									{incident.created_at
										? new Date(
												incident.created_at
										  ).toLocaleString()
										: "—"}
								</td>
								<td>
									<Link to={`/incidents/${id}`}>
										{incident.title}
									</Link>
								</td>
								<td>{incident.status}</td>
								<td
									className={
										incident.priority === "high"
											? "sev-high"
											: ""
									}
								>
									{incident.priority}
								</td>
								<td>{incident.owner ?? "unassigned"}</td>
							</tr>
						)
					})}

					{!loading && incidents.length === 0 && (
						<tr>
							<td colSpan={5}>No incidents</td>
						</tr>
					)}
				</tbody>
			</table>
		</div>
	)
}
