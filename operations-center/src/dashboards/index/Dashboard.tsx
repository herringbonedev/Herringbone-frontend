import type { ReactNode } from "react"
import { useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { IncidentThroughput } from "./IncidentThroughput"
import { useDashboardApi } from "./useDashboardApi"
import "./dashboard.css"

function compact(value?: number | null) {
	if (value === null || value === undefined || Number.isNaN(Number(value))) return "—"
	return new Intl.NumberFormat(undefined, {
		notation: Number(value) >= 10000 ? "compact" : "standard",
		maximumFractionDigits: 1,
	}).format(Number(value))
}

function fmt(ts?: string) {
	if (!ts) return "—"
	try {
		return new Date(ts).toLocaleString()
	} catch {
		return ts
	}
}

function pct(part?: number, total?: number) {
	if (!total || total <= 0) return "0%"
	return `${Math.round(((part || 0) / total) * 100)}%`
}

function priorityTone(priority?: string) {
	const p = String(priority || "low").toLowerCase()
	if (p === "critical") return "critical"
	if (p === "high") return "high"
	if (p === "medium") return "medium"
	return "low"
}

function severityTone(severity?: number) {
	const sev = Number(severity ?? 0)
	if (sev >= 90) return "critical"
	if (sev >= 70) return "high"
	if (sev >= 40) return "medium"
	if (sev > 0) return "low"
	return "neutral"
}

function StatusPill({ children, tone = "neutral" }: { children: ReactNode; tone?: string }) {
	return <span className={`home-pill ${tone}`}>{children}</span>
}

function Spinner({ small = false }: { small?: boolean }) {
	return <span className={`home-spinner ${small ? "small" : ""}`} aria-hidden="true" />
}

function StatCard(props: {
	label: string
	value: ReactNode
	helper: string
	tone?: string
	onClick?: () => void
}) {
	const Tag = props.onClick ? "button" : "div"
	return (
		<Tag className={`home-stat-card ${props.tone || ""}`} onClick={props.onClick as any}>
			<span>{props.label}</span>
			<strong>{props.value}</strong>
			<small>{props.helper}</small>
		</Tag>
	)
}

function Section(props: { title: string; helper?: string; action?: ReactNode; children: ReactNode }) {
	return (
		<section className="home-panel">
			<div className="home-section-head">
				<div>
					<h2>{props.title}</h2>
					{props.helper && <span>{props.helper}</span>}
				</div>
				{props.action}
			</div>
			{props.children}
		</section>
	)
}

function EmptyState({ children }: { children: ReactNode }) {
	return <div className="home-empty">{children}</div>
}

export default function Dashboard() {
	const {
		summary,
		events,
		detections,
		incidents,
		throughput,
		loading,
		error,
		reload,
	} = useDashboardApi()

	const navigate = useNavigate()

	const detected = summary?.detected ?? 0
	const undetected = summary?.undetected ?? 0
	const totalEvaluated = detected + undetected
	const highSeverity = summary?.high_severity ?? 0
	const failed = summary?.failed ?? 0
	const openIncidents = incidents.filter(i => String(i.status || "open").toLowerCase() !== "resolved").length
	const highIncidents = incidents.filter(i => ["critical", "high"].includes(String(i.priority || "").toLowerCase())).length

	const latestEvent = useMemo(() => {
		return [...events].sort((a, b) => new Date(b.ingested_at || 0).getTime() - new Date(a.ingested_at || 0).getTime())[0]
	}, [events])

	return (
		<div className="home-dashboard">
			<header className="home-command-bar">
				<div>
					<strong>Operations overview</strong>
					<span>Recent platform health, risk, and workflow shortcuts.</span>
				</div>
				<div className="home-hero-actions">
					<button className="home-btn secondary" onClick={() => navigate("/search")}>Open Search</button>
					<button className="home-btn" onClick={reload} disabled={loading}>
						{loading && <Spinner small />}
						{loading ? "Refreshing" : "Refresh"}
					</button>
				</div>
			</header>

			{error && (
				<div className="home-error">
					<strong>Dashboard failed to load.</strong>
					<span>{error}</span>
					<button className="home-btn secondary" onClick={reload}>Retry</button>
				</div>
			)}

			{loading && !summary && (
				<div className="home-loading">
					<Spinner />
					<div>
						<strong>Loading home dashboard</strong>
						<span>Collecting recent events, detections, incidents, and throughput.</span>
					</div>
				</div>
			)}

			<section className="home-stat-grid" aria-label="Platform summary">
				<StatCard
					label="Events in 24h"
					value={compact(summary?.events_24h)}
					helper={latestEvent ? `Latest ${fmt(latestEvent.ingested_at)}` : "Recent ingestion sample"}
					tone="source"
					onClick={() => navigate("/logingestion")}
				/>
				<StatCard
					label="Detected"
					value={compact(detected)}
					helper={`${pct(detected, totalEvaluated)} of evaluated events`}
					tone={detected > 0 ? "high" : "good"}
					onClick={() => navigate("/search")}
				/>
				<StatCard
					label="Open incidents"
					value={compact(openIncidents)}
					helper={highIncidents ? `${highIncidents} high / critical` : "No high-priority visible"}
					tone={highIncidents ? "critical" : openIncidents ? "medium" : "good"}
					onClick={() => navigate("/incidents")}
				/>
				<StatCard
					label="Pipeline issues"
					value={compact(failed)}
					helper={highSeverity ? `${highSeverity} high severity` : "No failed items reported"}
					tone={failed ? "critical" : highSeverity ? "high" : "good"}
				/>
			</section>

			<section className="home-workflow-grid" aria-label="Primary workflows">
				<button className="home-workflow-card" onClick={() => navigate("/logingestion")}>
					<span>01</span>
					<strong>Ingestion Monitor</strong>
					<small>Confirm logs are arriving, parsed, and ready.</small>
				</button>
				<button className="home-workflow-card" onClick={() => navigate("/search")}>
					<span>02</span>
					<strong>Search</strong>
					<small>Investigate raw, parsed, detection, and incident data.</small>
				</button>
				<button className="home-workflow-card" onClick={() => navigate("/cardset")}>
					<span>03</span>
					<strong>CardSet</strong>
					<small>Teach Herringbone how to parse and normalize sources.</small>
				</button>
				<button className="home-workflow-card" onClick={() => navigate("/ruleset")}>
					<span>04</span>
					<strong>RuleSet</strong>
					<small>Define detections and correlation behavior.</small>
				</button>
			</section>

			<div className="home-main-grid">
				<div className="home-main-column">
					<Section
						title="Incident throughput"
						helper="Open and resolved incidents over time."
						action={<button className="home-text-btn" onClick={() => navigate("/incidents")}>View incidents</button>}
					>
						<IncidentThroughput data={throughput} />
					</Section>

					<Section
						title="Recent events"
						helper="Latest events entering the platform."
						action={<button className="home-text-btn" onClick={() => navigate("/logingestion")}>Open ingestion</button>}
					>
						<div className="home-event-list">
							{events.map(event => (
								<div key={event.event_id} className={`home-event-row ${event.detected ? "detected" : ""}`}>
									<div>
										<strong>{event.source?.address || "Unknown source"}</strong>
										<span>{fmt(event.ingested_at)}</span>
									</div>
									<div className="home-row-pills">
										<StatusPill tone={event.detected ? "high" : "good"}>{event.detected ? "detected" : "clean"}</StatusPill>
										<StatusPill tone={severityTone(event.severity)}>severity {event.severity ?? "—"}</StatusPill>
									</div>
								</div>
							))}
							{!loading && events.length === 0 && <EmptyState>No recent events returned.</EmptyState>}
						</div>
					</Section>
				</div>

				<aside className="home-side-column">
					<Section
						title="Incident queue"
						helper="Most recent incidents that need triage."
						action={<button className="home-text-btn" onClick={() => navigate("/incidents")}>Open queue</button>}
					>
						<div className="home-incident-list">
							{incidents.map(incident => (
								<button key={incident.incident_id} className={`home-incident-row ${priorityTone(incident.priority)}`} onClick={() => navigate(`/incidents/${incident.incident_id}`)}>
									<strong>{incident.title || "Untitled incident"}</strong>
									<span>{fmt(incident.created_at)}</span>
									<div className="home-row-pills">
										<StatusPill tone={`status-${String(incident.status || "open").toLowerCase()}`}>{incident.status || "open"}</StatusPill>
										<StatusPill tone={priorityTone(incident.priority)}>{incident.priority || "low"}</StatusPill>
									</div>
									<small>{incident.owner || "Unassigned"}</small>
								</button>
							))}
							{!loading && incidents.length === 0 && <EmptyState>No recent incidents.</EmptyState>}
						</div>
					</Section>

					<Section
						title="Recent detections"
						helper="Newest rule matches."
						action={<button className="home-text-btn" onClick={() => navigate("/search")}>Investigate</button>}
					>
						<div className="home-detection-list">
							{detections.map((detection, index) => (
								<div key={`${detection.event_id}-${index}`} className="home-detection-row">
									<div>
										<strong>Detection</strong>
										<span>{fmt(detection.inserted_at)}</span>
									</div>
									<StatusPill tone={severityTone(detection.severity)}>severity {detection.severity ?? "—"}</StatusPill>
								</div>
							))}
							{!loading && detections.length === 0 && <EmptyState>No recent detections.</EmptyState>}
						</div>
					</Section>
				</aside>
			</div>
		</div>
	)
}
