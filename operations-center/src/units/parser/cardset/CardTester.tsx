import { useState } from "react"
import type { Card, Selector } from "./types"

type Props = {
	card: Card
}

function selectorList(value: Selector["not"] | Selector["and_not"]): Selector[] {
	if (!value) return []
	return Array.isArray(value) ? value : [value]
}

function isPathSelector(type: Selector["type"]) {
	return type === "field" || type === "path" || type === "json" || type === "jsonpath"
}

function selectorPath(selector: Selector) {
	return selector.path || selector.field || ""
}

function tokenizeJsonPath(path: string): string[] {
	const normalized = path
		.trim()
		.replace(/^\$\.?/, "")
		.replace(/\[['\"]([^'\"]+)['\"]\]/g, ".$1")
		.replace(/\[(\d+)\]/g, ".$1")
		.replace(/\[\*\]/g, ".*")

	return normalized.split(".").filter(Boolean)
}

function readJsonPathValues(data: any, path: string): unknown[] {
	if (!path.trim()) return []
	const tokens = tokenizeJsonPath(path)
	let current: unknown[] = [data]

	for (const token of tokens) {
		const next: unknown[] = []

		for (const item of current) {
			if (token === "*") {
				if (Array.isArray(item)) next.push(...item)
				else if (item && typeof item === "object") next.push(...Object.values(item))
				continue
			}

			if (Array.isArray(item) && /^\d+$/.test(token)) {
				const value = item[Number(token)]
				if (value !== undefined) next.push(value)
				continue
			}

			if (item && typeof item === "object") {
				const value = (item as Record<string, unknown>)[token]
				if (value !== undefined) next.push(value)
			}
		}

		current = next
		if (current.length === 0) break
	}

	return current
}

function valueToText(value: unknown): string {
	if (value === null || value === undefined) return ""
	if (typeof value === "string") return value
	if (typeof value === "number" || typeof value === "boolean") return String(value)
	return JSON.stringify(value)
}

function pathSelectorMatches(selector: Selector, parsed: any) {
	const path = selectorPath(selector)
	if (!path) return { ok: false, message: "jsonpath selector path not set" }
	if (parsed === null || parsed === undefined) {
		return { ok: false, message: "jsonpath selector requires event JSON" }
	}

	const values = readJsonPathValues(parsed, path)
	if (values.length === 0) return { ok: false, message: `jsonpath ${path} not found` }

	const expected = selector.value
	const match = selector.match || "contains"

	if (match === "regex") {
		try {
			const re = new RegExp(expected)
			return values.some(value => re.test(valueToText(value)))
				? { ok: true, message: `jsonpath ${path} regex matched` }
				: { ok: false, message: `jsonpath ${path} regex did not match` }
		} catch (e: any) {
			return { ok: false, message: `Invalid jsonpath selector regex: ${e.message}` }
		}
	}

	if (match === "exact") {
		return values.some(value => valueToText(value) === expected)
			? { ok: true, message: `jsonpath ${path} exact matched` }
			: { ok: false, message: `jsonpath ${path} exact did not match` }
	}

	return values.some(value => valueToText(value).includes(expected))
		? { ok: true, message: `jsonpath ${path} contains matched` }
		: { ok: false, message: `jsonpath ${path} contains did not match` }
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

	if (isPathSelector(selector.type)) {
		return pathSelectorMatches(selector, parsed)
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
			const values = readJsonPathValues(parsed, path)
			if (values.length > 0) results[key] = values
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
