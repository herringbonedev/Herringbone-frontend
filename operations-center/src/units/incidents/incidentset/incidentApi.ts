import type { IncidentApi } from "./types"

function getAuthHeaders() {
	const token = localStorage.getItem("hb_token")
	if (!token) throw new Error("Not authenticated")

	return {
		"Content-Type": "application/json",
		Authorization: `Bearer ${token}`,
	}
}

export async function fetchIncidents(): Promise<IncidentApi[]> {
	const res = await fetch(`/incidents/incidentset/get_incidents`, {
		headers: getAuthHeaders(),
	})

	if (!res.ok) throw new Error(res.statusText)
	return res.json()
}

export async function fetchIncident(id: string): Promise<IncidentApi> {
	const res = await fetch(`/incidents/incidentset/get_incident/${id}`, {
		headers: getAuthHeaders(),
	})

	if (!res.ok) throw new Error(res.statusText)
	return res.json()
}

export async function addIncidentNote(
	id: string,
	author: string,
	message: string
) {
	const res = await fetch(`/incidents/incidentset/update_incident`, {
		method: "POST",
		headers: getAuthHeaders(),
		body: JSON.stringify({
			_id: id,
			notes: [
				{
					author,
					timestamp: new Date().toISOString(),
					message,
				},
			],
		}),
	})

	if (!res.ok) throw new Error(res.statusText)
}

export async function updateIncident(
	id: string,
	updates: Record<string, any>
) {
	const res = await fetch(`/incidents/incidentset/update_incident`, {
		method: "POST",
		headers: getAuthHeaders(),
		body: JSON.stringify({ _id: id, ...updates }),
	})

	if (!res.ok) {
		throw new Error(await res.text())
	}
}
