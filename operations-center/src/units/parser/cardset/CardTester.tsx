import { useState } from "react"
import type { Card } from "./types"

type Props = {
	card: Card
}

export function CardTester({ card }: Props) {
	const [input, setInput] = useState("")

	const getMatches = () => {
		if (!input.trim()) return { ok: false, message: "" }

		let parsed: any = null
		let raw = input

		try {
			parsed = JSON.parse(input)
			if (typeof parsed?.raw === "string") raw = parsed.raw
			if (typeof parsed?.raw_log === "string") raw = parsed.raw_log
		} catch {
			parsed = null
			raw = input
		}

		const selector = card.selector
		if (!selector?.type || !selector?.value) {
			return { ok: false, message: "Selector not set" }
		}

		if (selector.type === "raw") {
			if (!raw.includes(selector.value)) {
				return { ok: false, message: "Selector not matched" }
			}
		}

		if (selector.type === "source_address") {
			const actual =
				parsed?.source?.address ??
				parsed?.source_address ??
				parsed?.src_ip

			if (!actual || String(actual) !== selector.value) {
				return { ok: false, message: "Selector not matched" }
			}
		}

		const results: Record<string, unknown[]> = {}

		card.regex?.forEach(obj => {
			const [key, pattern] = Object.entries(obj)[0]
			try {
				const re = new RegExp(pattern, "gm")
				const matches: string[] = []
				let m: RegExpExecArray | null
				let guard = 0

				while ((m = re.exec(raw)) !== null) {
					if (guard++ > 1000) break
					if (m[0] === "") {
						re.lastIndex++
						continue
					}
					matches.push(m.length > 1 ? m[1] : m[0])
				}

				if (matches.length > 0) results[key] = matches
			} catch {
				results[key] = []
			}
		})

		card.jsonp?.forEach(obj => {
			const [key, path] = Object.entries(obj)[0]
			let val: any = parsed

			path
				.replace(/^\$\.?/, "")
				.split(".")
				.filter(Boolean)
				.forEach(p => {
					val = val?.[p]
				})

			if (val !== undefined) {
				results[key] = Array.isArray(val) ? val : [val]
			}
		})

		return { ok: true, message: "Selector matched", results }
	}

	const matchState = getMatches()

	return (
		<div className="cardset-tester">
			<h3>Test Input</h3>

			<textarea
				className="cardset-input"
				style={{ height: "140px" }}
				value={input}
				onChange={e => setInput(e.target.value)}
				placeholder="Paste event JSON or raw log"
			/>

			<div className={`cardset-status ${matchState.ok ? "ok" : "err"}`}>
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
				style={{ height: "160px" }}
				value={
					matchState.ok
						? JSON.stringify(matchState.results, null, 2)
						: ""
				}
			/>
		</div>
	)
}
