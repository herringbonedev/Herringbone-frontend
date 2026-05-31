export type EventSource = {
	address?: string
	kind?: string
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
	claimed?: boolean
	severity?: number | null
	last_stage?: string
	parsed_at?: string
	parsed_by?: string
	last_updated?: string
	analysis?: DetectionAnalysis
}

export type EventReceiver = {
	hostname?: string
	batch?: boolean
}

export type EventLog = {
	_id: string
	event_id?: string
	context_id?: string
	severity?: number | null
	raw: string
	source?: EventSource
	event_time?: string
	ingested_at?: string
	created_at?: string
	receiver?: EventReceiver
	state?: EventState
	parsed?: Record<string, unknown[]>
	detections?: unknown[]
	detected?: boolean
	detection?: boolean
}
