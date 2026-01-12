import { useState } from "react"
import { useSearchApi } from "./useSearchApi"
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
  return (
    row.raw ||
    row.message ||
    row.description ||
    row?.parsed?.command ||
    row?.parsed?.message ||
    ""
  )
}

function buildColumns(rows: any[]) {
  if (!rows.length) return []

  const priority = [
    "severity",
    "event_time",
    "ingested_at",
    "created_at",
    "source.ip",
    "source.host",
  ]

  const fields = new Set<string>()

  rows.forEach(r => {
    Object.keys(r).forEach(k => {
      const v = r[k]
      if (
        typeof v === "string" ||
        typeof v === "number" ||
        typeof v === "boolean"
      ) {
        fields.add(k)
      }
    })
  })

  const ordered: string[] = []

  for (const p of priority) {
    if (fields.has(p)) ordered.push(p)
  }

  for (const f of fields) {
    if (!ordered.includes(f) && f !== "_id") ordered.push(f)
  }

  return ordered.slice(0, 6) // limit width
}

export default function SearchPage() {
  const [collection, setCollection] = useState("events")
  const [queryText, setQueryText] = useState("{}")
  const [limit, setLimit] = useState(100)

  const [results, setResults] = useState<any[]>([])
  const [openId, setOpenId] = useState<string | null>(null)

  const [nextAfter, setNextAfter] = useState<string | null>(null)
  const [page, setPage] = useState(1)

  const { search, loading, error } = useSearchApi()

  const columns = buildColumns(results)

  async function runSearch(cursor: string | null, reset: boolean) {
    let queryObj: Record<string, any>
    try {
      queryObj = JSON.parse(queryText || "{}")
    } catch (e: any) {
      alert("Invalid JSON query: " + e.message)
      return
    }

    const resp = await search(collection, queryObj, limit, cursor)

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
            <select
              value={collection}
              onChange={e => setCollection(e.target.value)}
              className="search-select"
            >
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
            <span>Limit</span>
            <input
              className="search-input"
              value={String(limit)}
              onChange={e => {
                const n = parseInt(e.target.value || "0", 10)
                setLimit(Number.isFinite(n) ? n : 100)
              }}
            />
          </label>

          <button
            className="search-button"
            onClick={resetSearch}
            disabled={loading}
          >
            {loading ? "Searching…" : "Search"}
          </button>
        </div>

        <div className="search-query">
          <div className="search-query-label">Query (JSON)</div>
          <textarea
            className="search-textarea"
            value={queryText}
            onChange={e => setQueryText(e.target.value)}
            spellCheck={false}
          />
        </div>

        {error && <div className="search-error">{error}</div>}
      </div>

      <div className="search-results">
        <div className="results-header">
          <div className="results-title">
            Page {page} ({results.length} results)
          </div>

          <div className="pagination-controls">
            <button
              onClick={nextPage}
              disabled={!nextAfter || loading}
              className="page-btn"
            >
              Next →
            </button>
          </div>
        </div>

        <div className="results-table-wrap">
          <table className="results-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Message</th>
                {columns.map(c => (
                  <th key={c}>{c}</th>
                ))}
                <th></th>
              </tr>
            </thead>

            <tbody>
              {results.map(row => {
                const id = String(row._id)
                const isOpen = openId === id

                return (
                  <>
                    <tr key={id}>
                      <td className="mono">{shortId(id)}</td>
                      <td>{preview(extractMessage(row))}</td>

                      {columns.map(c => (
                        <td key={c}>{preview(row[c])}</td>
                      ))}

                      <td>
                        <button
                          className="link-button"
                          onClick={() =>
                            setOpenId(isOpen ? null : id)
                          }
                        >
                          {isOpen ? "Hide" : "View"}
                        </button>
                      </td>
                    </tr>

                    {isOpen && (
                      <tr>
                        <td colSpan={columns.length + 3}>
                          <pre className="json-viewer">
{JSON.stringify(row, null, 2)}
                          </pre>
                        </td>
                      </tr>
                    )}
                  </>
                )
              })}

              {results.length === 0 && !loading && (
                <tr>
                  <td colSpan={columns.length + 3} className="empty">
                    No results
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
