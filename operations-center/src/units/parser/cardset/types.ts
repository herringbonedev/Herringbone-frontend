export type MongoId =
	| string
	| {
			$oid: string
	  }

export type Selector = {
	type: "raw" | "source_address"
	value: string
}

export type KV = {
	key: string
	value: string
}

export type Card = {
	_id?: MongoId
	name?: string
	selector: Selector
	regex?: Record<string, string>[]
	jsonp?: Record<string, string>[]
	last_updated?: {
		$date: string
	}
}
