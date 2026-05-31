export type MongoId =
	| string
	| {
			$oid: string
	  }

export type SelectorType = "raw" | "source_address" | "raw_regex" | "path" | "field" | "json" | "jsonpath"
export type SelectorMatch = "exact" | "contains" | "regex" | "exists" | "not_exists"

export type Selector = {
	type: SelectorType
	value?: string
	path?: string
	field?: string
	match?: SelectorMatch
	not?: Selector | Selector[]
	and_not?: Selector | Selector[]
}

export type KV = {
	key: string
	value: string
}

export type CardMetadata = {
	folder?: string
	label?: string
	type?: string
	source?: string
	pack?: string
	tags?: string[]
	[key: string]: unknown
}

export type Card = {
	_id?: MongoId
	name?: string
	metadata?: CardMetadata
	selector: Selector
	regex?: Record<string, string>[]
	jsonp?: Record<string, string>[]
	last_updated?: {
		$date: string
	}
}
