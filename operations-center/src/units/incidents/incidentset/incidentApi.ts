import type { IncidentApi } from "./types"
import { apiFetch } from "../../../api"

export async function fetchIncidents(): Promise<IncidentApi[]> {
	const res = await apiFetch(`/incidents/incidentset/get_incidents`)
	if (!res.ok) throw new Error(res.statusText)
	return res.json()
}

export async function fetchIncident(id: string): Promise<IncidentApi> {
	const res = await apiFetch(`/incidents/incidentset/get_incident/${id}`)
	if (!res.ok) throw new Error(res.statusText)
	return res.json()
}

export async function addIncidentNote(id: string, author: string, message: string) {
	const res = await apiFetch(`/incidents/incidentset/update_incident`, {
		method: "POST",
		body: JSON.stringify({
			_id: id,
			notes: [{ author, timestamp: new Date().toISOString(), message }],
		}),
	})
	if (!res.ok) throw new Error(res.statusText)
}

export async function updateIncident(id: string, updates: Record<string, any>) {
	const res = await apiFetch(`/incidents/incidentset/update_incident`, {
		method: "POST",
		body: JSON.stringify({ _id: id, ...updates }),
	})
	if (!res.ok) throw new Error(await res.text())
}
