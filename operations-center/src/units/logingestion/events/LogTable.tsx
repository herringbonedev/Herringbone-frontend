import { useState } from "react"
import type { EventLog } from "./types"

type Props = {
	logs: EventLog[]
}

type ParsedMap = Record<string, unknown[]>

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

	const parsed =
		(log as EventLog & { parsed?: ParsedMap }).parsed || {}

	const detections =
		(state.analysis?.details as
			| Array<{
					rule_name?: string
					severity?: number
					description?: string
					matched?: boolean
			  }>
			| undefined) || []

	const baseLines: Array<[string, string]> = [
		["id", log._id],
		["source.address", log.source?.address || ""],
		["source.kind", log.source?.kind || ""],
		["event_time", log.event_time || ""],
		["ingested_at", log.ingested_at || ""],
		["state.detected", String(state.detected ?? false)],
		["state.parsed", String(state.parsed ?? false)],
		["state.severity", sev == null ? "" : String(sev)],
		["state.last_updated", state.last_updated || ""],
	]

	const parsedEntries: Record<string, unknown[]> = {}

	for (const [k, v] of Object.entries(parsed)) {
		if (Array.isArray(v) && v.length > 0) {
			parsedEntries[k] = v
		}
	}

	const copyAll = async () => {
		try {
			await navigator.clipboard.writeText(
				JSON.stringify(log, null, 2)
			)
		} catch {}
	}

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
						marginTop: "0.4rem",
						padding: "0.5rem",
						background: "var(--bg-panel-2)",
						border: "1px solid var(--border)",
						borderRadius: "6px",
						display: "grid",
						gridTemplateColumns: "280px 1fr 1fr",
						gap: "0.75rem",
						fontFamily: "monospace",
						fontSize: "0.75rem",
						maxWidth: "1100px",
					}}
				>
					<div>
						<button
							onClick={copyAll}
							style={{
								marginBottom: "0.4rem",
								fontSize: "0.7rem",
								padding: "0.1rem 0.4rem",
								borderRadius: "4px",
								border: "1px solid var(--border)",
								cursor: "pointer",
							}}
						>
							Copy JSON
						</button>

						{baseLines
							.filter(([_, v]) => v.trim() !== "")
							.map(([k, v]) => (
								<div key={k}>
									<strong>{k}</strong>: {v}
								</div>
							))}
					</div>

					<div
						style={{
							background: "var(--bg-panel-1)",
							border: "1px solid var(--border)",
							borderRadius: "4px",
							padding: "0.4rem",
							overflowX: "auto",
						}}
					>
						<strong>Parsed</strong>
						{Object.keys(parsedEntries).length > 0 ? (
							<pre>{JSON.stringify(parsedEntries, null, 2)}</pre>
						) : (
							<div style={{ opacity: 0.6 }}>no parsed data</div>
						)}
					</div>

					<div
						style={{
							background: "var(--bg-panel-1)",
							border: "1px solid var(--border)",
							borderRadius: "4px",
							padding: "0.4rem",
							overflowX: "auto",
						}}
					>
						<strong>Detections</strong>

						{detections.length > 0 ? (
							detections.map((d, i) => (
								<div
									key={i}
									style={{
										marginTop: "0.35rem",
										padding: "0.35rem",
										borderRadius: "4px",
										background:
											d.matched
												? severityColor(d.severity ?? 0)
												: "transparent",
										border: "1px solid var(--border)",
									}}
								>
									<div>
										<strong>{d.rule_name || "rule"}</strong>
									</div>
									{d.description && (
										<div style={{ opacity: 0.8 }}>
											{d.description}
										</div>
									)}
									<div>
										severity: {d.severity ?? ""}
									</div>
									<div>
										matched: {String(d.matched)}
									</div>
								</div>
							))
						) : (
							<div style={{ opacity: 0.6 }}>
								no detections
							</div>
						)}
					</div>
				</div>
			)}
		</div>
	)
}

export function LogTable({ logs }: Props) {
	const sorted = [...logs].sort((a, b) => {
		const ta = new Date(a.event_time || 0).getTime()
		const tb = new Date(b.event_time || 0).getTime()
		return tb - ta
	})

	return (
		<div style={{ maxHeight: "70vh", overflowY: "auto" }}>
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
					{sorted.map(log => {
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
		</div>
	)
}
