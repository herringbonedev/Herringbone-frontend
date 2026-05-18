import { useState } from "react"
import type { Card, Selector } from "./types"

type Props = {
	card: Card
}

function selectorList(value: Selector["not"] | Selector["and_not"]): Selector[] {
	if (!value) return []
	return Array.isArray(value) ? value : [value]
}

function positiveSelectorMatches(selector: Selector, raw: string, parsed: any) {
	if (!selector?.type || !selector?.value) {
		return { ok: false, message: "Selector not set" }
	}

	if (selector.type === "raw") {
		return raw.includes(selector.value)
			? { ok: true, message: "raw contains value" }
			: { ok: false, message: "raw does not contain value" }
	}

	if (selector.type === "raw_regex") {
		try {
			const re = new RegExp(selector.value)
			return re.test(raw)
				? { ok: true, message: "raw_regex matched" }
				: { ok: false, message: "raw_regex did not match" }
		} catch (e: any) {
			return { ok: false, message: `Invalid selector regex: ${e.message}` }
		}
	}

	if (selector.type === "source_address") {
		const actual =
			parsed?.source?.address ??
			parsed?.source_address ??
			parsed?.src_ip

		return actual && String(actual) === selector.value
			? { ok: true, message: "source_address matched" }
			: { ok: false, message: "source_address not matched" }
	}

	return { ok: false, message: "Unknown selector type" }
}

function selectorMatches(selector: Selector, raw: string, parsed: any) {
	const positive = positiveSelectorMatches(selector, raw, parsed)
	if (!positive.ok) return positive

	const negativeRules = [
		...selectorList(selector.not),
		...selectorList(selector.and_not),
	]

	for (const negative of negativeRules) {
		const neg = positiveSelectorMatches(negative, raw, parsed)
		if (neg.ok) {
			return {
				ok: false,
				message: `Excluded by AND NOT: ${negative.type}=${negative.value}`,
			}
		}
	}

	return positive
}

export function CardTester({ card }: Props) {
	const [input, setInput] = useState("")

	const getMatches = () => {
		if (!input.trim()) return { ok: false, message: "", results: {} }

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

		const selectorState = selectorMatches(card.selector, raw, parsed)
		if (!selectorState.ok) {
			return { ok: false, message: selectorState.message, results: {} }
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

		return { ok: true, message: selectorState.message, results }
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
						? `Selector matched (${matchState.message})`
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
