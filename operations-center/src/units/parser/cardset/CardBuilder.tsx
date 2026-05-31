import { useEffect, useMemo, useState } from "react"
import type { Card, CardMetadata, KV, Selector, SelectorMatch, SelectorType } from "./types"

type Props = {
	card: Card
	isEdit: boolean
	onSave: (card: Card) => void
	onUpdate: (card: Card) => void
	onPreview: (card: Card) => void
}

const emptySelector = (): Selector => ({ type: "raw", value: "" })
const pathSelectorTypes = new Set(["path", "field", "json", "jsonpath"])
type BuilderTab = "details" | "match" | "extract"

function selectorList(value: Selector["not"] | Selector["and_not"]): Selector[] {
	if (!value) return []
	return Array.isArray(value) ? value : [value]
}

function selectorLabel(type: SelectorType) {
	switch (type) {
		case "raw":
			return "Raw contains"
		case "raw_regex":
			return "Raw regex"
		case "source_address":
			return "Source IP"
		case "path":
		case "field":
		case "json":
		case "jsonpath":
			return "Match field"
		default:
			return type
	}
}

function conditionLabel(match?: SelectorMatch) {
	switch (match || "contains") {
		case "exact":
			return "is"
		case "contains":
			return "contains"
		case "regex":
			return "matches regex"
		case "exists":
			return "exists"
		case "not_exists":
			return "does not exist"
		default:
			return match
	}
}

function selectorNeedsValue(selector: Selector) {
	return selector.match !== "exists" && selector.match !== "not_exists"
}

function cleanTags(tags: string) {
	return tags
		.split(",")
		.map(t => t.trim())
		.filter(Boolean)
}

function metadataValue(metadata: CardMetadata | undefined, key: keyof CardMetadata) {
	const value = metadata?.[key]
	if (Array.isArray(value)) return value.join(", ")
	return typeof value === "string" ? value : ""
}

function selectorSummary(selector: Selector) {
	if (pathSelectorTypes.has(selector.type)) {
		const path = selector.path || selector.field || "field"
		const match = selector.match || "exact"
		if (!selectorNeedsValue(selector)) return `${path} ${conditionLabel(match)}`
		return `${path} ${conditionLabel(match)} ${selector.value || "…"}`
	}
	return `${selectorLabel(selector.type)} ${selector.value || "…"}`
}

function toKV(items?: Record<string, string>[]) {
	return items
		? items.map(obj => {
				const [k, v] = Object.entries(obj)[0] || ["", ""]
				return { key: k, value: v }
		  })
		: []
}

export function CardBuilder({
	card,
	isEdit,
	onSave,
	onUpdate,
	onPreview,
}: Props) {
	const [cardName, setCardName] = useState("")
	const [folder, setFolder] = useState("")
	const [label, setLabel] = useState("")
	const [cardType, setCardType] = useState("")
	const [source, setSource] = useState("")
	const [pack, setPack] = useState("")
	const [tags, setTags] = useState("")
	const [selector, setSelector] = useState<Selector>(emptySelector())
	const [negativeSelectors, setNegativeSelectors] = useState<Selector[]>([])
	const [regex, setRegex] = useState<KV[]>([])
	const [jsonp, setJsonp] = useState<KV[]>([])
	const [activeTab, setActiveTab] = useState<BuilderTab>("details")

	useEffect(() => {
		const incomingSelector = card.selector || emptySelector()
		setCardName(card.name || "")
		setFolder(metadataValue(card.metadata, "folder"))
		setLabel(metadataValue(card.metadata, "label"))
		setCardType(metadataValue(card.metadata, "type"))
		setSource(metadataValue(card.metadata, "source"))
		setPack(metadataValue(card.metadata, "pack"))
		setTags(metadataValue(card.metadata, "tags"))
		setSelector({
			...incomingSelector,
			type: pathSelectorTypes.has(incomingSelector.type) ? "path" : incomingSelector.type,
			not: undefined,
			and_not: undefined,
		})
		setNegativeSelectors([
			...selectorList(card.selector?.not),
			...selectorList(card.selector?.and_not),
		])
		setRegex(toKV(card.regex))
		setJsonp(toKV(card.jsonp))
	}, [card])

	const buildItems = (items: KV[]) =>
		items
			.filter(i => i.key.trim() !== "" && i.value.trim() !== "")
			.map(i => ({ [i.key.trim()]: i.value.trim() }))

	const buildSelector = (): Selector => {
		const isPath = pathSelectorTypes.has(selector.type)
		const cleanSelector: Selector = isPath
			? {
					type: "path",
					path: (selector.path || selector.field || "").trim(),
					match: selector.match || "exact",
			  }
			: {
					type: selector.type,
					value: (selector.value || "").trim(),
			  }

		if (isPath && selectorNeedsValue(cleanSelector)) {
			cleanSelector.value = (selector.value || "").trim()
		}

		const cleanNot = negativeSelectors
			.map(n => ({ ...n, value: n.value?.trim() || "" }))
			.filter(n => n.value || (pathSelectorTypes.has(n.type) && (n.path || n.field)))

		if (cleanNot.length === 1) cleanSelector.not = cleanNot[0]
		if (cleanNot.length > 1) cleanSelector.not = cleanNot
		return cleanSelector
	}

	const built = useMemo<Card>(() => {
		const metadata: CardMetadata = {
			folder: folder.trim() || undefined,
			label: label.trim() || undefined,
			type: cardType.trim() || undefined,
			source: source.trim() || undefined,
			pack: pack.trim() || undefined,
			tags: cleanTags(tags),
		}

		const cleanMetadata = Object.fromEntries(
			Object.entries(metadata).filter(([, v]) => {
				if (Array.isArray(v)) return v.length > 0
				return Boolean(v)
			}),
		) as CardMetadata

		const c: Card = {
			name: cardName.trim(),
			selector: buildSelector(),
		}
		if (Object.keys(cleanMetadata).length > 0) c.metadata = cleanMetadata
		const r = buildItems(regex)
		const j = buildItems(jsonp)
		if (r.length > 0) c.regex = r
		if (j.length > 0) c.jsonp = j
		return c
	}, [cardName, folder, label, cardType, source, pack, tags, selector, negativeSelectors, regex, jsonp])

	useEffect(() => {
		onPreview(built)
	}, [built, onPreview])

	const updateNegative = (idx: number, patch: Partial<Selector>) => {
		setNegativeSelectors(items => {
			const next = [...items]
			next[idx] = { ...next[idx], ...patch }
			return next
		})
	}

	const updateKv = (kind: "regex" | "jsonp", idx: number, patch: Partial<KV>) => {
		const setter = kind === "regex" ? setRegex : setJsonp
		setter(items => {
			const next = [...items]
			next[idx] = { ...next[idx], ...patch }
			return next
		})
	}

	const removeKv = (kind: "regex" | "jsonp", idx: number) => {
		const setter = kind === "regex" ? setRegex : setJsonp
		setter(items => items.filter((_, i) => i !== idx))
	}

	const canSave = Boolean(cardName.trim()) && Boolean(
		pathSelectorTypes.has(selector.type)
			? selector.path || selector.field
			: selector.value,
	)

	return (
		<div className="cardset-builder">
			<div className="cardset-builder-head">
				<div>
					<p className="cardset-eyebrow">Parse card</p>
					<h2>{isEdit ? "Edit card" : "Create card"}</h2>
				</div>
				<span className="cardset-builder-mode">{isEdit ? "Editing" : "Draft"}</span>
			</div>

			<div className="cardset-builder-tabs" role="tablist" aria-label="Card builder steps">
				<button className={`cardset-builder-tab ${activeTab === "details" ? "active" : ""}`} onClick={() => setActiveTab("details")} type="button">Card details</button>
				<button className={`cardset-builder-tab ${activeTab === "match" ? "active" : ""}`} onClick={() => setActiveTab("match")} type="button">Match condition</button>
				<button className={`cardset-builder-tab ${activeTab === "extract" ? "active" : ""}`} onClick={() => setActiveTab("extract")} type="button">Extraction</button>
			</div>

			{activeTab === "details" && (
			<section className="cardset-section">
				<div className="cardset-section-title">
					<span>1</span>
					<div>
						<h3>Card details</h3>
						<p>Name, organize, and label the card.</p>
					</div>
				</div>

				<div className="cardset-form-grid two">
					<label className="cardset-field wide">
						<span>Card name</span>
						<input
							className="cardset-input"
							value={cardName}
							onChange={e => setCardName(e.target.value)}
							placeholder="Cloudflare JSONP - WAF event"
						/>
					</label>
					<label className="cardset-field">
						<span>Folder</span>
						<input
							className="cardset-input"
							value={folder}
							onChange={e => setFolder(e.target.value)}
							placeholder="Cloudflare"
						/>
					</label>
					<label className="cardset-field">
						<span>Display label</span>
						<input
							className="cardset-input"
							value={label}
							onChange={e => setLabel(e.target.value)}
							placeholder="WAF event"
						/>
					</label>
					<label className="cardset-field">
						<span>Type</span>
						<input className="cardset-input" value={cardType} onChange={e => setCardType(e.target.value)} placeholder="waf" />
					</label>
					<label className="cardset-field">
						<span>Source</span>
						<input className="cardset-input" value={source} onChange={e => setSource(e.target.value)} placeholder="Cloudflare" />
					</label>
					<label className="cardset-field">
						<span>Pack</span>
						<input className="cardset-input" value={pack} onChange={e => setPack(e.target.value)} placeholder="Cloudflare JSONP" />
					</label>
					<label className="cardset-field">
						<span>Tags</span>
						<input className="cardset-input" value={tags} onChange={e => setTags(e.target.value)} placeholder="cloudflare, waf, edge" />
					</label>
				</div>
			</section>
			)}

			{activeTab === "match" && (
			<section className="cardset-section">
				<div className="cardset-section-title">
					<span>2</span>
					<div>
						<h3>Match condition</h3>
						<p>Choose the event pattern this card should run on.</p>
					</div>
				</div>

				<div className="cardset-match-box">
					<div className="cardset-form-grid match">
						<label className="cardset-field">
							<span>Match on</span>
							<select
								className="cardset-input"
								value={pathSelectorTypes.has(selector.type) ? "path" : selector.type}
								disabled={isEdit}
								onChange={e => {
									const type = e.target.value as SelectorType
									setSelector(type === "path" ? { type, path: "", match: "exact", value: "" } : { type, value: "" })
								}}
							>
								<option value="raw">Raw contains</option>
								<option value="raw_regex">Raw regex</option>
								<option value="source_address">Source IP</option>
								<option value="path">Match field</option>
							</select>
						</label>

						{pathSelectorTypes.has(selector.type) ? (
							<>
								<label className="cardset-field wide">
									<span>Field</span>
									<input
										className="cardset-input"
										placeholder="fingerprint.source_name"
										value={selector.path || selector.field || ""}
										disabled={isEdit}
										onChange={e => setSelector({ ...selector, type: "path", path: e.target.value })}
									/>
								</label>
								<label className="cardset-field">
									<span>Condition</span>
									<select
										className="cardset-input"
										value={selector.match || "exact"}
										disabled={isEdit}
										onChange={e => setSelector({ ...selector, type: "path", match: e.target.value as SelectorMatch })}
									>
										<option value="exact">is</option>
										<option value="contains">contains</option>
										<option value="regex">matches regex</option>
										<option value="exists">exists</option>
										<option value="not_exists">does not exist</option>
									</select>
								</label>
								{selectorNeedsValue(selector) && (
									<label className="cardset-field wide">
										<span>Value</span>
										<input
											className="cardset-input"
											placeholder="Cloudflare"
											value={selector.value || ""}
											disabled={isEdit}
											onChange={e => setSelector({ ...selector, value: e.target.value })}
										/>
									</label>
								)}
							</>
						) : (
							<label className="cardset-field wide">
								<span>Value</span>
								<input
									className="cardset-input"
									placeholder={selector.type === "raw_regex" ? "regex pattern" : "value"}
									value={selector.value || ""}
									disabled={isEdit}
									onChange={e => setSelector({ ...selector, value: e.target.value })}
								/>
							</label>
						)}
					</div>

					<div className="cardset-sentence">
						Run this card when <strong>{selectorSummary(selector)}</strong>
					</div>
				</div>

				<details className="cardset-details">
					<summary>Exclude matches</summary>
					<button className="cardset-btn secondary small" onClick={() => setNegativeSelectors(n => [...n, emptySelector()])}>
						Add exclude
					</button>
					{negativeSelectors.map((n, i) => (
						<div key={i} className="cardset-row compact">
							<select className="cardset-input" value={n.type} onChange={e => updateNegative(i, { type: e.target.value as SelectorType })}>
								<option value="raw">Raw contains</option>
								<option value="raw_regex">Raw regex</option>
								<option value="source_address">Source IP</option>
							</select>
							<input className="cardset-input" placeholder="exclude value" value={n.value || ""} onChange={e => updateNegative(i, { value: e.target.value })} />
							<button className="cardset-icon-btn" onClick={() => setNegativeSelectors(items => items.filter((_, idx) => idx !== i))}>×</button>
						</div>
					))}
				</details>
			</section>
			)}

			{activeTab === "extract" && (
			<section className="cardset-section">
				<div className="cardset-section-title">
					<span>3</span>
					<div>
						<h3>Extraction</h3>
						<p>Define the fields produced by this card.</p>
					</div>
				</div>

				<div className="cardset-extract-grid">
					<div className="cardset-extract-panel">
						<div className="cardset-extract-head">
							<div>
								<strong>JSONP</strong>
								<span>JSON path fields</span>
							</div>
							<button className="cardset-btn secondary small" onClick={() => setJsonp(j => [...j, { key: "", value: "" }])}>Add</button>
						</div>
						{jsonp.length === 0 && <div className="cardset-empty-mini">No JSONP fields yet.</div>}
						{jsonp.map((j, i) => (
							<div key={i} className="cardset-kv-row">
								<input className="cardset-input" placeholder="field_name" value={j.key} onChange={e => updateKv("jsonp", i, { key: e.target.value })} />
								<input className="cardset-input" placeholder="$.ClientIP" value={j.value} onChange={e => updateKv("jsonp", i, { value: e.target.value })} />
								<button className="cardset-icon-btn" onClick={() => removeKv("jsonp", i)}>×</button>
							</div>
						))}
					</div>

					<div className="cardset-extract-panel">
						<div className="cardset-extract-head">
							<div>
								<strong>Regex</strong>
								<span>Raw log patterns</span>
							</div>
							<button className="cardset-btn secondary small" onClick={() => setRegex(r => [...r, { key: "", value: "" }])}>Add</button>
						</div>
						{regex.length === 0 && <div className="cardset-empty-mini">No regex fields yet.</div>}
						{regex.map((r, i) => (
							<div key={i} className="cardset-kv-row">
								<input className="cardset-input" placeholder="field_name" value={r.key} onChange={e => updateKv("regex", i, { key: e.target.value })} />
								<input className="cardset-input" placeholder="regex pattern" value={r.value} onChange={e => updateKv("regex", i, { value: e.target.value })} />
								<button className="cardset-icon-btn" onClick={() => removeKv("regex", i)}>×</button>
							</div>
						))}
					</div>
				</div>
			</section>
			)}

			<details className="cardset-details">
				<summary>JSON preview</summary>
				<textarea readOnly className="cardset-input cardset-json-preview" value={JSON.stringify(built, null, 2)} />
			</details>

			<div className="cardset-builder-step-actions">
				<button className="cardset-btn secondary small" disabled={activeTab === "details"} onClick={() => setActiveTab(activeTab === "extract" ? "match" : "details")} type="button">Back</button>
				<button className="cardset-btn secondary small" disabled={activeTab === "extract"} onClick={() => setActiveTab(activeTab === "details" ? "match" : "extract")} type="button">Next</button>
			</div>

			<div className="cardset-builder-actions">
				{isEdit ? (
					<button className="cardset-btn cardset-save" disabled={!canSave} onClick={() => onUpdate(built)}>
						Update card
					</button>
				) : (
					<button className="cardset-btn cardset-save" disabled={!canSave} onClick={() => onSave(built)}>
						Save card
					</button>
				)}
			</div>
		</div>
	)
}
