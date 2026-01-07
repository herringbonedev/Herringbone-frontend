import { useEffect, useState } from "react"
import { fetchIncidents } from "./incidentApi"
import type { Incident } from "./types"

export function useIncidents() {
	const [incidents, setIncidents] = useState<Incident[]>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)

	async function load() {
		try {
			setLoading(true)
			setError(null)
			const data = await fetchIncidents()
			setIncidents(data)
		} catch (err: any) {
			setError(err.message ?? "Unknown error")
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
