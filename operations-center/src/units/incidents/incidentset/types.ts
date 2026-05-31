export type MongoDate = {
	$date: string
}

export type MongoId = string | { $oid: string }

export type IncidentNoteApi = {
	author: string
	timestamp: string
	message: string
}

export type IncidentApi = {
	_id: MongoId
	title?: string
	description?: string
	status?: string
	priority?: string
	owner?: string | null
	events?: string[]
	detections?: string[]
	notes?: IncidentNoteApi[]
	created_at?: MongoDate
	updated_at?: MongoDate
}

export type IncidentNote = {
	author: string
	timestamp: string
	message: string
}

export type Incident = {
	_id: string
	title?: string
	description?: string
	status?: string
	priority?: string
	owner?: string | null
	events: string[]
	detections: string[]
	notes: IncidentNote[]
	created_at?: string
	updated_at?: string
}
