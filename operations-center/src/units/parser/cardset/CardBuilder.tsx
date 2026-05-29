import { useEffect, useState } from "react"
import type { Card, KV, Selector, SelectorMatch, SelectorType } from "./types"

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

function isPathSelector(type: SelectorType) {
	return type === "field" || type === "path" || type === "json" || type === "jsonpath"
}

function selectorPath(selector: Selector) {
	return selector.path || selector.field || ""
}

function normalizeSelectorForEdit(selector?: Selector): Selector {
	if (!selector) return emptySelector()
	return {
		...selector,
		match: selector.match || (isPathSelector(selector.type) ? "contains" : undefined),
		path: selector.path || selector.field || "",
		not: undefined,
		and_not: undefined,
	}
}

function selectorHasMeaning(selector: Selector) {
	if (!selector.value.trim()) return false
	if (isPathSelector(selector.type)) return selectorPath(selector).trim() !== ""
	return true
}

function cleanSelectorForSave(selector: Selector): Selector {
	const clean: Selector = {
		type: selector.type,
		value: selector.value.trim(),
	}

	if (isPathSelector(selector.type)) {
		const path = selectorPath(selector).trim()
		if (selector.type === "field") clean.field = path
		else clean.path = path
		clean.match = selector.match || "contains"
	}

	return clean
}

function selectorPlaceholder(selector: Selector) {
	if (selector.type === "raw_regex") return "regex pattern"
	if (selector.type === "source_address") return "source address"
	if (isPathSelector(selector.type)) return "expected value"
	return "value"
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
		setSelector(normalizeSelectorForEdit(card.selector))
		setNegativeSelectors([
			...selectorList(card.selector?.not).map(normalizeSelectorForEdit),
			...selectorList(card.selector?.and_not).map(normalizeSelectorForEdit),
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
		const cleanSelector = cleanSelectorForSave(selector)

		const cleanNot = negativeSelectors
			.filter(selectorHasMeaning)
			.map(cleanSelectorForSave)
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

	const updateSelectorType = (type: SelectorType) => {
		setSelector(current => ({
			...current,
			type,
			match: isPathSelector(type) ? current.match || "contains" : undefined,
			path: isPathSelector(type) ? selectorPath(current) : undefined,
			field: undefined,
		}))
	}

	const updateNegativeType = (idx: number, type: SelectorType) => {
		updateNegative(idx, {
			type,
			match: isPathSelector(type) ? "contains" : undefined,
			path: isPathSelector(type) ? selectorPath(negativeSelectors[idx]) : undefined,
			field: undefined,
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
			<div className="cardset-row selector-row">
				<select
					className="cardset-input"
					value={selector.type}
					disabled={isEdit}
					onChange={e => updateSelectorType(e.target.value as SelectorType)}
				>
					<option value="raw">raw</option>
					<option value="raw_regex">raw_regex</option>
					<option value="source_address">source_address</option>
					<option value="jsonpath">jsonpath</option>
					<option value="field">field</option>
				</select>

				{isPathSelector(selector.type) && (
					<>
						<input
							className="cardset-input inline selector-path-input"
							placeholder="$.fingerprint.source_name"
							value={selectorPath(selector)}
							disabled={isEdit}
							onChange={e =>
								setSelector({
									...selector,
									path: e.target.value,
									field: selector.type === "field" ? e.target.value : undefined,
								})
							}
						/>
						<select
							className="cardset-input inline selector-match-input"
							value={selector.match || "contains"}
							disabled={isEdit}
							onChange={e =>
								setSelector({
									...selector,
									match: e.target.value as SelectorMatch,
								})
							}
						>
							<option value="exact">exact</option>
							<option value="contains">contains</option>
							<option value="regex">regex</option>
						</select>
					</>
				)}

				<input
					className="cardset-input inline"
					placeholder={selectorPlaceholder(selector)}
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
				<div key={i} className="cardset-row selector-row">
					<select
						className="cardset-input"
						value={n.type}
						onChange={e => updateNegativeType(i, e.target.value as SelectorType)}
					>
						<option value="raw">raw</option>
						<option value="raw_regex">raw_regex</option>
						<option value="source_address">source_address</option>
						<option value="jsonpath">jsonpath</option>
						<option value="field">field</option>
					</select>

					{isPathSelector(n.type) && (
						<>
							<input
								className="cardset-input inline selector-path-input"
								placeholder="$.fingerprint.confidence"
								value={selectorPath(n)}
								onChange={e =>
									updateNegative(i, {
										path: e.target.value,
										field: n.type === "field" ? e.target.value : undefined,
									})
								}
							/>
							<select
								className="cardset-input inline selector-match-input"
								value={n.match || "contains"}
								onChange={e =>
									updateNegative(i, { match: e.target.value as SelectorMatch })
								}
							>
								<option value="exact">exact</option>
								<option value="contains">contains</option>
								<option value="regex">regex</option>
							</select>
						</>
					)}

					<input
						className="cardset-input inline"
						placeholder={selectorPlaceholder(n)}
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
