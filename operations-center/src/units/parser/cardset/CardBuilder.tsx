import { useEffect, useState } from "react"
import type { Card, KV, Selector, SelectorType } from "./types"

type Props = {
	card: Card
	isEdit: boolean
	onSave: (card: Card) => void
	onUpdate: (card: Card) => void
	onPreview: (card: Card) => void
}

const emptySelector = (): Selector => ({ type: "raw", value: "" })

function selectorList(value: Selector["not"] | Selector["and_not"]): Selector[] {
	if (!value) return []
	return Array.isArray(value) ? value : [value]
}

export function CardBuilder({
	card,
	isEdit,
	onSave,
	onUpdate,
	onPreview,
}: Props) {
	const [cardName, setCardName] = useState("")
	const [selector, setSelector] = useState<Selector>(emptySelector())
	const [negativeSelectors, setNegativeSelectors] = useState<Selector[]>([])
	const [regex, setRegex] = useState<KV[]>([])
	const [jsonp, setJsonp] = useState<KV[]>([])

	useEffect(() => {
		setCardName(card.name || "")
		setSelector({ ...(card.selector || emptySelector()), not: undefined, and_not: undefined })
		setNegativeSelectors([
			...selectorList(card.selector?.not),
			...selectorList(card.selector?.and_not),
		])

		const toKV = (items?: Record<string, string>[]) =>
			items
				? items.map(obj => {
						const [k, v] = Object.entries(obj)[0]
						return { key: k, value: v }
				  })
				: []

		setRegex(toKV(card.regex))
		setJsonp(toKV(card.jsonp))
	}, [card])

	const buildItems = (items: KV[]) =>
		items
			.filter(i => i.key.trim() !== "")
			.map(i => ({ [i.key]: i.value }))

	const buildCard = (): Card => {
		const cleanSelector: Selector = {
			type: selector.type,
			value: selector.value,
		}

		const cleanNot = negativeSelectors.filter(n => n.value.trim() !== "")
		if (cleanNot.length === 1) cleanSelector.not = cleanNot[0]
		if (cleanNot.length > 1) cleanSelector.not = cleanNot

		const c: Card = {
			name: cardName,
			selector: cleanSelector,
		}
		const r = buildItems(regex)
		const j = buildItems(jsonp)
		if (r.length > 0) c.regex = r
		if (j.length > 0) c.jsonp = j
		return c
	}

	const built = buildCard()

	useEffect(() => {
		onPreview(built)
	}, [cardName, selector, negativeSelectors, regex, jsonp])

	const updateNegative = (idx: number, patch: Partial<Selector>) => {
		setNegativeSelectors(items => {
			const next = [...items]
			next[idx] = { ...next[idx], ...patch }
			return next
		})
	}

	return (
		<div className="cardset-panel">
			<h2>CardSet Builder</h2>

			<label>Card Name</label>
			<input
				className="cardset-input"
				value={cardName}
				onChange={e => setCardName(e.target.value)}
			/>

			<label>Selector</label>
			<div className="cardset-row">
				<select
					className="cardset-input"
					value={selector.type}
					disabled={isEdit}
					onChange={e =>
						setSelector({
							...selector,
							type: e.target.value as SelectorType,
						})
					}
				>
					<option value="raw">raw</option>
					<option value="raw_regex">raw_regex</option>
					<option value="source_address">source_address</option>
				</select>

				<input
					className="cardset-input inline"
					placeholder={selector.type === "raw_regex" ? "regex pattern" : "value"}
					value={selector.value}
					disabled={isEdit}
					onChange={e =>
						setSelector({
							...selector,
							value: e.target.value,
						})
					}
				/>
			</div>

			<h3>AND NOT</h3>
			<button
				className="cardset-btn secondary"
				onClick={() => setNegativeSelectors(n => [...n, emptySelector()])}
			>
				+ Add Exclude
			</button>

			{negativeSelectors.map((n, i) => (
				<div key={i} className="cardset-row">
					<select
						className="cardset-input"
						value={n.type}
						onChange={e => updateNegative(i, { type: e.target.value as SelectorType })}
					>
						<option value="raw">raw</option>
						<option value="raw_regex">raw_regex</option>
						<option value="source_address">source_address</option>
					</select>
					<input
						className="cardset-input inline"
						placeholder="exclude value"
						value={n.value}
						onChange={e => updateNegative(i, { value: e.target.value })}
					/>
					<button
						className="cardset-btn secondary"
						onClick={() => setNegativeSelectors(items => items.filter((_, idx) => idx !== i))}
					>
						-
					</button>
				</div>
			))}

			<h3>Regex</h3>
			<button
				className="cardset-btn"
				onClick={() => setRegex(r => [...r, { key: "", value: "" }])}
			>
				+
			</button>

			{regex.map((r, i) => (
				<div key={i} className="cardset-row">
					<input
						className="cardset-input"
						placeholder="key"
						value={r.key}
						onChange={e => {
							const next = [...regex]
							next[i] = { ...r, key: e.target.value }
							setRegex(next)
						}}
					/>
					<input
						className="cardset-input inline"
						placeholder="pattern"
						value={r.value}
						onChange={e => {
							const next = [...regex]
							next[i] = { ...r, value: e.target.value }
							setRegex(next)
						}}
					/>
					<button
						className="cardset-btn secondary"
						onClick={() => setRegex(r => r.filter((_, idx) => idx !== i))}
					>
						-
					</button>
				</div>
			))}

			<h3>JSONP</h3>
			<button
				className="cardset-btn"
				onClick={() => setJsonp(j => [...j, { key: "", value: "" }])}
			>
				+
			</button>

			{jsonp.map((j, i) => (
				<div key={i} className="cardset-row">
					<input
						className="cardset-input"
						placeholder="key"
						value={j.key}
						onChange={e => {
							const next = [...jsonp]
							next[i] = { ...j, key: e.target.value }
							setJsonp(next)
						}}
					/>
					<input
						className="cardset-input inline"
						placeholder="json path"
						value={j.value}
						onChange={e => {
							const next = [...jsonp]
							next[i] = { ...j, value: e.target.value }
							setJsonp(next)
						}}
					/>
					<button
						className="cardset-btn secondary"
						onClick={() => setJsonp(j => j.filter((_, idx) => idx !== i))}
					>
						-
					</button>
				</div>
			))}

			<textarea
				readOnly
				className="cardset-input"
				style={{ height: "140px", marginTop: "0.5rem" }}
				value={JSON.stringify(built, null, 2)}
			/>

			{isEdit ? (
				<button
					className="cardset-btn cardset-save"
					onClick={() => onUpdate(built)}
				>
					Update Card
				</button>
			) : (
				<button
					className="cardset-btn cardset-save"
					disabled={!cardName.trim()}
					onClick={() => onSave(built)}
				>
					Save Card
				</button>
			)}
		</div>
	)
}
