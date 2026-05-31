import { useMemo, useState } from "react"
import type { EventLog } from "./types"
import { eventTimestampMs, formatLocalDateTime } from "./time"

type Props = {
	logs: EventLog[]
}

type ParsedMap = Record<string, unknown[]>

function parseRawJson(raw?: string): Record<string, unknown> | null {
	if (!raw) return null
	try {
		const parsed = JSON.parse(raw)
		return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null
	} catch {
		return null
	}
}

function asOne(value: unknown[] | undefined) {
	if (!Array.isArray(value) || value.length === 0) return undefined
	return value[0]
}

function sourceName(log: EventLog) {
	const rawJson = parseRawJson(log.raw)
	return String(rawJson?.source || log.source?.kind || "Unknown")
}

function sourceCategory(log: EventLog) {
	return log.source?.kind || "unclassified"
}

function isParsed(log: EventLog) {
	return Boolean(log.state?.parsed || (log.parsed && Object.keys(log.parsed).length > 0))
}

function hasDetection(log: EventLog) {
	return Boolean(log.detected || log.detection || log.state?.detected || log.state?.analysis?.detection)
}

function detectionSeverity(log: EventLog) {
	const detailSeverities = (log.state?.analysis?.details || [])
		.map(d => Number(d?.severity ?? 0))
		.filter(v => Number.isFinite(v))

	return Math.max(Number(log.state?.severity ?? 0), Number(log.severity ?? 0), ...detailSeverities, 0)
}

function severityBand(log: EventLog): "none" | "low" | "medium" | "high" | "critical" {
	if (!hasDetection(log)) return "none"
	const sev = detectionSeverity(log)
	if (sev >= 90) return "critical"
	if (sev >= 70) return "high"
	if (sev >= 40) return "medium"
	return "low"
}

function severityLabel(log: EventLog) {
	const band = severityBand(log)
	if (band === "none") return "no detections"
	return `${band} detection`
}

function severityClass(log: EventLog) {
	return severityBand(log)
}

function compactRaw(raw?: string) {
	if (!raw) return ""
	const trimmed = raw.trim()
	return trimmed.length > 220 ? `${trimmed.slice(0, 220)}…` : trimmed
}

function titleFor(log: EventLog) {
	const parsed = log.parsed || {}
	const rawJson = parseRawJson(log.raw)
	const src = sourceName(log)
	const wafAction = asOne(parsed.waf_action)
	const method = asOne(parsed.client_request_method) || rawJson?.ClientRequestMethod
	const uri = asOne(parsed.client_request_uri) || rawJson?.ClientRequestURI
	const status = asOne(parsed.edge_response_status) || rawJson?.EdgeResponseStatus

	if (src === "Cloudflare" && wafAction) return `Cloudflare WAF ${String(wafAction)}`
	if (method && uri) return `${String(method)} ${String(uri)}${status ? ` · ${String(status)}` : ""}`
	return src
}

function subtitleFor(log: EventLog) {
	const parsed = log.parsed || {}
	const rawJson = parseRawJson(log.raw)
	const host = asOne(parsed.client_request_host) || rawJson?.ClientRequestHost
	const clientIp = asOne(parsed.client_ip) || rawJson?.ClientIP
	const sourceAddress = log.source?.address
	const parts = [host, clientIp, sourceAddress ? `from ${sourceAddress}` : undefined].filter(Boolean)
	return parts.length ? parts.join(" · ") : compactRaw(log.raw)
}

function parsedEntries(log: EventLog): ParsedMap {
	const parsed = log.parsed || {}
	return Object.fromEntries(
		Object.entries(parsed).filter(([, value]) => Array.isArray(value) && value.length > 0)
	)
}

function detectionDetails(log: EventLog) {
	return log.state?.analysis?.details || []
}

type PillTone = "neutral" | "source" | "category" | "good" | "warn" | "critical" | "high" | "medium" | "low" | "none"

function StatusPill({ children, tone = "neutral" }: { children: string; tone?: PillTone }) {
	return <span className={`ingestion-pill ${tone}`}>{children}</span>
}

function EventDetails({ log }: { log: EventLog }) {
	const parsed = parsedEntries(log)
	const rawJson = parseRawJson(log.raw)
	const detections = detectionDetails(log)

	const copyJson = async () => {
		try {
			await navigator.clipboard.writeText(JSON.stringify(log, null, 2))
		} catch {}
	}

	return (
		<div className="ingestion-event-details">
			<section className="ingestion-detail-card">
				<div className="ingestion-detail-head">
					<h4>Event</h4>
					<button className="ingestion-text-btn" onClick={copyJson}>Copy JSON</button>
				</div>
				<dl className="ingestion-kv">
					<div><dt>ID</dt><dd>{log.event_id || log._id}</dd></div>
					<div><dt>Context</dt><dd>{log.context_id || "default"}</dd></div>
					<div><dt>Ingested</dt><dd>{formatLocalDateTime(log.ingested_at || log.created_at)}</dd></div>
					<div><dt>Transport</dt><dd>{log.source?.kind || "—"} {log.source?.address ? `from ${log.source.address}` : ""}</dd></div>
				</dl>
			</section>

			<section className="ingestion-detail-card wide">
				<h4>Parsed fields</h4>
				{Object.keys(parsed).length > 0 ? (
					<div className="ingestion-fields-grid">
						{Object.entries(parsed).map(([key, value]) => (
							<div key={key} className="ingestion-field-row">
								<span>{key}</span>
								<strong>{value.map(v => typeof v === "object" ? JSON.stringify(v) : String(v)).join(", ")}</strong>
							</div>
						))}
					</div>
				) : (
					<div className="ingestion-muted">No parsed fields yet.</div>
				)}
			</section>

			<section className="ingestion-detail-card">
				<h4>Detection</h4>
				{detections.length > 0 ? (
					detections.map((d, i) => (
						<div className="ingestion-detection-row" key={i}>
							<strong>{d.rule_name || "rule"}</strong>
							<span>severity {d.severity ?? "—"} · matched {String(d.matched)}</span>
							{d.description && <small>{d.description}</small>}
						</div>
					))
				) : (
					<div className="ingestion-muted">No detections triggered.</div>
				)}
			</section>

			<section className="ingestion-detail-card wide">
				<h4>Raw event</h4>
				<pre>{rawJson ? JSON.stringify(rawJson, null, 2) : log.raw}</pre>
			</section>
		</div>
	)
}

export function LogTable({ logs }: Props) {
	const [openId, setOpenId] = useState<string | null>(null)

	const sorted = useMemo(() => [...logs].sort((a, b) => {
		const ta = eventTimestampMs(a.event_time, a.ingested_at, a.created_at)
		const tb = eventTimestampMs(b.event_time, b.ingested_at, b.created_at)
		return tb - ta
	}), [logs])

	return (
		<div className="ingestion-event-list">
			{sorted.map((log, index) => {
				const id = log.event_id || log._id || `${eventTimestampMs(log.event_time, log.ingested_at, log.created_at)}-${index}`
				const rowKey = `${id}-${index}`
				const open = openId === rowKey
				return (
					<article key={rowKey} className={`ingestion-event-card ${open ? "open" : ""} ${severityClass(log)}`}>
						<button className="ingestion-event-summary" onClick={() => setOpenId(open ? null : rowKey)}>
							<div className="ingestion-event-main">
								<div className="ingestion-event-title-row">
									<strong>{titleFor(log)}</strong>
									<span>{formatLocalDateTime(log.event_time || log.ingested_at || log.created_at)}</span>
								</div>
								<p>{subtitleFor(log)}</p>
								<div className="ingestion-event-pills">
									<StatusPill tone="source">{sourceName(log)}</StatusPill>
									<StatusPill tone="category">{sourceCategory(log)}</StatusPill>
									{isParsed(log) ? <StatusPill tone="good">parsed</StatusPill> : <StatusPill tone="warn">unparsed</StatusPill>}
									<StatusPill tone={severityBand(log)}>{severityLabel(log)}</StatusPill>
								</div>
							</div>
							<span className="ingestion-expand">{open ? "Hide" : "Details"}</span>
						</button>
						{open && <EventDetails log={log} />}
					</article>
				)
			})}
		</div>
	)
}
