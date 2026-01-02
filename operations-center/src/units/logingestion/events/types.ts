export type EventSource = {
	address: string
	kind: string
}

export type EventState = {
	_id?: string
	event_id?: string
	detected?: boolean
	enriched?: boolean
	parsed?: boolean
	severity?: number | null
	last_updated?: string
}

export type EventLog = {
	_id: string
	raw: string
	source: EventSource
	event_time: string
	ingested_at: string
	state?: EventState
}
