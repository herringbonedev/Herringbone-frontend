export type IncidentNote = {
	message: string
	author?: string | null
	created_at?: string
}

export type Incident = {
	_id: string
	title: string
	description?: string
	status: "open" | "investigating" | "resolved"
	priority: "low" | "medium" | "high"
	owner: string | null
	detections: string[]
	events: string[]
	notes: IncidentNote[]
	created_at?: string
	updated_at?: string
}
