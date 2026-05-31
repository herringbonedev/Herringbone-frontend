export function parseEventTimestamp(ts?: string | number | null): Date | null {
	if (ts === null || ts === undefined || ts === "") return null
	if (typeof ts === "number") {
		const date = new Date(ts)
		return Number.isNaN(date.getTime()) ? null : date
	}

	let value = String(ts).trim()
	if (!value) return null

	// Mongo/Python often sends UTC timestamps without a timezone suffix:
	// 2026-05-29T08:59:41.811000. Treat those as UTC, then render in browser-local time.
	value = value.replace(" ", "T")
	value = value.replace(/\.(\d{3})\d+/, ".$1")

	const hasTimezone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value)
	if (!hasTimezone) value = `${value}Z`

	const date = new Date(value)
	return Number.isNaN(date.getTime()) ? null : date
}

export function formatLocalDateTime(ts?: string | number | null) {
	const date = parseEventTimestamp(ts)
	if (!date) return "—"
	return new Intl.DateTimeFormat(undefined, {
		year: "numeric",
		month: "short",
		day: "2-digit",
		hour: "numeric",
		minute: "2-digit",
		second: "2-digit",
		timeZoneName: "short",
	}).format(date)
}

export function eventTimestampMs(...values: Array<string | number | null | undefined>) {
	for (const value of values) {
		const date = parseEventTimestamp(value)
		if (date) return date.getTime()
	}
	return 0
}
