import { useState } from "react"
import type { Card } from "./types"

type Props = {
	card: Card
}

function isPythonReCompatible(p: string): string | null {
	// Reject variable-width look-behind for Python re
	if (/\(\?<([=!]).*?[+*]/.test(p)) {
		return "Variable-width look-behind is not supported in Python re"
	}
	return null
}

export function CardTester({ card }: Props) {
	const [rawText, setRawText] = useState("")

	const getMatches = () => {
		if (!rawText.trim()) return { ok: false, message: "" }

		let data: any
		try {
			data = JSON.parse(rawText)
			const field = card.selector?.type?.trim()
			const expected = card.selector?.value?.trim()

			if (!field || !expected) {
				return { ok: false, message: "Selector not set" }
			}

			const actual = data?.[field]

			if (actual === undefined) {
				return { ok: false, message: `Field '${field}' not found` }
			}

			if (String(actual) !== expected) {
				return { ok: false, message: "Selector not matched" }
			}
		} catch {
			return { ok: false, message: "Invalid JSON" }
		}

		const results: Record<string, any> = {}

		const target =
			typeof data?.raw_log === "string"
				? data.raw_log
				: rawText

		// ---- Regex testing ----
		card.regex?.forEach(obj => {
			const [k, p] = Object.entries(obj)[0]

			const compatErr = isPythonReCompatible(p)
			if (compatErr) {
				results[k] = [`<invalid for python re: ${compatErr}>`]
				return
			}

			try {
				const re = new RegExp(p, "gm")
				const matches: string[] = []
				let m: RegExpExecArray | null
				let guard = 0
				let captured = false

				while ((m = re.exec(target)) !== null) {
					if (guard++ > 1000) break

					// Prevent infinite loop
					if (m[0] === "") {
						re.lastIndex++
						continue
					}

					// If there is a capture group, take ONLY the first and stop
					if (m.length > 1) {
						matches.push(m[1])
						captured = true
						break
					}

					// Otherwise collect all full matches (IPs, etc.)
					matches.push(m[0])
				}

				results[k] = matches
			} catch {
				results[k] = ["<invalid regex>"]
			}
		})

		// ---- JSONPath-like testing ----
		card.jsonp?.forEach(obj => {
			const [k, path] = Object.entries(obj)[0]
			let val: any = data
			path
				.replace(/^\$\.?/, "")
				.split(".")
				.filter(Boolean)
				.forEach(p => {
					val = val?.[p]
				})
			results[k] = val !== undefined ? [val] : []
		})

		return { ok: true, message: "Selector matched", results }
	}

	const matchState = getMatches()

	return (
		<div className="cardset-panel">
			<h2>Test Input</h2>

			<textarea
				className="cardset-input"
				style={{ height: "200px" }}
				value={rawText}
				onChange={e => setRawText(e.target.value)}
				placeholder="Paste raw JSON here..."
			/>

			<div
				className={`cardset-status ${
					matchState.ok ? "ok" : "err"
				}`}
			>
				<span>{matchState.ok ? "✔" : "✖"}</span>
				<span>
					{matchState.ok
						? "Selector matched"
						: matchState.message || "Selector not matched"}
				</span>
			</div>

			<h3>Matches</h3>

			<textarea
				readOnly
				className="cardset-input"
				style={{ height: "220px" }}
				value={
					matchState.ok
						? JSON.stringify(matchState.results, null, 2)
						: ""
				}
			/>
		</div>
	)
}
