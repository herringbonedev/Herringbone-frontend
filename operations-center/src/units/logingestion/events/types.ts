export type MongoDate = {
	$date: string
}

export type MongoId = {
	$oid: string
}

export type ReconResults = Record<string, any>

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
}
