import { useEffect, useMemo, useState } from "react"
import { apiFetch } from "../../../api"
import type { Card, Selector } from "./types"

type Props = {
	cards: Card[]
	loading: boolean
	error: string | null
	selectedKey: string | null
	onDelete: (card: Card) => void
	onSelect: (card: Card) => void
}

type Group = {
	key: string
	title: string
	subtitle: string
	cards: Card[]
}

type Range = {
	from: string
	to: string
}

type CardMetric = {
	loading?: boolean
	error?: string | null
	parsed24h?: number | null
	errors24h?: number | null
	source24h?: number | null
}

type SortMode = "name" | "parsed" | "errors" | "source"

const pathSelectorTypes = new Set(["path", "field", "json", "jsonpath"])

function getId(card: Card): string {
	if (!card._id) return ""
	if (typeof card._id === "string") return card._id
	if (typeof card._id === "object" && "$oid" in card._id) return card._id.$oid
	return ""
}

export function keyForCard(card: Card): string {
	const id = getId(card)
	if (id) return `id:${id}`
	if (card.name?.trim()) return `name:${card.name.trim()}`
	return `selector:${selectorSummary(card.selector)}`
}

function displayName(card: Card): string {
	return card.metadata?.label || card.name || selectorSummary(card.selector)
}

function folderName(card: Card): string {
	return card.metadata?.folder || card.metadata?.source || card.metadata?.pack || "Unfiled"
}

function selectorPath(selector: Selector): string {
	return selector.path || selector.field || ""
}

function selectorSummary(selector: Selector): string {
	if (!selector) return "No selector"
	if (pathSelectorTypes.has(selector.type)) {
		const path = selectorPath(selector) || "field"
		const match = selector.match || "exact"
		if (match === "exists") return `${path} exists`
		if (match === "not_exists") return `${path} does not exist`
		const label = match === "exact" ? "is" : match === "regex" ? "matches" : "contains"
		return `${path} ${label} ${selector.value || "…"}`
	}
	if (selector.type === "raw") return `Raw contains ${selector.value || "…"}`
	if (selector.type === "raw_regex") return `Raw matches ${selector.value || "…"}`
	if (selector.type === "source_address") return `Source IP is ${selector.value || "…"}`
	return `${selector.type}: ${selector.value || "…"}`
}

function tagList(card: Card): string[] {
	return Array.isArray(card.metadata?.tags)
		? card.metadata.tags.filter((tag): tag is string => typeof tag === "string" && tag.trim() !== "")
		: []
}

function cardKind(card: Card): string {
	if (typeof card.metadata?.type === "string" && card.metadata.type.trim()) return card.metadata.type.trim()
	if (card.jsonp?.length && !card.regex?.length) return "jsonp"
	if (card.regex?.length && !card.jsonp?.length) return "regex"
	if (card.regex?.length && card.jsonp?.length) return "mixed"
	return "card"
}

function countNot(card: Card): number {
	const n = card.selector?.not || card.selector?.and_not
	if (!n) return 0
	return Array.isArray(n) ? n.length : 1
}

function exportCards(folder: string, cards: Card[]) {
	const clean = cards.map(card => {
		const payload: Card = {
			name: card.name,
			metadata: card.metadata,
			selector: card.selector,
		}
		if (card.regex?.length) payload.regex = card.regex
		if (card.jsonp?.length) payload.jsonp = card.jsonp
		return payload
	})

	const blob = new Blob([JSON.stringify(clean, null, 2)], { type: "application/json" })
	const url = URL.createObjectURL(blob)
	const a = document.createElement("a")
	a.href = url
	a.download = `${folder.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "parse"}-pack.json`
	document.body.appendChild(a)
	a.click()
	a.remove()
	URL.revokeObjectURL(url)
}

function sortCards(cards: Card[], sortMode: SortMode, metrics: Record<string, CardMetric>): Card[] {
	const metricField = sortMode === "parsed" ? "parsed24h" : sortMode === "errors" ? "errors24h" : sortMode === "source" ? "source24h" : null

	return [...cards].sort((a, b) => {
		if (metricField) {
			const diff = metricValue(metrics[keyForCard(b)], metricField) - metricValue(metrics[keyForCard(a)], metricField)
			if (diff !== 0) return diff
		}

		return displayName(a).localeCompare(displayName(b))
	})
}

function groupCards(cards: Card[], sortMode: SortMode, metrics: Record<string, CardMetric>): Group[] {
	const groups = new Map<string, Card[]>()
	cards.forEach(card => {
		const folder = folderName(card)
		groups.set(folder, [...(groups.get(folder) || []), card])
	})

	return [...groups.entries()]
		.map(([title, items]) => {
			const first = items[0]
			const source = first?.metadata?.source
			const pack = first?.metadata?.pack
			const subtitle = [pack, source].filter(Boolean).join(" · ") || `${items.length} cards`
			return {
				key: title,
				title,
				subtitle,
				cards: sortCards(items, sortMode, metrics),
			}
		})
		.sort((a, b) => a.title.localeCompare(b.title))
}

function last24h(): Range {
	const to = new Date()
	const from = new Date(to.getTime() - 24 * 60 * 60 * 1000)
	return { from: from.toISOString(), to: to.toISOString() }
}

function escapeRegex(value: string) {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function selectorToEventQuery(selector: Selector): Record<string, unknown> | null {
	const value = selector.value || ""
	if (pathSelectorTypes.has(selector.type)) {
		const path = selectorPath(selector)
		if (!path) return null
		if (selector.match === "exists") return { [path]: { "$ne": null } }
		if (selector.match === "not_exists") return { [path]: null }
		if (!value) return null
		if (selector.match === "regex") return { [path]: { "$regex": value } }
		if (selector.match === "contains") return { [path]: { "$regex": escapeRegex(value), "$options": "i" } }
		return { [path]: value }
	}
	if (selector.type === "raw" && value) return { raw: { "$regex": escapeRegex(value), "$options": "i" } }
	if (selector.type === "raw_regex" && value) return { raw: { "$regex": value } }
	if (selector.type === "source_address" && value) return { "source.address": value }
	return null
}

function countUrl(collection: string, query: Record<string, unknown>, range: Range) {
	const params = new URLSearchParams()
	params.set("q", JSON.stringify(query))
	params.set("from_ts", range.from)
	params.set("to_ts", range.to)
	return `/herringbone/search/count/${collection}?${params.toString()}`
}

async function searchCount(collection: string, query: Record<string, unknown>, range: Range): Promise<number | null> {
	const res = await apiFetch(countUrl(collection, query, range), { headers: { Accept: "application/json" } })
	if (!res.ok) throw new Error(`HTTP ${res.status}`)
	const data = await res.json()
	return typeof data?.count === "number" ? data.count : 0
}

async function countEndpointAvailable(range: Range): Promise<boolean> {
	try {
		const probeQuery = { _id: "__herringbone_cardset_metrics_probe__" }
		const res = await apiFetch(countUrl("events", probeQuery, range), { headers: { Accept: "application/json" } })
		return res.ok
	} catch {
		return false
	}
}

function compactNumber(value: number | null | undefined, loading?: boolean) {
	if (loading) return "…"
	if (value == null) return "—"
	return new Intl.NumberFormat(undefined, { notation: value >= 10000 ? "compact" : "standard", maximumFractionDigits: 1 }).format(value)
}

function metricValue(metric: CardMetric | undefined, field: "parsed24h" | "errors24h" | "source24h") {
	const value = metric?.[field]
	return typeof value === "number" ? value : -1
}

function metricLine(metric?: CardMetric) {
	if (!metric || metric.loading) return "Loading activity…"
	if (metric.error) return "Activity unavailable"
	return `${compactNumber(metric.parsed24h)} parsed · ${compactNumber(metric.errors24h)} errors`
}

function groupMetricLine(group: Group, metrics: Record<string, CardMetric>) {
	let loading = false
	let parsed = 0
	let errors = 0
	let source: number | null = null
	let hasParsed = false
	let hasErrors = false

	for (const card of group.cards) {
		const metric = metrics[keyForCard(card)]
		if (metric?.loading) loading = true
		if (typeof metric?.parsed24h === "number") {
			parsed += metric.parsed24h
			hasParsed = true
		}
		if (typeof metric?.errors24h === "number") {
			errors += metric.errors24h
			hasErrors = true
		}
		if (source == null && typeof metric?.source24h === "number") source = metric.source24h
	}

	if (loading) return "Loading activity…"
	const parts = []
	if (hasParsed) parts.push(`${compactNumber(parsed)} parsed`)
	if (hasErrors) parts.push(`${compactNumber(errors)} errors`)
	if (source != null) parts.push(`${compactNumber(source)} source events`)
	return parts.length ? `24h · ${parts.join(" · ")}` : "24h activity unavailable"
}

export function SavedCards({
	cards,
	loading,
	error,
	selectedKey,
	onDelete,
	onSelect,
}: Props) {
	const [query, setQuery] = useState("")
	const [sortMode, setSortMode] = useState<SortMode>("name")
	const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
	const [metrics, setMetrics] = useState<Record<string, CardMetric>>({})
	const [metricStatus, setMetricStatus] = useState<"idle" | "loading" | "ready" | "unavailable">("idle")

	const filtered = useMemo(() => {
		const q = query.trim().toLowerCase()
		if (!q) return cards
		return cards.filter(card => {
			const text = [
				displayName(card),
				card.name,
				folderName(card),
				card.metadata?.type,
				card.metadata?.source,
				card.metadata?.pack,
				...tagList(card),
				selectorSummary(card.selector),
			]
				.filter(Boolean)
				.join(" ")
				.toLowerCase()
			return text.includes(q)
		})
	}, [cards, query])

	const groups = useMemo(() => groupCards(filtered, sortMode, metrics), [filtered, sortMode, metrics])


	async function loadMetrics() {
		if (!cards.length || metricStatus === "loading") return

		const range = last24h()
		setMetricStatus("loading")
		setMetrics(Object.fromEntries(cards.map(card => [keyForCard(card), { loading: true } satisfies CardMetric])))

		const hasCountEndpoint = await countEndpointAvailable(range)
		if (!hasCountEndpoint) {
			setMetricStatus("unavailable")
			setMetrics({})
			return
		}

		const entries = await Promise.all(cards.map(async card => {
			const key = keyForCard(card)
			const cardName = card.name || displayName(card)
			const eventQuery = selectorToEventQuery(card.selector)
			try {
				const [parsed24h, errors24h, source24h] = await Promise.all([
					searchCount("parse_results", { card: cardName }, range),
					searchCount("parse_results", { card: cardName, error: { "$regex": ".+" } }, range),
					eventQuery ? searchCount("events", eventQuery, range) : Promise.resolve(null),
				])
				return [key, { loading: false, parsed24h, errors24h, source24h, error: null } satisfies CardMetric] as const
			} catch (e: any) {
				return [key, { loading: false, parsed24h: null, errors24h: null, source24h: null, error: e?.message || "Failed to load metrics" } satisfies CardMetric] as const
			}
		}))

		setMetrics(Object.fromEntries(entries))
		setMetricStatus("ready")
	}


	useEffect(() => {
		if (!cards.length || loading) return
		loadMetrics()
		// Metrics are intentionally refreshed when the card list changes.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [cards, loading])

	return (
		<div className="cardset-saved">
			<div className="cardset-library-head">
				<div>
					<h2>Cards</h2>
					<p>{cards.length} cards · {groups.length} folders</p>
				</div>
				<button
					className="cardset-text-btn"
					onClick={loadMetrics}
					disabled={metricStatus === "loading" || metricStatus === "unavailable"}
				>
					{metricStatus === "loading" ? "Loading metrics" : metricStatus === "ready" ? "Refresh metrics" : metricStatus === "unavailable" ? "Metrics unavailable" : "Load metrics"}
				</button>
			</div>

			<div className="cardset-list-controls">
				<input
					className="cardset-input cardset-search"
					value={query}
					onChange={e => setQuery(e.target.value)}
					placeholder="Search cards, folders, tags, selectors…"
				/>
				<label className="cardset-sort-control">
					<span>Sort</span>
					<select className="cardset-input" value={sortMode} onChange={e => setSortMode(e.target.value as SortMode)}>
						<option value="name">Name</option>
						<option value="parsed">Most parsed</option>
						<option value="errors">Most errors</option>
						<option value="source">Most source events</option>
					</select>
				</label>
			</div>

			{loading && <div className="cardset-empty-state">Loading cards…</div>}
			{error && <div className="cardset-error-state">{error}</div>}
			{!loading && cards.length === 0 && <div className="cardset-empty-state">No cards yet. Import a pack or create your first card.</div>}
			{!loading && cards.length > 0 && groups.length === 0 && <div className="cardset-empty-state">No cards match your search.</div>}

			<div className="cardset-folder-list">
				{groups.map(group => {
					const isCollapsed = Boolean(collapsed[group.key])
					return (
						<section key={group.key} className="cardset-folder">
							<div className="cardset-folder-header">
								<div className="cardset-folder-header-top">
									<button
										className="cardset-folder-title"
										onClick={() => setCollapsed(c => ({ ...c, [group.key]: !c[group.key] }))}
									>
										<span className="cardset-folder-caret">{isCollapsed ? "›" : "⌄"}</span>
										<span>
											<strong>{group.title}</strong>
											<small>{group.subtitle}</small>
										</span>
									</button>
									<div className="cardset-folder-actions">
										<button className="cardset-text-btn" onClick={() => exportCards(group.title, group.cards)}>Export</button>
									</div>
								</div>
								{metricStatus !== "idle" && (
									<div className="cardset-folder-metrics-row">
										<span className="cardset-activity-text">{groupMetricLine(group, metrics)}</span>
									</div>
								)}
							</div>

							{!isCollapsed && (
								<div className="cardset-folder-cards">
									{group.cards.map(card => {
										const key = keyForCard(card)
										const selected = key === selectedKey
										const tags = tagList(card)
										const metric = metrics[key]
										return (
											<article
												key={key}
												className={`cardset-saved-card ${selected ? "selected" : ""}`}
												onClick={() => onSelect(card)}
											>
												<div className="cardset-saved-main">
													<div className="cardset-card-title-row">
														<strong>{displayName(card)}</strong>
														<span>{cardKind(card)}</span>
													</div>
													<span>{selectorSummary(card.selector)}</span>
													<div className="cardset-card-meta-line">
														<span>{card.regex?.length || 0} regex</span>
														<span>{card.jsonp?.length || 0} jsonp</span>
														{countNot(card) > 0 && <span>{countNot(card)} excludes</span>}
														{tags.slice(0, 3).map(tag => <span key={tag}>#{tag}</span>)}
													</div>
													{metricStatus !== "idle" && (
														<div className="cardset-card-metrics-row">
															<span className="cardset-activity-text">{metricLine(metric)}</span>
														</div>
													)}
												</div>
												<div className="cardset-card-side">
													<button
														className="cardset-text-btn danger"
														onClick={e => {
															e.stopPropagation()
															onDelete(card)
														}}
													>
														Delete
													</button>
												</div>
											</article>
										)
									})}
								</div>
							)}
						</section>
					)
				})}
			</div>
		</div>
	)
}
