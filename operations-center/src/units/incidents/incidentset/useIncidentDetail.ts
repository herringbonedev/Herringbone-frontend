import { useEffect, useState } from "react"
import { fetchIncident } from "./incidentApi"
import type { IncidentApi, Incident } from "./types"

function normalizeIncident(raw: IncidentApi): Incident {
	return {
		_id: raw._id.$oid,
		title: raw.title,
		description: raw.description,
		status: raw.status,
		priority: raw.priority,
		owner: raw.owner,
		events: Array.isArray(raw.events) ? raw.events : [],
		detections: Array.isArray(raw.detections) ? raw.detections : [],
		notes: Array.isArray(raw.notes) ? raw.notes : [],
		created_at: raw.created_at?.$date,
		updated_at: raw.updated_at?.$date,
	}
}

export function useIncidentDetail(id: string) {
	const [incident, setIncident] = useState<Incident | null>(null)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)

	async function load() {
		try {
			setLoading(true)
			setError(null)
			const data = await fetchIncident(id)
			setIncident(normalizeIncident(data))
		} catch (e: any) {
			setError(e?.message ?? "error")
		} finally {
			setLoading(false)
		}
	}

	useEffect(() => {
		load()
	}, [id])

	return { incident, loading, error, reload: load }
}
