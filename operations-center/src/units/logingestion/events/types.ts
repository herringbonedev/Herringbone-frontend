export type MongoDate = {
	$date: string
}

export type MongoId = {
	$oid: string
}

export type ReconResults = Record<string, any>

export type MatcherRule = {
	key: string
	regex: string
}

export type DetectionDetail = {
	rule_name: string
	severity: number
	description: string
	matched: boolean
	matcher_details?: string
	matcher_rule?: MatcherRule
}

export type DetectionAnalysis = {
	detection: boolean
	details: DetectionDetail[]
}

export type DetectionResults = {
	detected: boolean
	updated_at?: MongoDate
	analysis?: DetectionAnalysis
}

export type EventLog = {
	_id: MongoId
	source_address: string
	raw_log: string

	recon: boolean
	detected: boolean

	status: string | null
	last_update?: MongoDate
	last_processed?: MongoDate

	recon_data?: {
		results?: ReconResults
		enrichment_error?: string
	}

	detection_results?: DetectionResults
}