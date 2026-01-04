import { useEffect, useState } from "react"
import type { Incident } from "./incidentTypes"

const API_BASE = "http://127.0.0.1:7011"

export function useIncidentList() {
	const [incidents, setIncidents] = useState<Incident[]>([])
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const load = async () => {
		setLoading(true)
		setError(null)

		try {
			const res = await fetch(
				`${API_BASE}/incidents/incidentset/get_incidents`
			)

			if (!res.ok) throw new Error(`HTTP ${res.status}`)

			setIncidents(await res.json())
		} catch (e: any) {
			setError(e?.message || "Failed to load incidents")
			setIncidents([])
		} finally {
			setLoading(false)
		}
	}

	useEffect(() => {
		load()
	}, [])

	return {
		incidents,
		loading,
		error,
		reload: load,
	}
}
