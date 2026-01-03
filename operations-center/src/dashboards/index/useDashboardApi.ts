import { useEffect, useState } from "react"

const API_BASE = "http://127.0.0.1:7010"

export type Summary = {
	events_24h: number
	detected: number
	undetected: number
	high_severity: number
	failed: number
}

export type RecentEvent = {
	event_id: string
	ingested_at?: string
	source?: { address?: string }
	detected: boolean
	severity?: number
	error?: string
}

export type RecentDetection = {
	event_id: string
	severity?: number
	inserted_at?: string
}

export type RecentIncident = {
	incident_id: string
	title: string
	status: string
	priority: string
	owner: string | null
	created_at?: string
}

export type IncidentThroughputPoint = {
	ts: string
	open: number
	resolved: number
}

export function useDashboardApi() {
	const [summary, setSummary] = useState<Summary | null>(null)
	const [events, setEvents] = useState<RecentEvent[]>([])
	const [detections, setDetections] = useState<RecentDetection[]>([])
	const [incidents, setIncidents] = useState<RecentIncident[]>([])
	const [throughput, setThroughput] = useState<IncidentThroughputPoint[]>([])
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const load = async () => {
		setLoading(true)
		setError(null)

		try {
			const [s, e, d, i, t] = await Promise.all([
				fetch(`${API_BASE}/herringbone/logs/dashboard/summary`).then(r => r.json()),
				fetch(`${API_BASE}/herringbone/logs/dashboard/recent-events?n=10`).then(r => r.json()),
				fetch(`${API_BASE}/herringbone/logs/dashboard/recent-detections?n=10`).then(r => r.json()),
				fetch(`${API_BASE}/herringbone/logs/dashboard/recent-incidents?n=10`).then(r => r.json()),
				fetch(`${API_BASE}/herringbone/logs/dashboard/incidents-throughput?days=7`).then(r => r.json()),
			])

			setSummary(s)
			setEvents(e)
			setDetections(d)
			setIncidents(i)
			setThroughput(t)
		} catch (err: any) {
			setError(err?.message || "Failed to load dashboard")
		} finally {
			setLoading(false)
		}
	}

	useEffect(() => {
		load()
	}, [])

	return {
		summary,
		events,
		detections,
		incidents,
		throughput,
		loading,
		error,
		reload: load,
	}
}
