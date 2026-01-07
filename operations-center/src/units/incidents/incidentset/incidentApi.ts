import type { Incident } from "./types"

const API_BASE = "http://127.0.0.1:7010"

export async function fetchIncidents(): Promise<Incident[]> {
	const res = await fetch(`${API_BASE}/incidents`)
	if (!res.ok) {
		throw new Error(`Failed to fetch incidents: ${res.status}`)
	}

	return res.json()
}
