import { useEffect, useState } from "react"
import type { Incident } from "./incidentTypes"

const API_BASE = "http://127.0.0.1:7011"

export function useIncidentDetail(rawId: string) {
	const [incident, setIncident] = useState<Incident | null>(null)
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)

	// normalize id defensively
	const id =
		typeof rawId === "string"
			? rawId
			: (rawId as any)?.$oid

	const load = async () => {
		if (!id) {
			setError("Invalid incident id")
			return
		}

		setLoading(true)
		setError(null)

		try {
			const res = await fetch(
				`${API_BASE}/incidents/incidentset/get_incident?id=${encodeURIComponent(
					id
				)}`
			)

			if (!res.ok) {
				throw new Error(`HTTP ${res.status}`)
			}

			setIncident(await res.json())
		} catch (e: any) {
			setError(e?.message || "Failed to load incident")
			setIncident(null)
		} finally {
			setLoading(false)
		}
	}

	const update = async (patch: Partial<Incident>) => {
		if (!id) return

		await fetch(
			`${API_BASE}/incidents/incidentset/update_incident`,
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ _id: id, ...patch }),
			}
		)

		load()
	}

	useEffect(() => {
		load()
	}, [id])

	return {
		incident,
		loading,
		error,
		reload: load,
		update,
	}
}
