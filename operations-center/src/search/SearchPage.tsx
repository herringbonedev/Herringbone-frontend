import React, { useState, useEffect, useMemo, useRef } from "react"
import { useSearchApi } from "./useSearchApi"
import { useSearchSchema } from "./useSearchSchema"
import { FilterBuilder, type FilterGroup, type FilterRow, type LogicJoin } from "./FilterBuilder"
import { RelatedCollectionBuilder, type RelatedCollectionRule } from "./RelatedCollectionBuilder"
import "./search.css"

const MESSAGE_FIELDS = new Set(["raw", "message", "MESSAGE", "description"])

const SEARCH_COLLECTIONS = new Set(["events", "event_state", "detections", "incidents", "parse_results"])
const SEARCH_RANGES = new Set(["1h", "6h", "24h", "7d", "all"])

function initialSearchState() {
  if (typeof window === "undefined") {
    return {
      collection: "events",
      limit: 100,
      timeRange: "24h",
      queryText: "{}",
      autoRun: false,
    }
  }

  const params = new URLSearchParams(window.location.search)
  const collectionParam = params.get("collection") || "events"
  const rangeParam = params.get("range") || params.get("time_range") || "24h"
  const limitParam = Number(params.get("limit") || "100")
  const rawQuery = params.get("q") || "{}"

  let queryText = "{}"
  try {
    queryText = JSON.stringify(JSON.parse(rawQuery), null, 2)
  } catch {
    queryText = rawQuery || "{}"
  }

  return {
    collection: SEARCH_COLLECTIONS.has(collectionParam) ? collectionParam : "events",
    limit: Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 500) : 100,
    timeRange: SEARCH_RANGES.has(rangeParam) ? rangeParam : "24h",
    queryText,
    autoRun: params.get("run") === "1" || params.get("run") === "true",
  }
}


function isEmptyValue(val: any) {
  if (val == null) return true
  if (typeof val === "string" && val.trim() === "") return true
  if (Array.isArray(val) && val.length === 0) return true
  if (typeof val === "object" && !Array.isArray(val) && Object.keys(val).length === 0) return true
  return false
}

function preview(val: any, max = 120) {
  if (isEmptyValue(val)) return ""
  const s = typeof val === "string" ? val : JSON.stringify(val)
  return s.length > max ? s.slice(0, max) + "…" : s
}

function cellText(val: any, max = 120) {
  const p = preview(val, max)
  return p || "—"
}

function cellClass(val: any) {
  return isEmptyValue(val) ? "cell-empty" : ""
}

function shortId(id: string) {
  return id.length > 8 ? id.slice(-8) : id
}

function extractMessage(row: any): string {
  return row.raw || row.message || row.MESSAGE || row.description || row?.parsed?.command || row?.parsed?.message || ""
}

function buildColumns(rows: any[]) {
  if (!rows.length) return []
  const priority = ["severity", "priority", "event_id", "event_time", "ingested_at", "created_at", "source", "host"]
  const fields = new Map<string, number>()

  rows.forEach(r => {
    Object.keys(r).forEach(k => {
      if (k === "_id") return
      if (MESSAGE_FIELDS.has(k)) return

      const v = r[k]
      if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
        if (!isEmptyValue(v)) fields.set(k, (fields.get(k) || 0) + 1)
      }
    })
  })

  const ordered: string[] = []
  for (const p of priority) {
    if ((fields.get(p) || 0) > 0) ordered.push(p)
  }

  const remaining = [...fields.keys()]
    .filter(f => !ordered.includes(f) && (fields.get(f) || 0) > 0)
    .sort((a, b) => (fields.get(b) || 0) - (fields.get(a) || 0) || a.localeCompare(b))

  ordered.push(...remaining)
  return ordered.slice(0, 7)
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

function getPathValue(row: any, path: string) {
  if (!path) return undefined
  return path.split(".").reduce((cur, part) => {
    if (cur == null) return undefined
    return cur[part]
  }, row)
}

function normalizeJoinValue(value: any) {
  if (value == null) return null
  if (typeof value === "object" && !Array.isArray(value)) {
    if (typeof value.$oid === "string") return value.$oid
    if (typeof value.toString === "function") return value.toString()
  }
  return value
}

function uniqueRelatedValues(rows: any[], foreignField: string) {
  const out: any[] = []
  const seen = new Set<string>()

  rows.forEach(row => {
    const raw = getPathValue(row, foreignField)
    const values = Array.isArray(raw) ? raw : [raw]

    values.forEach(v => {
      const normalized = normalizeJoinValue(v)
      if (normalized == null || normalized === "") return
      const key = typeof normalized === "string" ? normalized : JSON.stringify(normalized)
      if (seen.has(key)) return
      seen.add(key)
      out.push(normalized)
    })
  })

  return out
}

function combineWithRelatedQuery(baseQuery: Record<string, any>, related: RelatedCollectionRule, values: any[]) {
  const relatedClause = {
    [related.localField]: { [related.relation === "not_in" ? "$nin" : "$in"]: values },
  }

  if (!Object.keys(baseQuery || {}).length) return relatedClause
  return related.join === "or" ? { "$or": [baseQuery, relatedClause] } : { "$and": [baseQuery, relatedClause] }
}

function buildSearchUrl(
  collection: string,
  query: Record<string, any>,
  limit: number,
  fromTs?: string | null,
  toTs?: string | null,
  after?: string | null
) {
  const params = new URLSearchParams()
  params.set("limit", String(limit))
  params.set("q", JSON.stringify(query))
  if (after) params.set("after", after)
  if (fromTs) params.set("from_ts", fromTs)
  if (toTs) params.set("to_ts", toTs)

  const base = typeof window !== "undefined" ? window.location.origin : ""
  return `${base}/herringbone/search/${collection}?${params.toString()}`
}

async function copyText(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value)
    return
  }

  const textarea = document.createElement("textarea")
  textarea.value = value
  textarea.setAttribute("readonly", "true")
  textarea.style.position = "fixed"
  textarea.style.left = "-9999px"
  document.body.appendChild(textarea)
  textarea.select()
  document.execCommand("copy")
  document.body.removeChild(textarea)
}

function notCondition(cond: any) {
  return { "$nor": [cond] }
}

function andCondition(a: any, b: any) {
  return { "$and": [a, b] }
}

function orCondition(a: any, b: any) {
  return { "$or": [a, b] }
}

function nandCondition(a: any, b: any) {
  return notCondition(andCondition(a, b))
}

function norCondition(a: any, b: any) {
  return { "$nor": [a, b] }
}

function xorCondition(a: any, b: any) {
  return andCondition(orCondition(a, b), nandCondition(a, b))
}

function xnorCondition(a: any, b: any) {
  return notCondition(xorCondition(a, b))
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

  if (row.kind === "in" || row.kind === "not_in") {
    const values = parseList(v).map(parseScalar)
    if (!values.length) return null
    const cond = { [row.field]: { "$in": values } }
    return row.kind === "not_in" ? notCondition(cond) : cond
  }

  if (row.kind === "eq") {
    return { [row.field]: parseScalar(v) }
  }

  if (row.kind === "ne") {
    return notCondition({ [row.field]: parseScalar(v) })
  }

  if (row.kind === "contains" || row.kind === "not_contains") {
    const cond = { [row.field]: { "$regex": escapeRegex(v), "$options": "i" } }
    return row.kind === "not_contains" ? notCondition(cond) : cond
  }

  if (row.kind === "prefix" || row.kind === "not_prefix") {
    const cond = { [row.field]: { "$regex": `^${escapeRegex(v)}`, "$options": "i" } }
    return row.kind === "not_prefix" ? notCondition(cond) : cond
  }

  return null
}

function normalizeCondition(row: FilterRow) {
  const cond = rowToCondition(row)
  if (!cond) return null
  return row.negate ? notCondition(cond) : cond
}

function combineConditions(current: any, next: any, join: LogicJoin) {
  if (join === "or") return orCondition(current, next)
  if (join === "nand") return nandCondition(current, next)
  if (join === "nor") return norCondition(current, next)
  if (join === "xor") return xorCondition(current, next)
  if (join === "xnor") return xnorCondition(current, next)
  return andCondition(current, next)
}

function buildGroupCondition(rows: FilterRow[]) {
  const conds: { cond: any; join: LogicJoin }[] = []

  rows.forEach((r, idx) => {
    const c = normalizeCondition(r)
    if (!c) return
    conds.push({ cond: c, join: idx === 0 ? "and" : (r.join || "and") })
  })

  if (!conds.length) return null

  let cur = conds[0].cond
  for (let i = 1; i < conds.length; i++) {
    cur = combineConditions(cur, conds[i].cond, conds[i].join)
  }

  return cur
}

function buildFilterQuery(groups: FilterGroup[]) {
  const conds: { cond: any; join: LogicJoin }[] = []

  groups.forEach((group, idx) => {
    const c = buildGroupCondition(group.rows || [])
    if (!c) return
    conds.push({ cond: c, join: idx === 0 ? "and" : (group.join || "and") })
  })

  if (!conds.length) return {}

  let cur = conds[0].cond
  for (let i = 1; i < conds.length; i++) {
    cur = combineConditions(cur, conds[i].cond, conds[i].join)
  }

  return cur
}

export default function SearchPage() {
  const initial = useMemo(initialSearchState, [])
  const skipInitialCollectionReset = useRef(true)
  const skipInitialFilterSync = useRef(true)
  const didAutoRun = useRef(false)

  const [collection, setCollection] = useState(initial.collection)
  const [limit, setLimit] = useState(initial.limit)
  const [timeRange, setTimeRange] = useState(initial.timeRange)

  const [filters, setFilters] = useState<FilterGroup[]>([])
  const [relatedFilter, setRelatedFilter] = useState<RelatedCollectionRule | null>(null)
  const [queryText, setQueryText] = useState(initial.queryText)
  const [relatedStatus, setRelatedStatus] = useState<string | null>(null)
  const [copyStatus, setCopyStatus] = useState<string | null>(null)

  const [results, setResults] = useState<any[]>([])
  const [openId, setOpenId] = useState<string | null>(null)
  const [nextAfter, setNextAfter] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [cursorHistory, setCursorHistory] = useState<(string | null)[]>([null])

  const { search, loading, error } = useSearchApi()
  const { fields } = useSearchSchema(collection)
  const { fields: relatedFields } = useSearchSchema(relatedFilter?.collection || "detections")
  const columns = buildColumns(results)
  const hasMessageColumn = results.some(row => !isEmptyValue(extractMessage(row)))
  const tableColSpan = columns.length + 2 + (hasMessageColumn ? 1 : 0)

  useEffect(() => {
    if (skipInitialCollectionReset.current) {
      skipInitialCollectionReset.current = false
      return
    }

    setFilters([])
    setRelatedFilter(null)
    setRelatedStatus(null)
    setCopyStatus(null)
    setQueryText("{}")
    setResults([])
    setNextAfter(null)
    setPage(1)
    setCursorHistory([null])
    setOpenId(null)
  }, [collection])

  useEffect(() => {
    if (skipInitialFilterSync.current) {
      skipInitialFilterSync.current = false
      return
    }

    const q = buildFilterQuery(filters)
    setQueryText(JSON.stringify(q, null, 2))
    setCopyStatus(null)
  }, [filters])

  async function buildCurrentApiUrl() {
    let q: Record<string, any>
    try {
      q = JSON.parse(queryText || "{}")
    } catch (e: any) {
      throw new Error("Invalid JSON query: " + e.message)
    }

    const range = computeRange(timeRange)
    let finalQuery = q

    if (relatedFilter && relatedFilter.localField.trim() && relatedFilter.foreignField.trim()) {
      const relatedQuery = buildFilterQuery(relatedFilter.filters)
      const relatedResp = await search(
        relatedFilter.collection,
        relatedQuery,
        Math.max(1, relatedFilter.limit || 500),
        null,
        range.from,
        range.to,
        null,
        null,
        null,
        null,
        null
      )

      const relatedValues = uniqueRelatedValues(relatedResp.results || [], relatedFilter.foreignField.trim())
      finalQuery = combineWithRelatedQuery(
        finalQuery,
        { ...relatedFilter, localField: relatedFilter.localField.trim(), foreignField: relatedFilter.foreignField.trim() },
        relatedValues
      )
    }

    return buildSearchUrl(collection, finalQuery, limit, range.from, range.to, null)
  }

  async function copyQueryUrl() {
    try {
      setCopyStatus(null)
      const url = await buildCurrentApiUrl()
      await copyText(url)
      setCopyStatus("Copied API URL. Add your Authorization token when using it externally.")
    } catch (e: any) {
      setCopyStatus(e.message || "Could not copy query URL")
    }
  }

  async function runSearch(cursor: string | null) {
    let q: Record<string, any>
    try {
      q = JSON.parse(queryText || "{}")
    } catch (e: any) {
      alert("Invalid JSON query: " + e.message)
      return false
    }

    const range = computeRange(timeRange)
    let finalQuery = q
    setRelatedStatus(null)

    if (relatedFilter && relatedFilter.localField.trim() && relatedFilter.foreignField.trim()) {
      const relatedQuery = buildFilterQuery(relatedFilter.filters)
      const relatedResp = await search(
        relatedFilter.collection,
        relatedQuery,
        Math.max(1, relatedFilter.limit || 500),
        null,
        range.from,
        range.to,
        null,
        null,
        null,
        null,
        null
      )

      const relatedValues = uniqueRelatedValues(relatedResp.results || [], relatedFilter.foreignField.trim())
      setRelatedStatus(`${relatedFilter.collection}: ${relatedValues.length} matching ${relatedFilter.foreignField} value${relatedValues.length === 1 ? "" : "s"}`)

      if (!relatedValues.length && relatedFilter.relation === "in") {
        setResults([])
        setNextAfter(null)
        setOpenId(null)
        return true
      }

      finalQuery = combineWithRelatedQuery(finalQuery, { ...relatedFilter, localField: relatedFilter.localField.trim(), foreignField: relatedFilter.foreignField.trim() }, relatedValues)
    }

    const resp = await search(
      collection,
      finalQuery,
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
    return true
  }

  async function resetSearch() {
    const ok = await runSearch(null)
    if (!ok) return
    setCursorHistory([null])
    setPage(1)
  }

  async function previousPage() {
    if (page <= 1 || loading) return
    const targetPage = page - 1
    const cursor = cursorHistory[targetPage - 1] || null
    const ok = await runSearch(cursor)
    if (!ok) return
    setPage(targetPage)
  }

  async function nextPage() {
    if (!nextAfter || loading) return
    const cursor = nextAfter
    const ok = await runSearch(cursor)
    if (!ok) return
    setCursorHistory(prev => {
      const next = prev.slice(0, page)
      next[page] = cursor
      return next
    })
    setPage(p => p + 1)
  }

  useEffect(() => {
    if (!initial.autoRun || didAutoRun.current) return
    didAutoRun.current = true
    void resetSearch()
  }, [initial.autoRun])


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
              <option value="parse_results">parse_results</option>
              <option value="audit_log">audit_log</option>
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

          <button className="search-button copy-query-button" onClick={copyQueryUrl} disabled={loading}>
            Copy Query URL
          </button>
        </div>

        {copyStatus && <div className="copy-query-status">{copyStatus}</div>}

        <div style={{ marginTop: 8 }}>
          <FilterBuilder fields={fields} value={filters} onChange={setFilters} />
        </div>

        <div className="related-section">
          <RelatedCollectionBuilder
            value={relatedFilter}
            onChange={setRelatedFilter}
            relatedFields={relatedFields}
          />
          {relatedStatus && <div className="related-status">{relatedStatus}</div>}
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
          <div>
            <div className="results-title">Page {page} ({results.length})</div>
            <div className="results-hint">Empty cells are shown as —. Open a row to inspect the full document.</div>
          </div>
          <div className="pagination-controls">
            <button onClick={previousPage} disabled={page <= 1 || loading} className="page-btn">← Back</button>
            <button onClick={nextPage} disabled={!nextAfter || loading} className="page-btn">Next →</button>
          </div>
        </div>

        <div className="results-table-wrap">
          <table className="results-table">
            <thead>
              <tr>
                <th className="col-id">ID</th>
                {hasMessageColumn && <th className="col-message">Message</th>}
                {columns.map(c => <th key={c}>{c}</th>)}
                <th className="col-action"></th>
              </tr>
            </thead>
            <tbody>
              {!results.length && (
                <tr>
                  <td className="empty" colSpan={tableColSpan}>No results yet.</td>
                </tr>
              )}

              {results.map(row => {
                const id = String(row._id)
                const isOpen = openId === id
                const message = extractMessage(row)

                return (
                  <React.Fragment key={id}>
                    <tr className="row">
                      <td className="mono col-id" title={id}><span className="id-pill">{shortId(id)}</span></td>
                      {hasMessageColumn && <td className={`message-cell ${cellClass(message)}`} title={preview(message, 600)}>{cellText(message, 180)}</td>}
                      {columns.map(c => (
                        <td key={c} className={cellClass(row[c])} title={preview(row[c], 600)}>
                          {cellText(row[c], 100)}
                        </td>
                      ))}
                      <td className="col-action">
                        <button className="link-button" onClick={() => setOpenId(isOpen ? null : id)}>
                          {isOpen ? "Hide" : "View"}
                        </button>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr className="details-row">
                        <td colSpan={tableColSpan}>
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
