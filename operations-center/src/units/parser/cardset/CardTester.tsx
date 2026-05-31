import { useMemo, useState } from "react"
import type { Card, Selector } from "./types"

type Props = {
	card: Card
}

const pathSelectorTypes = new Set(["path", "field", "json", "jsonpath"])

function selectorList(value: Selector["not"] | Selector["and_not"]): Selector[] {
	if (!value) return []
	return Array.isArray(value) ? value : [value]
}

function selectorNeedsValue(selector: Selector) {
	return selector.match !== "exists" && selector.match !== "not_exists"
}

function parsePath(path: string) {
	return path
		.replace(/^\$\.?/, "")
		.replace(/\[['\"]?([^'\"\]]+)['\"]?\]/g, ".$1")
		.split(".")
		.map(p => p.trim())
		.filter(Boolean)
}

function getPathValue(data: any, path?: string) {
	if (!path) return undefined
	let cur = data
	for (const part of parsePath(path)) {
		if (Array.isArray(cur) && part === "*") {
			cur = cur.flatMap(item => (item === undefined || item === null ? [] : [item]))
			continue
		}
		if (Array.isArray(cur) && /^\d+$/.test(part)) {
			cur = cur[Number(part)]
			continue
		}
		if (cur && typeof cur === "object") {
			cur = cur[part]
		} else {
			return undefined
		}
	}
	return cur
}

function valueText(value: unknown) {
	if (value === undefined || value === null) return ""
	if (typeof value === "string") return value
	return JSON.stringify(value)
}

function pathMatches(selector: Selector, parsed: any) {
	const actual = getPathValue(parsed, selector.path || selector.field)
	const actualText = valueText(actual)
	const expected = selector.value || ""
	const match = selector.match || "exact"

	if (match === "exists") {
		return actual !== undefined
			? { ok: true, message: "field exists" }
			: { ok: false, message: "field does not exist" }
	}

	if (match === "not_exists") {
		return actual === undefined
			? { ok: true, message: "field does not exist" }
			: { ok: false, message: "field exists" }
	}

	if (!selectorNeedsValue(selector)) return { ok: true, message: "field condition matched" }

	if (match === "exact") {
		return actualText === expected
			? { ok: true, message: "field matched exactly" }
			: { ok: false, message: `field was ${actualText || "empty"}` }
	}

	if (match === "regex") {
		try {
			const re = new RegExp(expected)
			return re.test(actualText)
				? { ok: true, message: "field matched regex" }
				: { ok: false, message: "field did not match regex" }
		} catch (e: any) {
			return { ok: false, message: `Invalid field regex: ${e.message}` }
		}
	}

	return actualText.includes(expected)
		? { ok: true, message: "field contains value" }
		: { ok: false, message: "field does not contain value" }
}

function positiveSelectorMatches(selector: Selector, raw: string, parsed: any) {
	if (!selector?.type) return { ok: false, message: "Selector not set" }

	if (pathSelectorTypes.has(selector.type)) {
		if (!parsed || typeof parsed !== "object") return { ok: false, message: "Field matching requires event JSON" }
		if (!selector.path && !selector.field) return { ok: false, message: "Field is not set" }
		return pathMatches(selector, parsed)
	}

	if (!selector.value) return { ok: false, message: "Selector value not set" }

	if (selector.type === "raw") {
		return raw.includes(selector.value)
			? { ok: true, message: "raw contains value" }
			: { ok: false, message: "raw does not contain value" }
	}

	if (selector.type === "raw_regex") {
		try {
			const re = new RegExp(selector.value)
			return re.test(raw)
				? { ok: true, message: "raw regex matched" }
				: { ok: false, message: "raw regex did not match" }
		} catch (e: any) {
			return { ok: false, message: `Invalid selector regex: ${e.message}` }
		}
	}

	if (selector.type === "source_address") {
		const actual = parsed?.source?.address ?? parsed?.source_address ?? parsed?.src_ip
		return actual && String(actual) === selector.value
			? { ok: true, message: "source IP matched" }
			: { ok: false, message: "source IP did not match" }
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
				message: `Excluded by rule: ${negative.type}`,
			}
		}
	}

	return positive
}

export function CardTester({ card }: Props) {
	const [input, setInput] = useState("")

	const matchState = useMemo(() => {
		if (!input.trim()) return { ok: false, message: "Paste a sample event to test this card.", results: {} }

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
			const [key, pattern] = Object.entries(obj)[0] || ["", ""]
			if (!key || !pattern) return
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
			const [key, path] = Object.entries(obj)[0] || ["", ""]
			if (!key || !path) return
			const val = getPathValue(parsed, path)
			if (val !== undefined) results[key] = Array.isArray(val) ? val : [val]
		})

		return { ok: true, message: selectorState.message, results }
	}, [input, card])

	return (
		<div className="cardset-tester">
			<div className="cardset-tester-head">
				<div>
					<p className="cardset-eyebrow">Test</p>
					<h3>Try a sample event</h3>
				</div>
				<span className={`cardset-dot ${matchState.ok ? "ok" : "idle"}`} />
			</div>

			<textarea
				className="cardset-input cardset-test-input"
				value={input}
				onChange={e => setInput(e.target.value)}
				placeholder="Paste event JSON or a raw log line"
			/>

			<div className={`cardset-status ${matchState.ok ? "ok" : "err"}`}>
				<span>{matchState.ok ? "Matched" : "Not matched"}</span>
				<small>{matchState.message}</small>
			</div>

			<textarea
				readOnly
				className="cardset-input cardset-results-output"
				value={matchState.ok ? JSON.stringify(matchState.results, null, 2) : ""}
				placeholder="Extracted fields appear here after the selector matches."
			/>
		</div>
	)
}
