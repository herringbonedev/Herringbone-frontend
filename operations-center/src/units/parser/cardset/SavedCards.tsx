import type { Card } from "./types"

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

function getKey(card: Card): string {
	return `${card.selector.type}:${card.selector.value}`
}

function getDisplayName(card: Card): string {
	if (card.name && card.name.trim()) return card.name
	return `${card.selector.type}=${card.selector.value}`
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
				const key = getKey(c)
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

						<div style={{ opacity: 0.7 }}>
							{c.selector.type}: {c.selector.value}
						</div>

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