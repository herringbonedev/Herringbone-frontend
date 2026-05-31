import { Link, useParams } from "react-router-dom"
import { useIncidentDetail } from "./useIncidentDetail"
import { useIncidentEvents } from "./eventsApi"
import { addIncidentNote, updateIncident } from "./incidentApi"
import { useState, useEffect, useMemo } from "react"
import { apiFetch } from "../../../api"
import "./incidents.css"

type TeamUser = {
	email: string
	role: string
}

function fmt(ts?: string) {
	if (!ts) return "—"
	try {
		return new Date(ts).toLocaleString()
	} catch {
		return ts
	}
}

function getCurrentUserEmail(): string {
	const token = localStorage.getItem("hb_token")
	if (!token) return "unknown"

	try {
		const payload = JSON.parse(atob(token.split(".")[1]))
		return payload.email || payload.sub || "unknown"
	} catch {
		return "unknown"
	}
}

function firstParsed(ev: any, key: string) {
	const values = ev?.parsed?.[key]
	return Array.isArray(values) && values.length ? values[0] : undefined
}

function parseRawJson(raw?: string): Record<string, unknown> | null {
	if (!raw) return null
	try {
		const parsed = JSON.parse(raw)
		return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null
	} catch {
		return null
	}
}

function eventTitle(ev: any) {
	const raw = parseRawJson(ev.raw)
	const method = firstParsed(ev, "client_request_method") || raw?.ClientRequestMethod
	const uri = firstParsed(ev, "client_request_uri") || raw?.ClientRequestURI
	const status = firstParsed(ev, "edge_response_status") || raw?.EdgeResponseStatus
	if (method && uri) return `${method} ${uri}${status ? ` · ${status}` : ""}`
	return `${eventSource(ev)} event`
}

function eventSubtitle(ev: any) {
	const raw = parseRawJson(ev.raw)
	const host = firstParsed(ev, "client_request_host") || raw?.ClientRequestHost
	const ip = firstParsed(ev, "client_ip") || raw?.ClientIP
	return [host, ip, ev.state?.detected ? "detected" : undefined].filter(Boolean).join(" · ") || ev.raw?.slice(0, 120) || "No event summary"
}

const CORRELATION_FIELDS = [
	"client_ip",
	"source_ip",
	"src_ip",
	"destination_ip",
	"dest_ip",
	"user",
	"username",
	"account_name",
	"client_request_host",
	"host",
	"hostname",
	"ray_id",
	"rule_id",
	"waf_rule_id",
]

function eventTime(ev: any) {
	return ev.event_time || ev.ingested_at || ev.created_at || ev.state?.created_at
}

function eventSource(ev: any) {
	const raw = parseRawJson(ev.raw)
	return ev.fingerprint?.source_name || raw?.source || ev.source?.kind || "Unknown"
}

function eventId(ev: any) {
	return String(ev.event_id || ev._id || "")
}

function shortEventId(ev: any) {
	const id = eventId(ev)
	if (!id) return "event"
	return id.length > 10 ? id.slice(-10) : id
}

function eventSeverity(ev: any) {
	return Number(ev.state?.severity ?? ev.severity ?? 0)
}

function severityTone(ev: any) {
	const sev = eventSeverity(ev)
	if (sev >= 90) return "critical"
	if (sev >= 70) return "high"
	if (sev >= 40) return "medium"
	if (sev > 0 || ev.state?.detected) return "low"
	return "neutral"
}

function parsedValues(ev: any, key: string): string[] {
	const value = ev?.parsed?.[key]
	if (!Array.isArray(value)) return []
	return value.filter(v => v !== null && v !== undefined && String(v).trim() !== "").map(v => String(v))
}



type EvidenceGroup = {
	key: string
	value: string
	events: any[]
	firstSeen?: string
	lastSeen?: string
}

type CorrelationHint = {
	key: string
	value: string
	events: number
	lastSeen?: string
	exact: boolean
	mode?: "parsed_on" | "correlate_on" | "correlated_on" | "correlation_identity" | "rule" | "inferred"
}

function firstString(...values: any[]) {
	for (const value of values) {
		if (typeof value === "string" && value.trim()) return value.trim()
	}
	return ""
}

function firstStringOrNumber(...values: any[]) {
	for (const value of values) {
		if (typeof value === "string" && value.trim()) return value.trim()
		if (typeof value === "number" && Number.isFinite(value)) return String(value)
		if (typeof value === "boolean") return String(value)
	}
	return ""
}

function nonEmptyObject(value: any) {
	return value && typeof value === "object" && !Array.isArray(value) && Object.keys(value).length > 0
}

function correlationIdentityFieldValue(identity: any) {
	if (!nonEmptyObject(identity)) return null

	const field = firstString(
		identity.parsed_on,
		identity.parsedOn,
		identity.based_on,
		identity.basedOn,
		identity.correlated_on,
		identity.correlatedOn,
		identity.correlate_on,
		identity.correlateOn,
		identity.field,
		identity.key,
		identity.path,
		identity.name
	)

	const value = firstStringOrNumber(
		identity.value,
		identity.field_value,
		identity.fieldValue,
		identity.parsed_on_value,
		identity.parsedOnValue,
		identity.correlated_value,
		identity.correlatedValue,
		identity.identity,
		identity.match,
		identity.match_value,
		identity.matchValue
	)

	if (field) {
		return {
			field,
			value: value || "stored on incident",
			mode: "correlation_identity" as const,
		}
	}

	const entries = Object.entries(identity).filter(([key, value]) => {
		if (!key || ["rule", "rule_id", "rule_name", "rule_title", "type", "mode"].includes(key)) return false
		return typeof value === "string" || typeof value === "number" || typeof value === "boolean"
	})

	if (entries.length === 1) {
		const [key, value] = entries[0]
		return {
			field: key,
			value: String(value),
			mode: "correlation_identity" as const,
		}
	}

	return null
}

function looksLikeInternalId(value: string) {
	const v = value.trim()
	return /^[a-f0-9]{24}$/i.test(v) || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
}

function cleanIncidentRuleTitle(incident: any) {
	const fromTitle = firstString(incident?.title)
	if (fromTitle) {
		const cleaned = fromTitle
			.replace(/^incident\s+from\s+/i, "")
			.replace(/^incident\s+created\s+from\s+detection\s+/i, "")
			.trim()
		if (cleaned && cleaned !== fromTitle) return cleaned
	}

	const fromDescription = firstString(incident?.description)
	if (fromDescription) {
		const cleaned = fromDescription
			.replace(/^incident\s+created\s+automatically\s+from\s+detection\s+/i, "")
			.replace(/^created\s+automatically\s+from\s+detection\s+/i, "")
			.replace(/^incident\s+from\s+/i, "")
			.trim()
		if (cleaned && cleaned !== fromDescription) return cleaned
	}

	return ""
}

function ruleCorrelationLabel(incident: any, events: any[]) {
	const fromIncident = firstString(
		incident?.correlation_identity?.rule_name,
		incident?.correlation_identity?.rule_title,
		incident?.correlation_identity?.rule?.title,
		incident?.correlation_identity?.rule?.name,
		incident?.rule_name,
		incident?.rule_title,
		incident?.rule?.title,
		incident?.rule?.name,
		incident?.detection_rule_name,
		incident?.detection_rule,
		incident?.detection?.rule_name,
		incident?.metadata?.rule_name,
		incident?.metadata?.rule_title,
		incident?.metadata?.rule
	)
	if (fromIncident && !looksLikeInternalId(fromIncident)) return fromIncident

	for (const detection of incident?.detections || []) {
		if (detection?.rule_name) return String(detection.rule_name)
		if (detection?.rule_title) return String(detection.rule_title)
		if (detection?.name) return String(detection.name)
		if (detection?.title) return String(detection.title)
		if (detection?.rule?.title) return String(detection.rule.title)
		if (detection?.rule?.name) return String(detection.rule.name)
		if (typeof detection === "string" && detection.trim() && !looksLikeInternalId(detection)) return detection.trim()
	}

	for (const ev of events) {
		const details = ev?.state?.analysis?.details
		if (!Array.isArray(details)) continue
		for (const detail of details) {
			if (detail?.rule_name) return String(detail.rule_name)
			if (detail?.rule_title) return String(detail.rule_title)
			if (detail?.name) return String(detail.name)
			if (detail?.title) return String(detail.title)
			if (detail?.rule?.title) return String(detail.rule.title)
			if (detail?.rule?.name) return String(detail.rule.name)
			if (typeof detail?.rule === "string" && !looksLikeInternalId(detail.rule)) return String(detail.rule)
		}
	}

	return cleanIncidentRuleTitle(incident) || "Matched detection rule"
}

function correlationFieldValue(incident: any) {
	const identity = correlationIdentityFieldValue(incident?.correlation_identity)
	if (identity) return identity

	const correlation = incident?.correlation
	const rule = incident?.rule || incident?.detection?.rule || incident?.metadata?.rule

	if (typeof correlation === "string" && correlation.trim()) {
		return {
			field: correlation.trim(),
			value: firstString(incident?.correlation_value, incident?.parsed_on_value, incident?.based_on_value) || "stored on incident",
			mode: "parsed_on" as const,
		}
	}

	const field = firstString(
		incident?.correlation_identity?.parsed_on,
		incident?.correlation_identity?.parsedOn,
		incident?.correlation_identity?.field,
		incident?.correlation_identity?.key,
		incident?.correlation_identity?.path,
		incident?.parsed_on,
		incident?.parsedOn,
		incident?.based_on,
		incident?.basedOn,
		incident?.correlated_on,
		incident?.correlatedOn,
		incident?.correlation_key,
		incident?.correlation_field,
		correlation?.parsed_on,
		correlation?.parsedOn,
		correlation?.based_on,
		correlation?.basedOn,
		correlation?.correlated_on,
		correlation?.correlatedOn,
		rule?.correlated_on,
		rule?.correlatedOn,
		rule?.correlate_on,
		rule?.correlateOn,
		correlation?.field,
		correlation?.key
	)

	if (!field) return null

	return {
		field,
		value: firstString(
			incident?.correlation_value,
			incident?.parsed_on_value,
			incident?.based_on_value,
			correlation?.value,
			correlation?.field_value
		) || "stored on incident",
		mode: "parsed_on" as const,
	}
}

function normalizeCorrelationHints(incident: any, groups: EvidenceGroup[], events: any[]): CorrelationHint[] {
	const hints: CorrelationHint[] = []
	const direct = correlationFieldValue(incident)

	if (direct) {
		const matching = groups.filter(group => group.key === direct.field || `parsed.${group.key}` === direct.field)

		if (matching.length > 0) {
			for (const group of matching.slice(0, 4)) {
				hints.push({
					key: direct.field,
					value: group.value,
					events: group.events.length,
					lastSeen: group.lastSeen,
					exact: true,
					mode: direct.mode,
				})
			}
		} else {
			hints.push({
				key: direct.field,
				value: direct.value,
				events: Array.isArray(incident?.events) ? incident.events.length : events.length,
				exact: true,
				mode: direct.mode,
			})
		}
	}

	const correlationFields = [
		{ mode: "correlation_identity" as const, value: incident?.correlation_identity?.fields },
		{ mode: "correlation_identity" as const, value: incident?.correlation_identity?.correlated_on },
		{ mode: "correlation_identity" as const, value: incident?.correlation_identity?.correlatedOn },
		{ mode: "correlation_identity" as const, value: incident?.correlation_identity?.correlate_on },
		{ mode: "correlation_identity" as const, value: incident?.correlation_identity?.correlateOn },
		{ mode: "correlate_on" as const, value: incident?.correlate_on },
		{ mode: "correlate_on" as const, value: incident?.correlateOn },
		{ mode: "correlated_on" as const, value: incident?.correlated_on },
		{ mode: "correlated_on" as const, value: incident?.correlatedOn },
		{ mode: "correlated_on" as const, value: incident?.rule?.correlated_on },
		{ mode: "correlated_on" as const, value: incident?.rule?.correlatedOn },
		{ mode: "correlate_on" as const, value: incident?.rule?.correlate_on },
		{ mode: "correlate_on" as const, value: incident?.rule?.correlateOn },
		{ mode: "correlate_on" as const, value: incident?.correlation_fields },
		{ mode: "correlate_on" as const, value: incident?.correlation?.fields },
	]

	for (const source of correlationFields) {
		const fields = Array.isArray(source.value) ? source.value : typeof source.value === "string" ? [source.value] : []
		for (const field of fields) {
			if (typeof field !== "string" || !field.trim()) continue
			const cleanField = field.trim()
			const matching = groups.filter(group => group.key === cleanField || `parsed.${group.key}` === cleanField)
			for (const group of matching.slice(0, 3)) {
				hints.push({
					key: cleanField,
					value: group.value,
					events: group.events.length,
					lastSeen: group.lastSeen,
					exact: true,
					mode: source.mode,
				})
			}
		}
	}

	if (hints.length > 0) return hints.slice(0, 6)

	// Correlator behavior: if no parsed_on/correlate_on is set, the incident is grouped by the rule itself.
	return [{
		key: "rule",
		value: ruleCorrelationLabel(incident, events),
		events: Array.isArray(incident?.events) ? incident.events.length : events.length,
		exact: true,
		mode: "rule",
	}]
}

function buildEvidenceGroups(events: any[]): EvidenceGroup[] {
	const groups = new Map<string, EvidenceGroup>()

	for (const ev of events) {
		for (const key of CORRELATION_FIELDS) {
			for (const value of parsedValues(ev, key)) {
				const groupKey = `${key}:${value}`
				const existing = groups.get(groupKey) || { key, value, events: [] }
				existing.events.push(ev)
				groups.set(groupKey, existing)
			}
		}
	}

	return Array.from(groups.values())
		.map(group => {
			const times = group.events.map(eventTime).filter(Boolean).sort()
			return {
				...group,
				firstSeen: times[0],
				lastSeen: times[times.length - 1],
			}
		})
		.sort((a, b) => b.events.length - a.events.length || a.key.localeCompare(b.key))
		.slice(0, 12)
}


function priorityLabel(priority?: string) {
	const p = String(priority || "low").toLowerCase()
	return p.charAt(0).toUpperCase() + p.slice(1)
}

function statusLabel(status?: string) {
	const s = String(status || "open").replace(/_/g, " ")
	return s.charAt(0).toUpperCase() + s.slice(1)
}

const INTERNAL_FIELD_RE = /(^_id$|^id$|event_?id|object_?id|state_?id|incident_?id)$/i

function shouldShowInFieldInventory(key: string) {
	const normalized = String(key || "").trim()
	if (!normalized) return false
	if (INTERNAL_FIELD_RE.test(normalized)) return false
	return true
}

function buildIndicators(events: any[]) {
	const map = new Map<string, Set<string>>()

	for (const ev of events) {
		if (!ev.parsed) continue

		for (const [key, values] of Object.entries(ev.parsed)) {
			if (!shouldShowInFieldInventory(key)) continue
			if (!Array.isArray(values) || values.length === 0) continue
			if (!map.has(key)) map.set(key, new Set())
			for (const v of values) {
				if (v === null || v === undefined || String(v).trim() === "") continue
				map.get(key)!.add(String(v))
			}
		}
	}

	return Array.from(map.entries()).map(([key, values]) => ({
		key,
		values: Array.from(values),
	}))
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

function SummaryCard({ label, value, helper }: { label: string; value: string | number; helper?: string }) {
	return (
		<div className="incident-stat-card">
			<span>{label}</span>
			<strong>{value}</strong>
			{helper && <small>{helper}</small>}
		</div>
	)
}

export default function IncidentDetailPage() {
	const { incidentId } = useParams()
	const { incident, loading, error, reload } = useIncidentDetail(incidentId!)
	const [note, setNote] = useState("")
	const [submitting, setSubmitting] = useState(false)
	const [updating, setUpdating] = useState(false)
	const [owner, setOwner] = useState("")
	const [users, setUsers] = useState<TeamUser[]>([])
	const [usersLoading, setUsersLoading] = useState(true)

	const eventIds = incident?.events ?? []
	const { events: relatedEvents, loading: eventsLoading } = useIncidentEvents(eventIds)
	const indicators = buildIndicators(relatedEvents)
	const evidenceGroups = useMemo(() => buildEvidenceGroups(relatedEvents), [relatedEvents])
	const correlationHints = useMemo(() => normalizeCorrelationHints(incident, evidenceGroups, relatedEvents), [incident, evidenceGroups, relatedEvents])
	const [showAllEvidence, setShowAllEvidence] = useState(false)
	const visibleEvents = showAllEvidence ? relatedEvents : relatedEvents.slice(0, 25)

	useEffect(() => {
		if (incident) setOwner(incident.owner ?? "")
	}, [incident?.owner])

	useEffect(() => {
		const token = localStorage.getItem("hb_token")
		if (!token) {
			setUsersLoading(false)
			return
		}

		apiFetch(`/herringbone/auth/users`, {
			headers: { Authorization: `Bearer ${token}` },
		})
			.then(res => res.json())
			.then(data => setUsers(data.users || []))
			.catch(() => {})
			.finally(() => setUsersLoading(false))
	}, [])

	if (loading) return <div className="incident-app"><LoadingState title="Loading incident" helper="Fetching incident details, triage state, and related metadata…" /></div>
	if (error) return <div className="incident-app"><div className="incident-error">{error}</div></div>
	if (!incident) return <div className="incident-app"><div className="incident-empty">Incident not found.</div></div>

	const i = incident
	const ruleName = ruleCorrelationLabel(i, relatedEvents)

	async function updateField(field: string, value: any) {
		setUpdating(true)
		try {
			await updateIncident(i._id, { [field]: value })
			await reload()
		} finally {
			setUpdating(false)
		}
	}

	async function submitNote() {
		if (!note.trim()) return
		setSubmitting(true)
		try {
			const author = getCurrentUserEmail()
			await addIncidentNote(i._id, author, note.trim())
			setNote("")
			await reload()
		} finally {
			setSubmitting(false)
		}
	}

	return (
		<div className="incident-app">
			<header className="incident-topbar incident-detail-topbar">
				<div>
					<Link className="incident-back-link" to="/incidents">← Incidents</Link>
					<h1>{i.title ?? "Untitled incident"}</h1>
					<p>{i.description || "Triage the priority, review evidence, assign an owner, and keep investigation notes."}</p>
					<div className="incident-pill-row">
						<Pill tone={`priority-${String(i.priority || "low").toLowerCase()}`}>{priorityLabel(i.priority)}</Pill>
						<Pill tone={`status-${String(i.status || "open").toLowerCase()}`}>{statusLabel(i.status)}</Pill>
						<Pill tone={i.owner ? "owner" : "unassigned"}>{i.owner || "Unassigned"}</Pill>
					</div>
				</div>
				<button className="incident-btn secondary" onClick={reload} disabled={loading}>
					{loading && <Spinner small />}
					Refresh
				</button>
			</header>

			<section className="incident-stat-grid">
				<SummaryCard label="Related events" value={i.events.length} helper={eventsLoading ? "Loading evidence…" : "Loaded evidence"} />
				<SummaryCard label="Detections" value={i.detections.length} helper="Rules linked to incident" />
				<SummaryCard label="Field inventory" value={indicators.length} helper="Parsed fields, excluding event IDs" />
				<SummaryCard label="Notes" value={i.notes.length} helper={`Updated ${fmt(i.updated_at || i.created_at)}`} />
			</section>

			<section className="incident-detail-layout">
				<div className="incident-detail-main">
					<section className="incident-panel incident-evidence-panel">
						<div className="incident-section-title incident-evidence-title">
							<div>
								<h2>Correlation</h2>
								<span>The RuleSet reason these events were grouped. If no parsed_on/correlated_on is set, the correlator groups by the rule title.</span>
							</div>
							<span className="incident-inline-loading">{eventsLoading && <Spinner small />}{eventsLoading ? "Loading events…" : `${relatedEvents.length} events`}</span>
						</div>

						{eventsLoading && <LoadingState title="Loading related events" helper="Fetching the events attached to this incident…" />}
						{!eventsLoading && relatedEvents.length === 0 && <div className="incident-empty">No related events.</div>}

						<div className="incident-rule-name-card">
							<span>Rule name</span>
							<strong>{ruleName}</strong>
						</div>

						{correlationHints.length > 0 ? (
							<div className="incident-correlation-strip" aria-label="Correlation values">
								{correlationHints.map(group => (
									<div key={`${group.key}:${group.value}`} className={`incident-correlation-card ${group.mode || (group.exact ? "exact" : "inferred")}`}>
										<div>
											<span>{group.mode === "rule" ? "Correlated by rule" : group.mode === "correlated_on" ? "Correlated on" : group.exact ? "Correlated on" : "Likely correlated on"}</span>
											<strong>{group.mode === "rule" ? "Rule title" : group.key}</strong>
											<code>{group.value}</code>
										</div>
										<small>{group.events} event{group.events === 1 ? "" : "s"}{group.lastSeen ? ` · last ${fmt(group.lastSeen)}` : ""}</small>
									</div>
								))}
							</div>
						) : (
							<div className="incident-empty">No correlation metadata found.</div>
						)}

						<div className="incident-section-title incident-evidence-subtitle">
							<div>
								<h2>Related events</h2>
								<span>These are the events attached to this incident. The Correlation section above explains why they were grouped.</span>
							</div>
						</div>

						<div className="incident-evidence-toolbar">
							<span>{showAllEvidence ? "Showing all related events" : `Showing latest ${Math.min(visibleEvents.length, 25)} of ${relatedEvents.length} related events`}</span>
							{relatedEvents.length > 25 && (
								<button className="incident-text-btn" onClick={() => setShowAllEvidence(v => !v)}>
									{showAllEvidence ? "Show latest 25" : `Show all ${relatedEvents.length}`}
								</button>
							)}
						</div>

						<div className="incident-evidence-timeline">
							{visibleEvents.map(ev => (
								<article key={ev._id} className={`incident-evidence-card ${severityTone(ev)}`}>
									<div className="incident-evidence-card-head">
										<div>
											<strong>{eventTitle(ev)}</strong>
											<span>{eventSubtitle(ev)}</span>
										</div>
										<div className="incident-evidence-meta">
											<span className="incident-event-id-pill" title={eventId(ev)}>event {shortEventId(ev)}</span>
											<small>{fmt(eventTime(ev))}</small>
											<small>{eventSource(ev)} · {ev.state?.severity != null ? `severity ${ev.state.severity}` : ev.state?.detected ? "detected" : "no detection"}</small>
										</div>
									</div>
								</article>
							))}
						</div>
					</section>

					<section className="incident-panel incident-field-inventory-panel">
						<div className="incident-section-title">
							<div>
								<h2>Field inventory</h2>
								<span>Reference only: parsed fields from related events, with internal/event ID fields removed.</span>
							</div>
							<span>{indicators.length} fields</span>
						</div>
						{indicators.length === 0 && <div className="incident-empty">No parsed fields extracted.</div>}
						<div className="incident-indicator-list">
							{indicators.map(ind => (
								<div key={ind.key} className="incident-indicator-row">
									<span>{ind.key}</span>
									<strong>{ind.values.slice(0, 8).join(", ")}{ind.values.length > 8 ? ` +${ind.values.length - 8} more` : ""}</strong>
								</div>
							))}
						</div>
					</section>
				</div>

				<aside className="incident-detail-side">
					<section className="incident-panel">
						<div className="incident-section-title">
							<h2>Triage</h2>
							<span>Current incident state</span>
						</div>
						<label className="incident-field">
							<span>Priority</span>
							<select className="incident-select" value={i.priority ?? "low"} disabled={updating} onChange={e => updateField("priority", e.target.value)}>
								<option value="low">Low</option>
								<option value="medium">Medium</option>
								<option value="high">High</option>
								<option value="critical">Critical</option>
							</select>
						</label>
						<label className="incident-field">
							<span>Status</span>
							<select className="incident-select" value={i.status ?? "open"} disabled={updating} onChange={e => updateField("status", e.target.value)}>
								<option value="open">Open</option>
								<option value="investigating">Investigating</option>
								<option value="resolved">Resolved</option>
							</select>
						</label>
						<label className="incident-field">
							<span className="incident-field-label-with-spinner">Owner {usersLoading && <Spinner small />}</span>
							<select className="incident-select" value={owner} disabled={updating || usersLoading} onChange={e => {
								const val = e.target.value
								setOwner(val)
								updateField("owner", val || null)
							}}>
								<option value="">Unassigned</option>
								{users.map(u => <option key={u.email} value={u.email}>{u.email} ({u.role})</option>)}
							</select>
						</label>
					</section>

					<section className="incident-panel">
						<div className="incident-section-title">
							<h2>Notes</h2>
							<span>{i.notes.length} notes</span>
						</div>
						<div className="incident-note-list">
							{i.notes.map((n, idx) => (
								<div key={idx} className="incident-note">
									<div><strong>{n.author}</strong><span>{fmt(n.timestamp)}</span></div>
									<p>{n.message}</p>
								</div>
							))}
							{i.notes.length === 0 && <div className="incident-empty">No notes yet.</div>}
						</div>
						<div className="incident-note-box">
							<textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Add investigation notes, decisions, or next steps…" />
							<button className="incident-btn incident-btn-with-spinner" disabled={submitting || !note.trim()} onClick={submitNote}>
								{submitting && <Spinner small />}
								{submitting ? "Adding…" : "Add note"}
							</button>
						</div>
					</section>
				</aside>
			</section>
		</div>
	)
}
