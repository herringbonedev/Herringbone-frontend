import type { ReactNode } from "react"
import { useDashboardApi } from "./useDashboardApi"

function Panel(props: { title: string; children: ReactNode }) {
	return (
		<div className="panel">
			<h3>{props.title}</h3>
			{props.children}
		</div>
	)
}

export default function Dashboard() {
	const {
		summary,
		events,
		detections,
		loading,
		error,
		reload,
	} = useDashboardApi()

	return (
		<div style={{ padding: "1rem" }}>
			<h1>Herringbone Dashboard</h1>

			{error && (
				<div className="panel sev-med" style={{ marginBottom: "1rem" }}>
					<strong>Error:</strong> {error}
					<button
						style={{ marginLeft: "1rem" }}
						onClick={reload}
					>
						Retry
					</button>
				</div>
			)}

			{/* KPI ROW */}
			<div
				style={{
					display: "grid",
					gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
					gap: "1rem",
					marginBottom: "1rem",
				}}
			>
				<Panel title="Events (24h)">
					<strong>{summary?.events_24h ?? "—"}</strong>
				</Panel>

				<Panel title="Detected">
					<strong className="sev-high">
						{summary?.detected ?? "—"}
					</strong>
				</Panel>

				<Panel title="Undetected">
					<strong>{summary?.undetected ?? "—"}</strong>
				</Panel>

				<Panel title="High Severity">
					<strong className="sev-high">
						{summary?.high_severity ?? "—"}
					</strong>
				</Panel>

				<Panel title="Failed">
					<strong className="sev-med">
						{summary?.failed ?? "—"}
					</strong>
				</Panel>
			</div>

			{/* LOWER ROW */}
			<div
				style={{
					display: "grid",
					gridTemplateColumns: "2fr 1fr",
					gap: "1rem",
				}}
			>
				<Panel title="Recent Events">
					<table>
						<thead>
							<tr>
								<th>Time</th>
								<th>Source</th>
								<th>Status</th>
								<th>Severity</th>
							</tr>
						</thead>
						<tbody>
							{events.map(e => (
								<tr key={e.event_id}>
									<td>
										{e.ingested_at
											? new Date(e.ingested_at).toLocaleString()
											: "—"}
									</td>
									<td>{e.source?.address ?? "—"}</td>
									<td>
										{e.error
											? <span className="sev-med">error</span>
											: e.detected
											? <span className="sev-high">detected</span>
											: "ok"}
									</td>
									<td>{e.severity ?? "—"}</td>
								</tr>
							))}
							{!loading && events.length === 0 && (
								<tr>
									<td colSpan={4}>No recent events</td>
								</tr>
							)}
						</tbody>
					</table>
				</Panel>

				<Panel title="Recent Detections">
					<table>
						<thead>
							<tr>
								<th>Time</th>
								<th>Severity</th>
							</tr>
						</thead>
						<tbody>
							{detections.map((d, i) => (
								<tr key={i}>
									<td>
										{d.inserted_at
											? new Date(d.inserted_at).toLocaleString()
											: "—"}
									</td>
									<td className="sev-high">
										{d.severity ?? "—"}
									</td>
								</tr>
							))}
							{!loading && detections.length === 0 && (
								<tr>
									<td colSpan={2}>No detections</td>
								</tr>
							)}
						</tbody>
					</table>
				</Panel>
			</div>
		</div>
	)
}
