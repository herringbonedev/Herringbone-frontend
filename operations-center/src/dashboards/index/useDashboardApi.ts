import { useEffect, useState } from "react"

const API_BASE = "http://127.0.0.1:7010"

export type DashboardSummary = {
	events_24h: number
	detected: number
	undetected: number
	high_severity: number
	failed: number
}

export type DashboardRecentEvent = {
	event_id: string
	ingested_at?: string
	source?: { address?: string }
	detected: boolean
	severity?: number
	error?: string
}

export type DashboardRecentDetection = {
	event_id: string
	severity?: number
	inserted_at?: string
}

export function useDashboardApi() {
	const [summary, setSummary] = useState<DashboardSummary | null>(null)
	const [events, setEvents] = useState<DashboardRecentEvent[]>([])
	const [detections, setDetections] = useState<DashboardRecentDetection[]>([])
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const load = async () => {
		setLoading(true)
		setError(null)

		try {
			const [summaryRes, eventsRes, detectionsRes] = await Promise.all([
				fetch(`${API_BASE}/herringbone/logs/dashboard/summary`),
				fetch(`${API_BASE}/herringbone/logs/dashboard/recent-events?n=10`),
				fetch(`${API_BASE}/herringbone/logs/dashboard/recent-detections?n=10`),
			])

			if (!summaryRes.ok) throw new Error("Failed to load dashboard summary")
			if (!eventsRes.ok) throw new Error("Failed to load recent events")
			if (!detectionsRes.ok) throw new Error("Failed to load recent detections")

			const summaryJson = await summaryRes.json()
			const eventsJson = await eventsRes.json()
			const detectionsJson = await detectionsRes.json()

			setSummary(summaryJson)
			setEvents(Array.isArray(eventsJson) ? eventsJson : [])
			setDetections(Array.isArray(detectionsJson) ? detectionsJson : [])
		} catch (e: any) {
			setError(e?.message || "Failed to load dashboard data")
			setSummary(null)
			setEvents([])
			setDetections([])
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
		loading,
		error,
		reload: load,
	}
}
