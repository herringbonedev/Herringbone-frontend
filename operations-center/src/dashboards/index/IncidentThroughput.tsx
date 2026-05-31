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
	ts: string | number
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

function parseTs(ts: string | number): number {
	if (typeof ts === "number") return ts
	if (/^\d{4}-\d{2}-\d{2}$/.test(ts)) return Date.parse(`${ts}T00:00:00Z`)
	return Date.parse(ts)
}

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
	return tz === "utc" ? new Date(Date.UTC(y, qMonth, 1)) : new Date(y, qMonth, 1)
}

function startOfYear(d: Date, tz: TZMode) {
	const y = tz === "utc" ? d.getUTCFullYear() : d.getFullYear()
	return tz === "utc" ? new Date(Date.UTC(y, 0, 1)) : new Date(y, 0, 1)
}

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
	if (range === "week") return 16
	if (range === "month") return 8
	if (range === "quarter") return 6
	return 10
}

function tickIntervalFor(range: Range, count: number) {
	if (range === "week") return 0
	if (range === "month") return Math.max(0, Math.floor(count / 10))
	if (range === "quarter") return Math.max(0, Math.floor(count / 8))
	return Math.max(0, Math.floor(count / 12))
}

function TooltipBox({ active, payload, label }: any) {
	if (!active || !payload?.length) return null

	const open = payload.find((p: any) => p.dataKey === "open")?.value ?? 0
	const resolved = payload.find((p: any) => p.dataKey === "resolved")?.value ?? 0

	return (
		<div className="home-chart-tooltip">
			<strong>{label}</strong>
			<span className="open">Open: {open}</span>
			<span className="resolved">Resolved: {resolved}</span>
		</div>
	)
}

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
			buckets.push({ label: label(new Date(ts)), open: 0, resolved: 0 })
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
		<div className="home-throughput">
			<div className="home-chart-controls">
				<div className="home-segmented" aria-label="Throughput range">
					{(["week", "month", "quarter", "year"] as Range[]).map(r => (
						<button key={r} className={range === r ? "active" : ""} onClick={() => setRange(r)}>{r}</button>
					))}
				</div>
				<div className="home-segmented compact" aria-label="Timezone">
					{(["local", "utc"] as TZMode[]).map(tz => (
						<button key={tz} className={tzMode === tz ? "active" : ""} onClick={() => setTzMode(tz)}>{tz.toUpperCase()}</button>
					))}
				</div>
			</div>

			<div className="home-chart-wrap">
				<ResponsiveContainer>
					<BarChart data={rows} barCategoryGap="35%" margin={{ left: 4, right: 8, bottom: 8 }}>
						<CartesianGrid stroke="rgba(148, 163, 184, 0.14)" strokeDasharray="3 3" />
						<XAxis dataKey="label" interval={tickInterval} minTickGap={10} tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={{ stroke: "rgba(148, 163, 184, 0.28)" }} tickLine={false} />
						<YAxis allowDecimals={false} tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={{ stroke: "rgba(148, 163, 184, 0.28)" }} tickLine={false} />
						<Tooltip content={<TooltipBox />} />
						<Bar dataKey="open" fill="#fb7185" barSize={barSize} radius={[4, 4, 0, 0]} />
						<Bar dataKey="resolved" fill="#34d399" barSize={barSize} radius={[4, 4, 0, 0]} />
					</BarChart>
				</ResponsiveContainer>
			</div>
		</div>
	)
}
