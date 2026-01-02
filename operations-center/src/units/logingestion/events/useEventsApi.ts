import { useEffect, useState } from "react"
import type { EventLog } from "./types"

const API_BASE = "http://127.0.0.1:7010"

function safeJsonParse(text: string) {
	let t = (text ?? "").trim()

	// handle accidental wrapping quotes: '[{...}]'
	if (
		(t.startsWith("'") && t.endsWith("'")) ||
		(t.startsWith('"') && t.endsWith('"'))
	) {
		t = t.slice(1, -1).trim()
	}

	// handle "b'...'" style payloads
	if (
		(t.startsWith("b'") && t.endsWith("'")) ||
		(t.startsWith('b"') && t.endsWith('"'))
	) {
		t = t.slice(2, -1).trim()
	}

	// strip BOM if present
	if (t.charCodeAt(0) === 0xfeff) {
		t = t.slice(1)
	}

	if (!t) return []

	return JSON.parse(t)
}

export function useEventsApi() {
	const [logs, setLogs] = useState<EventLog[]>([])
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const load = async () => {
		setLoading(true)
		setError(null)

		try {
			const res = await fetch(`${API_BASE}/herringbone/logs/events`)

			if (!res.ok) {
				const body = await res.text().catch(() => "")
				throw new Error(body || `HTTP ${res.status}`)
			}

			const text = await res.text()
			const data = safeJsonParse(text)

			setLogs(Array.isArray(data) ? (data as EventLog[]) : [])
		} catch (e: any) {
			setError(e?.message || "Failed to load events")
			setLogs([])
		} finally {
			setLoading(false)
		}
	}

	useEffect(() => {
		load()
	}, [])

	return { logs, loading, error, reload: load }
}
