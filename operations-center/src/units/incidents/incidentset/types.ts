export type MongoDate = {
	$date: string
}

export type IncidentApi = {
	_id: { $oid: string }
	title?: string
	description?: string
	status?: string
	priority?: string
	owner?: string | null
	events?: string[]
	detections?: string[]
	created_at?: MongoDate
	updated_at?: MongoDate
}

export type Incident = {
	_id: string
	title?: string
	description?: string
	status?: string
	priority?: string
	owner?: string | null
	events?: string[]
	detections?: string[]
	created_at?: string
	updated_at?: string
}
