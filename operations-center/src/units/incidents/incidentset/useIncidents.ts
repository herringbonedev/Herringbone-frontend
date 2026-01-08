import { useEffect, useState } from "react"
import { fetchIncidents } from "./incidentApi"
import type { IncidentApi, Incident } from "./types"

function normalizeIncident(raw: IncidentApi): Incident {
	return {
		_id: raw._id.$oid,
		title: raw.title,
		description: raw.description,
		status: raw.status,
		priority: raw.priority,
		owner: raw.owner,
		events: raw.events,
		detections: raw.detections,
		created_at: raw.created_at?.$date,
		updated_at: raw.updated_at?.$date,
	}
}

export function useIncidents() {
	const [incidents, setIncidents] = useState<Incident[]>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)

	async function load() {
		try {
			setLoading(true)
			setError(null)
			const data = await fetchIncidents()
			setIncidents(data.map(normalizeIncident))
		} catch (e: any) {
			setError(e?.message ?? "error")
		} finally {
			setLoading(false)
		}
	}

	useEffect(() => {
		load()
	}, [])

	return { incidents, loading, error, reload: load }
}
