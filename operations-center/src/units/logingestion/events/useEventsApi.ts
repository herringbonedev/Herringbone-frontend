import { useEffect, useState } from "react"
import type { EventLog } from "./types"

const API_BASE = "http://127.0.0.1:7010"

export function useEventsApi() {
	const [logs, setLogs] = useState<EventLog[]>([])
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const load = async () => {
		setLoading(true)
		setError(null)
		try {
			const res = await fetch(
				`${API_BASE}/herringbone/logs/get_docs`
			)
			if (!res.ok) throw new Error(`HTTP ${res.status}`)
			const data = await res.json()
			setLogs(Array.isArray(data) ? data : [])
		} catch (e: any) {
			setError(e.message || "Failed to load logs")
		} finally {
			setLoading(false)
		}
	}

	useEffect(() => {
		load()
	}, [])

	return { logs, loading, error, reload: load }
}
