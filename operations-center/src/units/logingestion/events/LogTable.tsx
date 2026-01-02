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

function severityColor(sev: number) {
	if (sev >= 75) return "rgba(220, 38, 38, 0.25)"
	if (sev >= 50) return "rgba(245, 158, 11, 0.25)"
	if (sev >= 25) return "rgba(234, 179, 8, 0.25)"
	return "rgba(34, 197, 94, 0.20)"
}

function DetailsCell({ log }: { log: EventLog }) {
	const [open, setOpen] = useState(false)

	const state = log.state || {}
	const sev = state.severity

	const lines: Array<[string, string]> = [
		["id", log._id],
		["source.address", log.source?.address || ""],
		["source.kind", log.source?.kind || ""],
		["event_time", log.event_time || ""],
		["ingested_at", log.ingested_at || ""],
		["state.detected", String(state.detected ?? false)],
		["state.enriched", String(state.enriched ?? false)],
		["state.parsed", String(state.parsed ?? false)],
		["state.severity", sev == null ? "" : String(sev)],
		["state.last_updated", state.last_updated || ""],
	]

	return (
		<div>
			<button
				onClick={() => setOpen(o => !o)}
				style={{
					border: "1px solid var(--border)",
					background: "var(--bg-panel-2)",
					color: "var(--color-text)",
					cursor: "pointer",
					padding: "0.15rem 0.45rem",
					borderRadius: "6px",
					fontSize: "0.8rem",
				}}
			>
				{open ? "Hide" : "Details"}
			</button>

			{open && (
				<div
					style={{
						marginTop: "0.35rem",
						padding: "0.35rem 0.5rem",
						background: "var(--bg-panel-2)",
						border: "1px solid var(--border)",
						borderRadius: "6px",
						fontFamily: "monospace",
						fontSize: "0.75rem",
						maxWidth: "520px",
						whiteSpace: "pre-wrap",
						wordBreak: "break-word",
					}}
				>
					{lines
						.filter(([_, v]) => v != null && String(v).trim() !== "")
						.map(([k, v]) => (
							<div key={k}>
								<strong>{k}</strong>: {v}
							</div>
						))}
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
					<th>State</th>
					<th>Message</th>
				</tr>
			</thead>
			<tbody>
				{logs.map(log => {
					const sev = log.state?.severity
					return (
						<tr
							key={log._id}
							style={
								sev != null
									? { background: severityColor(sev) }
									: undefined
							}
						>
							<td>{fmt(log.event_time)}</td>
							<td>{log.source?.address || ""}</td>
							<td>
								<DetailsCell log={log} />
							</td>
							<td>{log.raw}</td>
						</tr>
					)
				})}
			</tbody>
		</table>
	)
}
