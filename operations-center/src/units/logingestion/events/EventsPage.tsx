import { useMemo, useState } from "react"
import { useEventsApi } from "./useEventsApi"
import { LogTable } from "./LogTable"
import type { EventLog } from "./types"
import { eventTimestampMs, formatLocalDateTime } from "./time"
import "./events.css"

function parseRawJson(raw?: string): Record<string, unknown> | null {
	if (!raw) return null
	try {
		const parsed = JSON.parse(raw)
		return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null
	} catch {
		return null
	}
}

function sourceName(log: EventLog) {
	return String(parseRawJson(log.raw)?.source || log.source?.kind || "Unknown")
}

function sourceKey(log: EventLog) {
	return sourceName(log).trim() || "Unknown"
}

function hasDetection(log: EventLog) {
	return Boolean(log.detected || log.detection || log.state?.detected || log.state?.analysis?.detection)
}

function isParsed(log: EventLog) {
	return Boolean(log.state?.parsed || (log.parsed && Object.keys(log.parsed).length > 0))
}

function compact(value: number) {
	return new Intl.NumberFormat(undefined, {
		notation: value >= 10000 ? "compact" : "standard",
		maximumFractionDigits: 1,
	}).format(value)
}

function topSources(logs: EventLog[]) {
	const counts = new Map<string, number>()
	for (const log of logs) {
		const key = sourceKey(log)
		counts.set(key, (counts.get(key) || 0) + 1)
	}
	return [...counts.entries()].sort((a, b) => b[1] - a[1])
}

export default function EventsPage() {
	const [eventLimit, setEventLimit] = useState(100)
	const { logs, loading, error, reload, requestedLimit, backendNotice } = useEventsApi(eventLimit)
	const [query, setQuery] = useState("")
	const [sourceFilter, setSourceFilter] = useState("all")
	const [statusFilter, setStatusFilter] = useState("all")

	const sources = useMemo(() => topSources(logs), [logs])

	const filtered = useMemo(() => {
		const q = query.trim().toLowerCase()
		return logs.filter(log => {
			if (sourceFilter !== "all" && sourceKey(log) !== sourceFilter) return false
			if (statusFilter === "parsed" && !isParsed(log)) return false
			if (statusFilter === "unparsed" && isParsed(log)) return false
			if (statusFilter === "detected" && !hasDetection(log)) return false

			if (!q) return true
			const rawJson = parseRawJson(log.raw)
			const searchable = [
				log._id,
				log.event_id,
				log.context_id,
				log.raw,
				log.source?.address,
				log.source?.kind,
				rawJson ? JSON.stringify(rawJson) : "",
				log.parsed ? JSON.stringify(log.parsed) : "",
			]
				.filter(Boolean)
				.join(" ")
				.toLowerCase()

			return searchable.includes(q)
		})
	}, [logs, query, sourceFilter, statusFilter])

	const stats = useMemo(() => {
		const parsed = logs.filter(isParsed).length
		const detected = logs.filter(hasDetection).length
		const last = [...logs].sort((a, b) => eventTimestampMs(b.ingested_at, b.created_at, b.event_time) - eventTimestampMs(a.ingested_at, a.created_at, a.event_time))[0]
		return {
			total: logs.length,
			parsed,
			detected,
			lastSeen: last?.ingested_at || last?.created_at || last?.event_time,
		}
	}, [logs])

	const topThree = sources.slice(0, 3)

	return (
		<div className="ingestion-page">
			<header className="ingestion-topbar">
				<div>
					<h1>Log Ingestion</h1>
					<p>Recent events, parser state, and detection readiness.</p>
				</div>
				<button className="ingestion-btn" onClick={reload} disabled={loading}>
					{loading ? "Refreshing" : "Refresh"}
				</button>
			</header>

			{error && <div className="ingestion-error">{error}</div>}
			{backendNotice && <div className="ingestion-notice">{backendNotice}</div>}

			<section className="ingestion-health-grid" aria-label="Ingestion health summary">
				<div className="ingestion-health-card">
					<span>Events loaded</span>
					<strong>{compact(stats.total)}</strong>
					<small>{compact(filtered.length)} visible after filters</small>
				</div>
				<div className="ingestion-health-card">
					<span>Parsed</span>
					<strong>{compact(stats.parsed)}</strong>
					<small>{stats.total ? Math.round((stats.parsed / stats.total) * 100) : 0}% of loaded events</small>
				</div>
				<div className="ingestion-health-card">
					<span>Detections</span>
					<strong>{compact(stats.detected)}</strong>
					<small>Latest event {formatLocalDateTime(stats.lastSeen)}</small>
				</div>
			</section>

			<section className="ingestion-content-grid">
				<aside className="ingestion-sources-panel">
					<div className="ingestion-panel-head">
						<h2>Sources</h2>
						<span>{sources.length} seen</span>
					</div>

					{topThree.length === 0 && <div className="ingestion-empty">No source activity yet.</div>}
					{topThree.map(([name, count]) => (
						<button
							key={name}
							className={`ingestion-source-row ${sourceFilter === name ? "active" : ""}`}
							onClick={() => setSourceFilter(sourceFilter === name ? "all" : name)}
						>
							<span>{name}</span>
							<strong>{compact(count)}</strong>
						</button>
					))}

					{sources.length > 3 && <div className="ingestion-more-sources">+ {sources.length - 3} more sources in the event list</div>}
				</aside>

				<main className="ingestion-events-panel">
					<div className="ingestion-panel-head ingestion-events-head">
						<div>
							<h2>Recent events</h2>
							<span>{compact(filtered.length)} shown · {compact(logs.length)} loaded · requested {compact(requestedLimit)}</span>
						</div>
						<div className="ingestion-filters">
							<input
								className="ingestion-input"
								value={query}
								onChange={e => setQuery(e.target.value)}
								placeholder="Search raw, parsed fields, source, IP…"
							/>
							<select className="ingestion-select" value={sourceFilter} onChange={e => setSourceFilter(e.target.value)}>
								<option value="all">All sources</option>
								{sources.map(([name, count]) => <option key={name} value={name}>{name} ({count})</option>)}
							</select>
							<select className="ingestion-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
								<option value="all">All states</option>
								<option value="parsed">Parsed</option>
								<option value="unparsed">Unparsed</option>
								<option value="detected">Detected</option>
							</select>
							<select className="ingestion-select" value={eventLimit} onChange={e => setEventLimit(Number(e.target.value))}>
								<option value={25}>25 events</option>
								<option value={100}>100 events</option>
								<option value={250}>250 events</option>
								<option value={500}>500 events</option>
							</select>
						</div>
					</div>

					{loading && <div className="ingestion-empty">Loading events…</div>}
					{!loading && filtered.length === 0 && <div className="ingestion-empty">No events match the current filters.</div>}
					{!loading && filtered.length > 0 && <LogTable logs={filtered} />}
				</main>
			</section>
		</div>
	)
}
