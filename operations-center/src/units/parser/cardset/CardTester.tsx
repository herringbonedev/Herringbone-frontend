import { useState } from "react"
import type { Card } from "./types"

type Props = {
	card: Card
}

export function CardTester({ card }: Props) {
	const [inputText, setInputText] = useState("")

	const getRawString = (): string => {
		try {
			const parsed = JSON.parse(inputText)
			if (parsed && typeof parsed.raw === "string") {
				return parsed.raw
			}
		} catch {
			/* not JSON */
		}
		return inputText
	}

	const testCard = () => {
		if (!inputText.trim()) return { ok: false, message: "" }

		const raw = getRawString()

		const selType = card.selector?.type
		const selValue = card.selector?.value?.trim()

		if (!selType || !selValue) {
			return { ok: false, message: "Selector not set" }
		}

		if (selType !== "raw") {
			return { ok: false, message: "Only raw selector supported in tester" }
		}

		if (!raw.includes(selValue)) {
			return { ok: false, message: "Selector not matched" }
		}

		const results: Record<string, string[]> = {}

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
					matches.push(m[0])
				}

				results[key] = matches
			} catch {
				results[key] = []
			}
		})

		return { ok: true, message: "Selector matched", results }
	}

	const state = testCard()

	return (
		<div className="cardset-panel">
			<h2>Test Input</h2>

			<textarea
				className="cardset-input"
				style={{ height: "200px" }}
				value={inputText}
				onChange={e => setInputText(e.target.value)}
				placeholder="Paste raw log or full event JSON"
			/>

			<div className={`cardset-status ${state.ok ? "ok" : "err"}`}>
				<span>{state.ok ? "✔" : "✖"}</span>
				<span>{state.ok ? "Selector matched" : state.message}</span>
			</div>

			<h3>Matches</h3>

			<textarea
				readOnly
				className="cardset-input"
				style={{ height: "220px" }}
				value={state.ok ? JSON.stringify(state.results, null, 2) : ""}
			/>
		</div>
	)
}
