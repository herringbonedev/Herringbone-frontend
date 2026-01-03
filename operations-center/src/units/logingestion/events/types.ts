export type EventSource = {
	address: string
	kind: string
}

export type DetectionDetail = {
	rule_name?: string
	severity?: number
	description?: string
	matched?: boolean
}

export type DetectionAnalysis = {
	detection?: boolean
	details?: DetectionDetail[]
}

export type EventState = {
	_id?: string
	event_id?: string
	detected?: boolean
	enriched?: boolean
	parsed?: boolean
	severity?: number | null
	last_updated?: string
	analysis?: DetectionAnalysis
}

export type EventLog = {
	_id: string
	raw: string
	source: EventSource
	event_time: string
	ingested_at: string
	state?: EventState
	parsed?: Record<string, unknown[]>
}
