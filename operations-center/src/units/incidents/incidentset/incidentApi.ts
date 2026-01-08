import type { IncidentApi } from "./types"

const API_BASE = "http://127.0.0.1:7011/incidents/incidentset"

export async function fetchIncidents(): Promise<IncidentApi[]> {
	const res = await fetch(`${API_BASE}/get_incidents`)
	if (!res.ok) {
		throw new Error(`Failed to fetch incidents: ${res.status}`)
	}
	return res.json()
}