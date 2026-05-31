import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useIncidentList } from "./useIncidentList"
import type { Incident } from "./types"
import "./incidents.css"

function fmt(ts?: string) {
	if (!ts) return "—"
	try {
		return new Date(ts).toLocaleString()
	} catch {
		return ts
	}
}

function priorityRank(priority?: string) {
	const p = String(priority || "low").toLowerCase()
	if (p === "critical") return 4
	if (p === "high") return 3
	if (p === "medium") return 2
	if (p === "low") return 1
	return 0
}

function priorityLabel(priority?: string) {
	const p = String(priority || "low").toLowerCase()
	return p.charAt(0).toUpperCase() + p.slice(1)
}

function statusLabel(status?: string) {
	const s = String(status || "open").replace(/_/g, " ")
	return s.charAt(0).toUpperCase() + s.slice(1)
}

function updatedTime(i: Incident) {
	return new Date(i.updated_at || i.created_at || 0).getTime()
}

function incidentPillLabels(i: Incident): string[] {
	const status = String(i.status || "open").toLowerCase()
	const priority = String(i.priority || "low").toLowerCase()
	const ownership = i.owner ? "assigned" : "unassigned"
	return [status, priority, ownership]
}

function matchesIncident(i: Incident, query: string, status: string, pillFilter: string) {
	if (status !== "all" && String(i.status || "open") !== status) return false
	if (pillFilter !== "all" && !incidentPillLabels(i).includes(pillFilter)) return false

	const q = query.trim().toLowerCase()
	if (!q) return true
	return [
		i.title,
		i.description,
		i.status,
		i.priority,
		i.owner,
		i._id,
	]
		.filter(Boolean)
		.join(" ")
		.toLowerCase()
		.includes(q)
}

const PILL_FILTERS = [
	{ value: "all", label: "All", tone: "neutral" },
	{ value: "open", label: "Open", tone: "status-open" },
	{ value: "investigating", label: "Investigating", tone: "status-investigating" },
	{ value: "resolved", label: "Resolved", tone: "status-resolved" },
	{ value: "critical", label: "Critical", tone: "priority-critical" },
	{ value: "high", label: "High", tone: "priority-high" },
	{ value: "medium", label: "Medium", tone: "priority-medium" },
	{ value: "low", label: "Low", tone: "priority-low" },
	{ value: "unassigned", label: "Unassigned", tone: "unassigned" },
	{ value: "assigned", label: "Assigned", tone: "owner" },
]

function StatCard({ label, value, helper }: { label: string; value: string | number; helper?: string }) {
	return (
		<div className="incident-stat-card">
			<span>{label}</span>
			<strong>{value}</strong>
			{helper && <small>{helper}</small>}
		</div>
	)
}

function Pill({ children, tone = "neutral" }: { children: string; tone?: string }) {
	return <span className={`incident-pill ${tone}`}>{children}</span>
}

function Spinner({ small = false }: { small?: boolean }) {
	return <span className={`incident-spinner ${small ? "small" : ""}`} aria-hidden="true" />
}

function LoadingState({ title, helper }: { title: string; helper?: string }) {
	return (
		<div className="incident-loading-state">
			<Spinner />
			<div>
				<strong>{title}</strong>
				{helper && <span>{helper}</span>}
			</div>
		</div>
	)
}

export default function IncidentListPage() {
	const { incidents, loading, error, reload } = useIncidentList()
	const navigate = useNavigate()
	const [query, setQuery] = useState("")
	const [status, setStatus] = useState("all")
	const [pillFilter, setPillFilter] = useState("all")
	const [sort, setSort] = useState("updated")

	const stats = useMemo(() => {
		const open = incidents.filter(i => String(i.status || "open") !== "resolved").length
		const critical = incidents.filter(i => String(i.priority || "").toLowerCase() === "critical").length
		const unassigned = incidents.filter(i => !i.owner).length
		const events = incidents.reduce((sum, i) => sum + i.events.length, 0)
		return { open, critical, unassigned, events }
	}, [incidents])

	const filtered = useMemo(() => {
		const list = incidents.filter(i => matchesIncident(i, query, status, pillFilter))
		return [...list].sort((a, b) => {
			if (sort === "priority") return priorityRank(b.priority) - priorityRank(a.priority) || updatedTime(b) - updatedTime(a)
			if (sort === "events") return b.events.length - a.events.length || updatedTime(b) - updatedTime(a)
			if (sort === "title") return (a.title || "").localeCompare(b.title || "")
			return updatedTime(b) - updatedTime(a)
		})
	}, [incidents, query, status, pillFilter, sort])

	return (
		<div className="incident-app">
			<header className="incident-topbar">
				<div>
					<h1>Incidents</h1>
					<p>Triage grouped detections, assign ownership, track notes, and review evidence.</p>
				</div>
				<button className="incident-btn incident-btn-with-spinner" onClick={reload} disabled={loading}>
					{loading && <Spinner small />}
					{loading ? "Refreshing" : "Refresh"}
				</button>
			</header>

			{error && <div className="incident-error">{error}</div>}

			<section className="incident-stat-grid" aria-label="Incident summary">
				<StatCard label="Total incidents" value={incidents.length} helper={`${filtered.length} visible`} />
				<StatCard label="Open" value={stats.open} helper="Not resolved" />
				<StatCard label="Critical" value={stats.critical} helper="Highest priority" />
				<StatCard label="Evidence" value={stats.events} helper="Related events" />
			</section>

			<section className="incident-list-panel">
				<div className="incident-list-head">
					<div>
						<h2>Incident queue</h2>
						<span className="incident-inline-loading">{loading && <Spinner small />}{loading ? "Loading incidents…" : `${filtered.length} shown`}</span>
					</div>
					<div className="incident-filters">
						<input
							className="incident-input"
							value={query}
							onChange={e => setQuery(e.target.value)}
							placeholder="Search incidents…"
						/>
						<select className="incident-select" value={status} onChange={e => setStatus(e.target.value)}>
							<option value="all">All statuses</option>
							<option value="open">Open</option>
							<option value="investigating">Investigating</option>
							<option value="resolved">Resolved</option>
						</select>
						<select className="incident-select" value={sort} onChange={e => setSort(e.target.value)}>
							<option value="updated">Recently updated</option>
							<option value="priority">Highest priority</option>
							<option value="events">Most evidence</option>
							<option value="title">Title</option>
						</select>
					</div>
				</div>

				<div className="incident-filter-chip-row" aria-label="Incident label filters">
					<span className="incident-filter-chip-label">Filter</span>
					{PILL_FILTERS.map(filter => (
						<button
							key={filter.value}
							type="button"
							className={`incident-filter-chip ${filter.tone} ${pillFilter === filter.value ? "active" : ""}`}
							onClick={() => setPillFilter(filter.value)}
						>
							{filter.label}
						</button>
					))}
				</div>

				{loading && incidents.length === 0 && <LoadingState title="Loading incidents" helper="Fetching the incident queue…" />}
				{loading && incidents.length > 0 && <div className="incident-refreshing-row"><Spinner small /> Refreshing incident queue…</div>}
				{!loading && incidents.length === 0 && <div className="incident-empty">No incidents found.</div>}
				{!loading && incidents.length > 0 && filtered.length === 0 && <div className="incident-empty">No incidents match your filters.</div>}

				<div className="incident-card-list">
					{filtered.map(i => (
						<article key={i._id} className={`incident-card ${String(i.priority || "low").toLowerCase()}`} onClick={() => navigate(`/incidents/${i._id}`)}>
							<div className="incident-card-main">
								<div className="incident-card-title-row">
									<strong>{i.title || "Untitled incident"}</strong>
									<span>{fmt(i.updated_at || i.created_at)}</span>
								</div>
								<p>{i.description || "No description yet."}</p>
								<div className="incident-pill-row">
									<Pill tone={`priority-${String(i.priority || "low").toLowerCase()}`}>{priorityLabel(i.priority)}</Pill>
									<Pill tone={`status-${String(i.status || "open").toLowerCase()}`}>{statusLabel(i.status)}</Pill>
									<Pill tone={i.owner ? "owner" : "unassigned"}>{i.owner || "Unassigned"}</Pill>
								</div>
							</div>
							<div className="incident-card-side">
								<strong>{i.events.length}</strong>
								<span>events</span>
								<small>{i.detections.length} detections · {i.notes.length} notes</small>
							</div>
						</article>
					))}
				</div>
			</section>
		</div>
	)
}
