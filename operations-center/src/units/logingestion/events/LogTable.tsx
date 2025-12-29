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

// Map severity → row color
function severityColor(sev: number) {
	if (sev >= 8) return "rgba(220, 38, 38, 0.25)"   // red
	if (sev >= 5) return "rgba(245, 158, 11, 0.25)" // orange
	if (sev >= 3) return "rgba(234, 179, 8, 0.25)"  // yellow
	return "rgba(34, 197, 94, 0.20)"                // green
}

function ReconCell({ log }: { log: EventLog }) {
	const [open, setOpen] = useState(false)

	if (!log.recon) {
		return <span style={{ opacity: 0.5 }}>—</span>
	}

	const results = log.recon_data?.results || {}

	const entries = Object.entries(results).filter(([_, v]) => {
		if (v == null) return false
		if (Array.isArray(v)) return v.length > 0
		if (typeof v === "string") return v.trim().length > 0
		return true
	})

	return (
		<div>
			<button
				onClick={() => setOpen(o => !o)}
				style={{
					display: "flex",
					alignItems: "center",
					gap: "0.25rem",
					border: "none",
					background: "transparent",
					cursor: "pointer",
					padding: 0,
					fontSize: "0.85rem",
				}}
			>
				<span>{open ? "▼" : "▶"}</span>
				<span>Recon</span>
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
						maxWidth: "420px",
					}}
				>
					{entries.length === 0 && (
						<div style={{ opacity: 0.7 }}>
							No recon fields
						</div>
					)}

					{entries.map(([k, v]) => {
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

function DetectionCell({ log }: { log: EventLog }) {
	const [open, setOpen] = useState(false)

	const dr = log.detection_results
	if (!dr) {
		return <span style={{ opacity: 0.5 }}>—</span>
	}

	const hit = dr.analysis?.detection
	const details = dr.analysis?.details || []

	return (
		<div>
			<button
				onClick={() => setOpen(o => !o)}
				style={{
					display: "flex",
					alignItems: "center",
					gap: "0.25rem",
					border: "none",
					background: "transparent",
					cursor: "pointer",
					padding: 0,
					fontSize: "0.85rem",
					color: hit
						? "var(--color-danger)"
						: "var(--color-text)",
				}}
			>
				<span>{open ? "▼" : "▶"}</span>
				<span>Detected</span>
				{hit && (
					<span
						style={{
							marginLeft: "0.25rem",
							padding: "0 0.35rem",
							borderRadius: "4px",
							background: "var(--color-danger)",
							color: "white",
							fontSize: "0.65rem",
							fontWeight: 600,
						}}
					>
						HIT
					</span>
				)}
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
						maxWidth: "420px",
					}}
				>
					{details.length === 0 && (
						<div style={{ opacity: 0.7 }}>
							No detection details
						</div>
					)}

					{details.map((d, i) => (
						<div key={i} style={{ marginBottom: "0.35rem" }}>
							<div>
								<strong>{d.rule_name}</strong>{" "}
								<span style={{ opacity: 0.6 }}>
									(sev {d.severity})
								</span>
							</div>
							<div>
								matched:{" "}
								<strong>
									{d.matched ? "true" : "false"}
								</strong>
							</div>
							{d.description && (
								<div style={{ opacity: 0.8 }}>
									{d.description}
								</div>
							)}
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
					<th>Detected</th>
					<th>Recon</th>
					<th>Message</th>
				</tr>
			</thead>
			<tbody>
				{logs.map(log => {
					const details =
						log.detection_results?.analysis?.details || []
					const hits = details.filter(d => d.matched)
					const maxSev = hits.length
						? Math.max(...hits.map(d => d.severity))
						: null

					return (
						<tr
							key={log._id.$oid}
							style={
								maxSev != null
									? {
											background:
												severityColor(maxSev),
									  }
									: undefined
							}
						>
							<td>{fmt(log.last_update?.$date)}</td>
							<td>{log.source_address}</td>
							<td>
								<DetectionCell log={log} />
							</td>
							<td>
								<ReconCell log={log} />
							</td>
							<td>{log.raw_log}</td>
						</tr>
					)
				})}
			</tbody>
		</table>
	)
}