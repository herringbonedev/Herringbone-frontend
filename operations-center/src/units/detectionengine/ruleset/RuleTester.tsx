import { useState } from "react"

type Props = {
	rule: any | null
}

function resolvePath(obj: any, path: string) {
	return path.split(".").reduce((acc, p) => {
		if (!acc || typeof acc !== "object") return undefined
		return acc[p]
	}, obj)
}

export function RuleTester({ rule }: Props) {
	const [input, setInput] = useState("")
	const [result, setResult] = useState<string[]>([])

	const test = () => {
		if (!rule || !rule.rule?.key) return

		let data: any
		try {
			data = JSON.parse(input)
		} catch {
			setResult(["Invalid JSON"])
			return
		}

		const findings: string[] = []

		const keyValue = resolvePath(data, rule.rule.key)
		if (keyValue === undefined) {
			findings.push(`Missing rule key: ${rule.rule.key}`)
		} else if (rule.rule.regex) {
			const r = new RegExp(rule.rule.regex)
			const values = Array.isArray(keyValue) ? keyValue : [keyValue]
			if (!values.some(v => r.test(String(v)))) {
				findings.push("Regex did not match")
			}
		}

		if (Array.isArray(rule.correlate_on)) {
			for (const field of rule.correlate_on) {
				const v = resolvePath(data, field)
				if (v === undefined || (Array.isArray(v) && v.length === 0)) {
					findings.push(`Missing correlate field: ${field}`)
				}
			}
		}

		if (findings.length === 0) {
			findings.push("Rule and correlation fields satisfied")
		}

		setResult(findings)
	}

	return (
		<div>
			<h3>Rule Tester</h3>

			<textarea
				className="ruleset-input"
				style={{ height: "140px" }}
				placeholder="Paste event JSON here"
				value={input}
				onChange={e => setInput(e.target.value)}
			/>

			<button className="ruleset-btn secondary" onClick={test}>
				Test Rule
			</button>

			<div style={{ marginTop: "0.5rem", fontSize: "0.85rem" }}>
				{result.map((r, i) => (
					<div key={i}>{r}</div>
				))}
			</div>
		</div>
	)
}
