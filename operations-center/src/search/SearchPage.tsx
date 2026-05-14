import { useState, useEffect } from "react"
import React from "react"
import { useSearchApi } from "./useSearchApi"
import { useSearchSchema } from "./useSearchSchema"
import { FilterBuilder, type FilterRow } from "./FilterBuilder"
import "./search.css"

function preview(val: any, max = 120) {
  if (val == null) return ""
  const s = typeof val === "string" ? val : JSON.stringify(val)
  return s.length > max ? s.slice(0, max) + "…" : s
}

function shortId(id: string) {
  return id.length > 8 ? id.slice(-8) : id
}

function extractMessage(row: any): string {
  return row.raw || row.message || row.description || row?.parsed?.command || row?.parsed?.message || ""
}

function buildColumns(rows: any[]) {
  if (!rows.length) return []
  const priority = ["severity", "priority", "event_time", "ingested_at", "created_at"]
  const fields = new Set<string>()

  rows.forEach(r => {
    Object.keys(r).forEach(k => {
      const v = r[k]
      if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") fields.add(k)
    })
  })

  const ordered: string[] = []
  for (const p of priority) if (fields.has(p)) ordered.push(p)
  for (const f of fields) if (!ordered.includes(f) && f !== "_id") ordered.push(f)
  return ordered.slice(0, 6)
}

function computeRange(range: string) {
  if (range === "all") return { from: null, to: null }

  const now = new Date()
  let from: Date

  switch (range) {
    case "1h": from = new Date(now.getTime() - 3600_000); break
    case "6h": from = new Date(now.getTime() - 6 * 3600_000); break
    case "24h": from = new Date(now.getTime() - 24 * 3600_000); break
    case "7d": from = new Date(now.getTime() - 7 * 24 * 3600_000); break
    default: return { from: null, to: null }
  }

  return { from: from.toISOString(), to: now.toISOString() }
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function parseList(value: string) {
  return value
    .split(",")
    .map(v => v.trim())
    .filter(Boolean)
}

function parseScalar(value: string) {
  const trimmed = value.trim()
  if (trimmed === "true") return true
  if (trimmed === "false") return false
  if (trimmed !== "" && /^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed)
  return trimmed
}

function rowToCondition(row: FilterRow) {
  if (!row.field || !row.kind) return null

  if (row.kind === "range") {
    const r: any = {}
    if (row.min != null) r["$gte"] = row.min
    if (row.max != null) r["$lte"] = row.max
    if (!Object.keys(r).length) return null
    return { [row.field]: r }
  }

  const v = row.values
  if (!v) return null

  if (row.kind === "in") {
    const values = parseList(v).map(parseScalar)
    if (!values.length) return null
    return { [row.field]: { "$in": values } }
  }

  if (row.kind === "eq") {
    return { [row.field]: parseScalar(v) }
  }

  if (row.kind === "contains") {
    return { [row.field]: { "$regex": escapeRegex(v), "$options": "i" } }
  }

  if (row.kind === "prefix") {
    return { [row.field]: { "$regex": `^${escapeRegex(v)}`, "$options": "i" } }
  }

  return null
}

function buildFilterQuery(rows: FilterRow[]) {
  const conds: { cond: any; join: "and" | "or" }[] = []

  rows.forEach((r, idx) => {
    const c = rowToCondition(r)
    if (!c) return
    conds.push({ cond: c, join: idx === 0 ? "and" : (r.join || "and") })
  })

  if (!conds.length) return {}

  let cur = conds[0].cond
  for (let i = 1; i < conds.length; i++) {
    const join = conds[i].join
    cur = join === "or" ? { "$or": [cur, conds[i].cond] } : { "$and": [cur, conds[i].cond] }
  }

  return cur
}

export default function SearchPage() {
  const [collection, setCollection] = useState("events")
  const [limit, setLimit] = useState(100)
  const [timeRange, setTimeRange] = useState("24h")

  const [filters, setFilters] = useState<FilterRow[]>([])
  const [queryText, setQueryText] = useState("{}")

  const [results, setResults] = useState<any[]>([])
  const [openId, setOpenId] = useState<string | null>(null)
  const [nextAfter, setNextAfter] = useState<string | null>(null)
  const [page, setPage] = useState(1)

  const { search, loading, error } = useSearchApi()
  const { fields } = useSearchSchema(collection)
  const columns = buildColumns(results)

  useEffect(() => {
    setFilters([])
    setQueryText("{}")
    setResults([])
    setNextAfter(null)
    setPage(1)
    setOpenId(null)
  }, [collection])

  useEffect(() => {
    const q = buildFilterQuery(filters)
    setQueryText(JSON.stringify(q, null, 2))
  }, [filters])

  async function runSearch(cursor: string | null, reset: boolean) {
    let q: Record<string, any>
    try {
      q = JSON.parse(queryText || "{}")
    } catch (e: any) {
      alert("Invalid JSON query: " + e.message)
      return
    }

    const range = computeRange(timeRange)

    const resp = await search(
      collection,
      q,
      limit,
      cursor,
      range.from,
      range.to,
      null,
      null,
      null,
      null,
      null
    )

    setResults(resp.results || [])
    setNextAfter(resp.next_after || null)
    setOpenId(null)
    if (reset) setPage(1)
  }

  async function resetSearch() {
    setNextAfter(null)
    setPage(1)
    await runSearch(null, true)
  }

  async function nextPage() {
    if (!nextAfter) return
    setPage(p => p + 1)
    await runSearch(nextAfter, false)
  }

  return (
    <div className="search-page">
      <div className="search-header">
        <div className="search-title">Search</div>

        <div className="search-controls">
          <label className="search-label">
            <span>Collection</span>
            <select value={collection} onChange={e => setCollection(e.target.value)} className="search-select">
              <option value="events">events</option>
              <option value="event_state">event_state</option>
              <option value="detections">detections</option>
              <option value="incidents">incidents</option>
              <option value="incident_events">incident_events</option>
              <option value="parse_results">parse_results</option>
              <option value="enrichment_results">enrichment_results</option>
            </select>
          </label>

          <label className="search-label">
            <span>Time</span>
            <select value={timeRange} onChange={e => setTimeRange(e.target.value)} className="search-select">
              <option value="1h">Last 1h</option>
              <option value="6h">Last 6h</option>
              <option value="24h">Last 24h</option>
              <option value="7d">Last 7d</option>
              <option value="all">All time</option>
            </select>
          </label>

          <label className="search-label">
            <span>Limit</span>
            <input
              className="search-input"
              value={String(limit)}
              onChange={e => setLimit(parseInt(e.target.value) || 100)}
            />
          </label>

          <button className="search-button" onClick={resetSearch} disabled={loading}>
            {loading ? "Searching…" : "Search"}
          </button>
        </div>

        <div style={{ marginTop: 8 }}>
          <FilterBuilder fields={fields} value={filters} onChange={setFilters} />
        </div>

        <div className="search-query">
          <div className="search-query-label">Query (JSON)</div>
          <textarea
            className="search-textarea"
            style={{ minHeight: 180 }}
            value={queryText}
            onChange={e => setQueryText(e.target.value)}
          />
        </div>

        {error && <div className="search-error">{error}</div>}
      </div>

      <div className="search-results">
        <div className="results-header">
          <div className="results-title">Page {page} ({results.length})</div>
          <div className="pagination-controls">
            <button onClick={nextPage} disabled={!nextAfter || loading} className="page-btn">Next →</button>
          </div>
        </div>

        <div className="results-table-wrap">
          <table className="results-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Message</th>
                {columns.map(c => <th key={c}>{c}</th>)}
                <th></th>
              </tr>
            </thead>
            <tbody>
              {results.map(row => {
                const id = String(row._id)
                const isOpen = openId === id

                return (
                  <React.Fragment key={id}>
                    <tr>
                      <td className="mono">{shortId(id)}</td>
                      <td>{preview(extractMessage(row))}</td>
                      {columns.map(c => <td key={c}>{preview(row[c])}</td>)}
                      <td>
                        <button className="link-button" onClick={() => setOpenId(isOpen ? null : id)}>
                          {isOpen ? "Hide" : "View"}
                        </button>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr>
                        <td colSpan={columns.length + 3}>
                          <pre className="json-viewer">{JSON.stringify(row, null, 2)}</pre>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
