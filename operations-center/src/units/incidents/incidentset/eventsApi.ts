import { useEffect, useState } from "react"
import { apiFetch } from "../../../api"

function getAuthHeaders() {
	const token = localStorage.getItem("hb_token")
	if (!token) throw new Error("Not authenticated")

	return {
		"Content-Type": "application/json",
		Authorization: `Bearer ${token}`,
	}
}

export type IncidentEvent = {
	_id: string
	raw: string
	parsed?: Record<string, string[]>
	state?: {
		severity?: number | null
		detected?: boolean
	}
}

async function fetchEvent(id: string): Promise<IncidentEvent | null> {
	const res = await apiFetch(`/herringbone/logs/events/${id}`,{
		headers: getAuthHeaders(),
	})
	if (!res.ok) return null
	return res.json()
}

export function useIncidentEvents(eventIds: string[]) {
	const [events, setEvents] = useState<IncidentEvent[]>([])
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)

	useEffect(() => {
		let cancelled = false

		async function load() {
			if (eventIds.length === 0) {
				setEvents([])
				return
			}

			setLoading(true)
			setError(null)

			try {
				const results = await Promise.all(
					eventIds.map(id => fetchEvent(id))
				)

				if (!cancelled) {
					setEvents(results.filter(Boolean) as IncidentEvent[])
				}
			} catch (e: any) {
				if (!cancelled) {
					setError(e?.message ?? "Failed to load events")
					setEvents([])
				}
			} finally {
				if (!cancelled) setLoading(false)
			}
		}

		load()
		return () => {
			cancelled = true
		}
	}, [eventIds.join(",")])

	return { events, loading, error }
}
