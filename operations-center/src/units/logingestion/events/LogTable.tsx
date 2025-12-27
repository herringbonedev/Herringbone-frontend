import { useState } from "react"
import type { EventLog } from "./types"

type Props = {
	logs: EventLog[]
}

function fmt(ts?: string) {
	if (!ts) return ""
	try {
		return new Date(ts).toLocaleString()
	} catch {
		return ts
	}
}

function ReconCell({ log }: { log: EventLog }) {
	const [open, setOpen] = useState(false)

	if (!log.recon) {
		return <span style={{ opacity: 0.5 }}>—</span>
	}

	const results = log.recon_data?.results || {}
	const keys = Object.keys(results)

	return (
		<div>
			<button
				onClick={() => setOpen(o => !o)}
				style={{
					border: "none",
					background: "transparent",
					cursor: "pointer",
					fontSize: "0.9rem",
				}}
				title="Toggle recon details"
			>
				{open ? "▼" : "▶"} Recon
			</button>

			{open && (
				<div
					style={{
						marginTop: "0.25rem",
						padding: "0.25rem 0.5rem",
						background: "var(--bg-panel-2)",
						border: "1px solid var(--border)",
						borderRadius: "4px",
						fontFamily: "monospace",
						fontSize: "0.75rem",
						maxWidth: "400px",
						whiteSpace: "pre-wrap",
					}}
				>
					{keys.length === 0 && (
						<div style={{ opacity: 0.7 }}>
							No recon fields
						</div>
					)}

					{keys.map(k => {
						const v = results[k]
						const val = Array.isArray(v)
							? v.join(", ")
							: typeof v === "string"
							? v
							: JSON.stringify(v)

						return (
							<div key={k}>
								<strong>{k}</strong>: {val || "—"}
							</div>
						)
					})}
				</div>
			)}
		</div>
	)
}

export function LogTable({ logs }: Props) {
	return (
		<table>
			<thead>
				<tr>
					<th>Time</th>
					<th>Source</th>
					<th>Detected</th>
					<th>Recon</th>
					<th>Message</th>
				</tr>
			</thead>
			<tbody>
				{logs.map(log => (
					<tr key={log._id.$oid}>
						<td>{fmt(log.last_update?.$date)}</td>
						<td>{log.source_address}</td>
						<td>{log.detected ? "Yes" : "No"}</td>
						<td>
							<ReconCell log={log} />
						</td>
						<td>{log.raw_log}</td>
					</tr>
				))}
			</tbody>
		</table>
	)
}
