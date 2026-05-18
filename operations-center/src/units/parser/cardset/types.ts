export type MongoId =
	| string
	| {
			$oid: string
	  }

export type SelectorType = "raw" | "source_address" | "raw_regex"

export type Selector = {
	type: SelectorType
	value: string
	not?: Selector | Selector[]
	and_not?: Selector | Selector[]
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
