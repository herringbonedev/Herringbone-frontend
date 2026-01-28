import { useMemo, useState } from "react"
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts"

type Point = {
  ts: string | number   // <-- string or number now
  open?: number
  resolved?: number
}

type Range = "week" | "month" | "quarter" | "year"
type TZMode = "local" | "utc"

type BucketRow = {
  label: string
  open: number
  resolved: number
}

const MS_HOUR = 60 * 60 * 1000
const MS_DAY = 24 * MS_HOUR
const MS_WEEK = 7 * MS_DAY

/* ---------------- Timestamp parsing ---------------- */

function parseTs(ts: string | number): number {
  if (typeof ts === "number") return ts

  // Handle YYYY-MM-DD safely as UTC midnight
  if (/^\d{4}-\d{2}-\d{2}$/.test(ts)) {
    return Date.parse(ts + "T00:00:00Z")
  }

  return Date.parse(ts)
}

/* ---------------- Time helpers ---------------- */

function startOfDay(d: Date, tz: TZMode) {
  if (tz === "utc") return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function startOfWeekMonday(d: Date, tz: TZMode) {
  const x = startOfDay(d, tz)
  const day = tz === "utc" ? x.getUTCDay() || 7 : x.getDay() || 7
  x.setDate(x.getDate() - day + 1)
  return x
}

function startOfMonth(d: Date, tz: TZMode) {
  if (tz === "utc") return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1))
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

function startOfQuarter(d: Date, tz: TZMode) {
  const m = tz === "utc" ? d.getUTCMonth() : d.getMonth()
  const y = tz === "utc" ? d.getUTCFullYear() : d.getFullYear()
  const qMonth = Math.floor(m / 3) * 3
  return tz === "utc"
    ? new Date(Date.UTC(y, qMonth, 1))
    : new Date(y, qMonth, 1)
}

function startOfYear(d: Date, tz: TZMode) {
  const y = tz === "utc" ? d.getUTCFullYear() : d.getFullYear()
  return tz === "utc" ? new Date(Date.UTC(y, 0, 1)) : new Date(y, 0, 1)
}

/* ---------------- Grafana bucket model ---------------- */

function bucketConfig(range: Range, tz: TZMode) {
  switch (range) {
    case "week":
      return { sizeMs: MS_DAY, label: (d: Date) => d.toLocaleDateString([], { weekday: "short", timeZone: tz === "utc" ? "UTC" : undefined }) }
    case "month":
      return { sizeMs: MS_DAY, label: (d: Date) => String(tz === "utc" ? d.getUTCDate() : d.getDate()) }
    case "quarter":
      return { sizeMs: MS_WEEK, label: (d: Date) => d.toLocaleDateString([], { month: "short", day: "numeric", timeZone: tz === "utc" ? "UTC" : undefined }) }
    case "year":
      return { sizeMs: 30 * MS_DAY, label: (d: Date) => d.toLocaleDateString([], { month: "short", timeZone: tz === "utc" ? "UTC" : undefined }) }
  }
}

function rangeStart(now: Date, range: Range, tz: TZMode) {
  if (range === "week") return startOfWeekMonday(now, tz)
  if (range === "month") return startOfMonth(now, tz)
  if (range === "quarter") return startOfQuarter(now, tz)
  return startOfYear(now, tz)
}

function barSizeFor(range: Range) {
  switch (range) {
    case "week": return 16
    case "month": return 8
    case "quarter": return 6
    case "year": return 10
  }
}

function tickIntervalFor(range: Range, count: number) {
  if (range === "week") return 0
  if (range === "month") return Math.max(0, Math.floor(count / 10))
  if (range === "quarter") return Math.max(0, Math.floor(count / 8))
  return Math.max(0, Math.floor(count / 12))
}

/* ---------------- Tooltip ---------------- */

function TooltipBox({ active, payload, label }: any) {
  if (!active || !payload?.length) return null

  const open = payload.find((p: any) => p.dataKey === "open")?.value ?? 0
  const resolved = payload.find((p: any) => p.dataKey === "resolved")?.value ?? 0

  return (
    <div style={{
      background: "#0f172a",
      border: "1px solid #334155",
      borderRadius: 6,
      padding: "8px 10px",
      color: "#e5e7eb",
      fontSize: 12,
      boxShadow: "0 4px 12px rgba(0,0,0,0.45)",
      minWidth: 140,
    }}>
      <div style={{ color: "#93c5fd", marginBottom: 6 }}>{label}</div>
      <div style={{ color: "#f87171" }}>Open: <strong>{open}</strong></div>
      <div style={{ color: "#4ade80" }}>Resolved: <strong>{resolved}</strong></div>
    </div>
  )
}

/* ---------------- Component ---------------- */

export function IncidentThroughput({ data }: { data: Point[] }) {
  const [range, setRange] = useState<Range>("week")
  const [tzMode, setTzMode] = useState<TZMode>("local")

  const rows = useMemo<BucketRow[]>(() => {
    const now = new Date()
    const start = rangeStart(now, range, tzMode)
    const { sizeMs, label } = bucketConfig(range, tzMode)

    const startTs = start.getTime()
    const endTs = now.getTime()
    const bucketCount = Math.floor((endTs - startTs) / sizeMs) + 1

    const buckets: BucketRow[] = []
    for (let i = 0; i < bucketCount; i++) {
      const ts = startTs + i * sizeMs
      buckets.push({
        label: label(new Date(ts)),
        open: 0,
        resolved: 0,
      })
    }

    for (const p of data || []) {
      const ts = parseTs(p.ts)
      if (!Number.isFinite(ts)) continue
      if (ts < startTs || ts > endTs) continue

      const idx = Math.floor((ts - startTs) / sizeMs)
      if (idx < 0 || idx >= buckets.length) continue

      buckets[idx].open += p.open ?? 0
      buckets[idx].resolved += p.resolved ?? 0
    }

    return buckets
  }, [data, range, tzMode])

  const barSize = barSizeFor(range)
  const tickInterval = tickIntervalFor(range, rows.length)

  return (
    <div className="panel">
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
        <h3>Incident Throughput</h3>

        <div style={{ display: "flex", gap: 6 }}>
          {(["week", "month", "quarter", "year"] as Range[]).map(r => (
            <button
              key={r}
              onClick={() => setRange(r)}
              style={{
                background: range === r ? "#2563eb" : "#1e293b",
                color: "#e5e7eb",
                border: "1px solid #334155",
                borderRadius: 4,
                padding: "2px 8px",
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              {r}
            </button>
          ))}

          <div style={{ width: 1, background: "#334155", margin: "0 4px" }} />

          {(["local", "utc"] as TZMode[]).map(tz => (
            <button
              key={tz}
              onClick={() => setTzMode(tz)}
              style={{
                background: tzMode === tz ? "#0ea5e9" : "#1e293b",
                color: "#e5e7eb",
                border: "1px solid #334155",
                borderRadius: 4,
                padding: "2px 8px",
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              {tz.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div style={{ width: "100%", height: 300 }}>
        <ResponsiveContainer>
          <BarChart data={rows} barCategoryGap="35%" margin={{ left: 12, right: 12, bottom: 8 }}>
            <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />

            <XAxis
              dataKey="label"
              interval={tickInterval}
              minTickGap={10}
              tick={{ fill: "#cbd5f5", fontSize: 11 }}
              axisLine={{ stroke: "#475569" }}
              tickLine={{ stroke: "#475569" }}
            />

            <YAxis
              allowDecimals={false}
              tick={{ fill: "#cbd5f5", fontSize: 11 }}
              axisLine={{ stroke: "#475569" }}
              tickLine={{ stroke: "#475569" }}
            />

            <Tooltip content={<TooltipBox />} />

            <Bar dataKey="open" fill="#dc2626" barSize={barSize} />
            <Bar dataKey="resolved" fill="#16a34a" barSize={barSize} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
