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
	const [ok, setOk] = useState<boolean | null>(null)

	const test = () => {
		if (!rule || !rule.rule?.key) {
			setResult(["Build or select a rule first."])
			setOk(false)
			return
		}

		let data: any
		try {
			data = JSON.parse(input)
		} catch {
			setResult(["Invalid JSON"])
			setOk(false)
			return
		}

		const findings: string[] = []

		const keyValue = resolvePath(data, rule.rule.key)
		if (keyValue === undefined) {
			findings.push(`Missing rule field: ${rule.rule.key}`)
		} else if (rule.rule.regex) {
			try {
				const r = new RegExp(rule.rule.regex)
				const values = Array.isArray(keyValue) ? keyValue : [keyValue]
				if (!values.some(v => r.test(String(v)))) {
					findings.push("Regex did not match")
				}
			} catch (e: any) {
				findings.push(e?.message || "Invalid regex")
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
			setOk(true)
		} else {
			setOk(false)
		}

		setResult(findings)
	}

	return (
		<section className="ruleset-tester">
			<div className="ruleset-tester-head">
				<div>
					<h3>Rule tester</h3>
					<p>Paste a normalized event and verify the rule condition.</p>
				</div>
				<button className="ruleset-btn secondary" onClick={test}>Test rule</button>
			</div>

			<textarea
				className="ruleset-input ruleset-test-input"
				placeholder="Paste event JSON here"
				value={input}
				onChange={e => setInput(e.target.value)}
			/>

			{result.length > 0 && (
				<div className={`ruleset-status ${ok ? "ok" : "err"}`}>
					<div className={`ruleset-dot ${ok ? "ok" : ""}`} />
					<div>
						{result.map((r, i) => <div key={i}>{r}</div>)}
					</div>
				</div>
			)}
		</section>
	)
}
