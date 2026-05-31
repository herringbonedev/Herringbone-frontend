import { useState, type ChangeEvent } from "react"
import type { Card } from "./types"
import { useCardsetApi } from "./useCardsetApi"
import { CardBuilder } from "./CardBuilder"
import { CardTester } from "./CardTester"
import { SavedCards, keyForCard } from "./SavedCards"
import "./cardset.css"

const emptyCard: Card = {
	name: "",
	metadata: {
		folder: "",
		label: "",
		tags: [],
	},
	selector: { type: "raw", value: "" },
}

export default function CardSetPage() {
	const { cards, loading, error, saveCard, updateCard, deleteCard } = useCardsetApi()
	const [currentCard, setCurrentCard] = useState<Card>(emptyCard)
	const [previewCard, setPreviewCard] = useState<Card>(emptyCard)
	const [isEditing, setIsEditing] = useState(false)
	const [selectedKey, setSelectedKey] = useState<string | null>(null)
	const [notice, setNotice] = useState<string | null>(null)

	const resetEditor = () => {
		setSelectedKey(null)
		setCurrentCard(emptyCard)
		setPreviewCard(emptyCard)
		setIsEditing(false)
	}

	const handleSelect = (card: Card) => {
		const key = keyForCard(card)
		if (selectedKey === key) {
			resetEditor()
			return
		}
		setSelectedKey(key)
		setCurrentCard(card)
		setPreviewCard(card)
		setIsEditing(true)
	}

	const importParsePack = async (e: ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0]
		if (!file) return

		try {
			const text = await file.text()
			const parsed = JSON.parse(text)

			if (!Array.isArray(parsed)) throw new Error("Parse pack must be a JSON array")

			let imported = 0
			for (const c of parsed) {
				if (c?.selector) {
					await saveCard(c)
					imported++
				}
			}

			setNotice(`Imported ${imported} card${imported === 1 ? "" : "s"}.`)
			window.setTimeout(() => setNotice(null), 3500)
			resetEditor()
		} catch (err: any) {
			alert(err?.message || "Invalid parse pack")
		} finally {
			e.target.value = ""
		}
	}

	const cardCount = cards.length
	const folderCount = new Set(cards.map(c => c.metadata?.folder || c.metadata?.source || c.metadata?.pack || "Unfiled")).size

	return (
		<div className="cardset-app">
			<header className="cardset-topbar">
				<div className="cardset-title-block">
					<h1>CardSet</h1>
					<span>{cardCount} cards · {folderCount} folders</span>
				</div>
				<div className="cardset-topbar-actions">
					<label className="cardset-btn secondary">
						Import pack
						<input type="file" accept="application/json" onChange={importParsePack} style={{ display: "none" }} />
					</label>
					<button className="cardset-btn" onClick={resetEditor}>New card</button>
				</div>
			</header>

			{notice && <div className="cardset-notice">{notice}</div>}

			<div className="cardset-layout">
				<aside className="cardset-sidebar">
					<SavedCards
						cards={cards}
						loading={loading}
						error={error}
						selectedKey={selectedKey}
						onDelete={card => deleteCard(card)}
						onSelect={handleSelect}
					/>
				</aside>

				<main className="cardset-main">
					<CardBuilder
						card={currentCard}
						isEdit={isEditing}
						onSave={async card => {
							await saveCard(card)
							setNotice("Card saved.")
							window.setTimeout(() => setNotice(null), 2500)
							resetEditor()
						}}
						onUpdate={async card => {
							await updateCard(card)
							setNotice("Card updated.")
							window.setTimeout(() => setNotice(null), 2500)
							resetEditor()
						}}
						onPreview={c => setPreviewCard(c)}
					/>

					<CardTester card={previewCard} />
				</main>
			</div>
		</div>
	)
}
