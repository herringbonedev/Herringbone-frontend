import { FilterBuilder, type FilterGroup, type LogicJoin } from "./FilterBuilder"
import type { SchemaField } from "./useSearchSchema"

export type RelatedCollectionRule = {
  relation: "in" | "not_in"
  collection: string
  localField: string
  foreignField: string
  join: LogicJoin
  limit: number
  filters: FilterGroup[]
}

type Props = {
  value: RelatedCollectionRule | null
  onChange: (rule: RelatedCollectionRule | null) => void
  relatedFields: SchemaField[]
}

const collections = [
  "events",
  "event_state",
  "detections",
  "incidents",
  "parse_results"
]

function defaultRule(): RelatedCollectionRule {
  return {
    relation: "in",
    collection: "detections",
    localField: "_id",
    foreignField: "event_id",
    join: "and",
    limit: 500,
    filters: [],
  }
}

export function RelatedCollectionBuilder({ value, onChange, relatedFields }: Props) {
  if (!value) {
    return (
      <div className="related-empty-row">
        <button className="search-button secondary-button" onClick={() => onChange(defaultRule())}>
          + Related collection filter
        </button>
      </div>
    )
  }

  function update(patch: Partial<RelatedCollectionRule>) {
    if (!value) return
    onChange({ ...value, ...patch })
  }

  return (
    <div className="related-builder">
      <div className="related-header">
        <div className="related-title">Related collection</div>
        <button className="link-button danger-link" onClick={() => onChange(null)}>Remove</button>
      </div>

      <div className="related-grid">
        <label className="search-label">
          <span>Require</span>
          <select
            className="search-select"
            value={value.relation}
            onChange={e => update({ relation: e.target.value as RelatedCollectionRule["relation"] })}
          >
            <option value="in">is in</option>
            <option value="not_in">is not in</option>
          </select>
        </label>

        <label className="search-label">
          <span>Collection</span>
          <select
            className="search-select"
            value={value.collection}
            onChange={e => update({ collection: e.target.value, filters: [] })}
          >
            {collections.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>

        <label className="search-label">
          <span>Main field</span>
          <input
            className="search-input related-field-input"
            value={value.localField}
            onChange={e => update({ localField: e.target.value })}
            placeholder="_id"
          />
        </label>

        <label className="search-label">
          <span>Related field</span>
          <input
            className="search-input related-field-input"
            value={value.foreignField}
            onChange={e => update({ foreignField: e.target.value })}
            placeholder="event_id"
          />
        </label>

        <label className="search-label">
          <span>Max related IDs</span>
          <input
            className="search-input"
            value={String(value.limit)}
            onChange={e => update({ limit: parseInt(e.target.value) || 500 })}
          />
        </label>
      </div>

      <div className="related-where-label">Where related document matches</div>
      <FilterBuilder
        fields={relatedFields}
        value={value.filters}
        onChange={filters => update({ filters })}
      />
    </div>
  )
}
