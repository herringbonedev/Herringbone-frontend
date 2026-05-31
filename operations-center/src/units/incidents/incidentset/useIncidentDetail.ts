import { useEffect, useState } from "react"
import { fetchIncident } from "./incidentApi"
import type { IncidentApi, Incident } from "./types"

function normalizeId(raw: any): string {
	if (typeof raw?._id === "string") return raw._id
	if (typeof raw?._id === "object" && raw._id?.$oid) return raw._id.$oid
	return String(raw?._id || "")
}

function normalizeDate(value: any): string | undefined {
	if (!value) return undefined
	if (typeof value === "string") return value
	if (typeof value === "object" && value.$date) return value.$date
	return undefined
}

function normalizeIncident(raw: IncidentApi): Incident {
	return {
		_id: normalizeId(raw),
		title: raw.title,
		description: raw.description,
		status: raw.status,
		priority: raw.priority,
		owner: raw.owner,
		events: Array.isArray(raw.events) ? raw.events : [],
		detections: Array.isArray(raw.detections) ? raw.detections : [],
		notes: Array.isArray(raw.notes) ? raw.notes : [],
		created_at: normalizeDate(raw.created_at),
		updated_at: normalizeDate(raw.updated_at),
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
