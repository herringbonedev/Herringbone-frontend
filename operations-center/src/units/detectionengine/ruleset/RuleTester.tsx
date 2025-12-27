import { useEffect, useState } from "react"

type Props = {
	rule: any | null
}

export function RuleTester({ rule }: Props) {
	const [text, setText] = useState("")
	const [result, setResult] = useState<string | null>(null)

	const runTest = () => {
		if (!rule?.rule?.regex || !rule?.rule?.key) {
			setResult("Rule incomplete")
			return
		}

		try {
			const re = new RegExp(rule.rule.regex)
			const hit = re.test(text)
			setResult(hit ? "Matched" : "Not matched")
		} catch {
			setResult("Invalid regex")
		}
	}

	// Auto-run when rule or input changes
	useEffect(() => {
		if (text.trim()) {
			runTest()
		}
	}, [rule, text])

	return (
		<div className="ruleset-panel">
			<h2>Test Rule</h2>

			<textarea
				className="ruleset-input"
				style={{ height: "200px" }}
				value={text}
				onChange={e => setText(e.target.value)}
				placeholder="Paste raw log here..."
			/>

			{result && (
				<div
					className={`ruleset-status ${
						result === "Matched" ? "ok" : "err"
					}`}
				>
					{result}
				</div>
			)}
		</div>
	)
}
