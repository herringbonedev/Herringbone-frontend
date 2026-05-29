import type { Card, Selector } from "./types"

type Props = {
	cards: Card[]
	loading: boolean
	error: string | null
	selectedKey: string | null
	onDelete: (card: Card) => void
	onSelect: (card: Card) => void
}

function getId(card: Card): string {
	if (!card._id) return ""
	if (typeof card._id === "string") return card._id
	if (typeof card._id === "object" && "$oid" in card._id)
		return card._id.$oid
	return ""
}

function selectorPath(selector: Selector) {
	return selector.path || selector.field || ""
}

function getSelectorExpected(selector: Selector) {
	return selector.value || ""
}

export function cardSelectorKey(card: Card): string {
	const selector = card.selector
	return [
		selector.type,
		selectorPath(selector),
		selector.match || "",
		getSelectorExpected(selector),
	].join(":")
}

function getDisplayName(card: Card): string {
	if (card.name && card.name.trim()) return card.name
	return getSelectorLabel(card.selector)
}

function getSelectorLabel(selector: Selector): string {
	const path = selectorPath(selector)
	const match = selector.match ? ` ${selector.match}` : ""
	if (path) return `${selector.type}:${path}${match}=${selector.value}`
	return `${selector.type}=${selector.value}`
}

function countNot(card: Card): number {
	const n = card.selector?.not || card.selector?.and_not
	if (!n) return 0
	return Array.isArray(n) ? n.length : 1
}

export function SavedCards({
	cards,
	loading,
	error,
	selectedKey,
	onDelete,
	onSelect,
}: Props) {
	return (
		<div className="cardset-saved">
			<h3>Saved Cards</h3>

			{loading && <div>Loading…</div>}
			{error && <div style={{ color: "var(--red)" }}>{error}</div>}
			{!loading && cards.length === 0 && <div>No cards found.</div>}

			{cards.map((c, i) => {
				const id = getId(c)
				const key = cardSelectorKey(c)
				const title = getDisplayName(c)
				const selected = key === selectedKey

				return (
					<div
						key={id || i}
						className={`cardset-saved-item ${
							selected ? "selected" : ""
						}`}
						style={{ cursor: "pointer" }}
						onClick={() => onSelect(c)}
					>
						<strong>{title}</strong>

						<div style={{ opacity: 0.7, wordBreak: "break-all" }}>
							{getSelectorLabel(c.selector)}
						</div>

						{countNot(c) > 0 && (
							<div style={{ opacity: 0.7 }}>
								AND NOT: {countNot(c)}
							</div>
						)}

						<div style={{ opacity: 0.6 }}>
							regex: {c.regex?.length || 0}, jsonp:{" "}
							{c.jsonp?.length || 0}
						</div>

						<div
							style={{
								marginTop: "0.25rem",
								fontSize: "0.7rem",
								opacity: 0.6,
								wordBreak: "break-all",
							}}
						>
							id: {id || "unknown"}
						</div>

						<button
							className="cardset-btn secondary"
							style={{ marginTop: "0.4rem" }}
							onClick={e => {
								e.stopPropagation()
								onDelete(c)
							}}
						>
							Delete
						</button>
					</div>
				)
			})}
		</div>
	)
}
