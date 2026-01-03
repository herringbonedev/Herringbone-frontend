import {
	ResponsiveContainer,
	LineChart,
	Line,
	XAxis,
	YAxis,
	Tooltip,
} from "recharts"

type Point = {
	ts: string
	open: number
	resolved: number
}

export function IncidentThroughput(props: { data: Point[] }) {
	return (
		<div className="panel">
			<h3>Incident Throughput</h3>
			<div style={{ width: "100%", height: 240 }}>
				<ResponsiveContainer>
					<LineChart data={props.data}>
						<XAxis dataKey="ts" />
						<YAxis allowDecimals={false} />
						<Tooltip />
						<Line
							type="monotone"
							dataKey="open"
							stroke="#dc2626"
							strokeWidth={2}
							dot={false}
						/>
						<Line
							type="monotone"
							dataKey="resolved"
							stroke="#16a34a"
							strokeWidth={2}
							dot={false}
						/>
					</LineChart>
				</ResponsiveContainer>
			</div>
		</div>
	)
}
