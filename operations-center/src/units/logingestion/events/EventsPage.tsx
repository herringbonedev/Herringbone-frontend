import { useEventsApi } from "./useEventsApi"
import { LogTable } from "./LogTable"

export default function EventsPage() {
	const { logs, loading, error, reload } = useEventsApi()

	return (
		<div style={{ padding: "1rem" }}>
			<h2>Log Ingestion Events</h2>

			<div style={{ marginBottom: "0.5rem" }}>
				<button onClick={reload}>Reload</button>
			</div>

			{loading && <div>Loading…</div>}
			{error && <div style={{ color: "var(--red)" }}>{error}</div>}

			{!loading && logs.length > 0 && (
				<LogTable logs={logs} />
			)}

			{!loading && logs.length === 0 && (
				<div>No events found.</div>
			)}
		</div>
	)
}
