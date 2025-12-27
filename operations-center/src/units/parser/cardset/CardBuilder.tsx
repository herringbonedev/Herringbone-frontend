import { useEffect, useState } from "react"
import type { Card, KV, Selector } from "./types"

type Props = {
	card: Card
	isEdit: boolean
	onSave: (card: Card) => void
	onUpdate: (card: Card) => void
	onPreview: (card: Card) => void
}

export function CardBuilder({
	card,
	isEdit,
	onSave,
	onUpdate,
	onPreview,
}: Props) {
	const [cardName, setCardName] = useState("")
	const [selector, setSelector] = useState<Selector>({ type: "", value: "" })
	const [regex, setRegex] = useState<KV[]>([])
	const [jsonp, setJsonp] = useState<KV[]>([])

	useEffect(() => {
		setCardName(card.name || "")
		setSelector(card.selector || { type: "", value: "" })

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
		const c: Card = {
			name: cardName,
			selector,
		}
		const r = buildItems(regex)
		const j = buildItems(jsonp)
		if (r.length > 0) c.regex = r
		if (j.length > 0) c.jsonp = j
		return c
	}

	const built = buildCard()

	// 🔴 LIVE PREVIEW for tester
	useEffect(() => {
		onPreview(built)
	}, [cardName, selector, regex, jsonp])

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
				<input
					className="cardset-input"
					placeholder="type"
					value={selector.type}
					disabled={isEdit}
					onChange={e =>
						setSelector({ ...selector, type: e.target.value })
					}
				/>
				<input
					className="cardset-input inline"
					placeholder="value"
					value={selector.value}
					disabled={isEdit}
					onChange={e =>
						setSelector({ ...selector, value: e.target.value })
					}
				/>
			</div>

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
						onClick={() =>
							setRegex(r => r.filter((_, idx) => idx !== i))
						}
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
						onClick={() =>
							setJsonp(j => j.filter((_, idx) => idx !== i))
						}
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
