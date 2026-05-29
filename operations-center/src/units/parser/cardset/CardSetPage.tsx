import { useState } from "react"
import type { Card } from "./types"
import { useCardsetApi } from "./useCardsetApi"
import { CardBuilder } from "./CardBuilder"
import { CardTester } from "./CardTester"
import { SavedCards, cardSelectorKey } from "./SavedCards"
import "./cardset.css"

const emptyCard: Card = {
	name: "",
	selector: { type: "raw", value: "" },
}

function keyFor(card: Card): string {
	return cardSelectorKey(card)
}

export default function CardSetPage() {
	const { cards, loading, error, saveCard, updateCard, deleteCard } =
		useCardsetApi()

	const [currentCard, setCurrentCard] = useState<Card>(emptyCard)
	const [previewCard, setPreviewCard] = useState<Card>(emptyCard)
	const [isEditing, setIsEditing] = useState(false)
	const [selectedKey, setSelectedKey] = useState<string | null>(null)

	const handleSelect = (card: Card) => {
		const k = keyFor(card)
		if (selectedKey === k) {
			setSelectedKey(null)
			setCurrentCard(emptyCard)
			setPreviewCard(emptyCard)
			setIsEditing(false)
		} else {
			setSelectedKey(k)
			setCurrentCard(card)
			setPreviewCard(card)
			setIsEditing(true)
		}
	}

	const importParsePack = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0]
		if (!file) return

		try {
			const text = await file.text()
			const parsed = JSON.parse(text)

			if (Array.isArray(parsed)) {
				for (const c of parsed) {
					if (c?.selector) {
						await saveCard(c)
					}
				}
			}

			e.target.value = ""
			setCurrentCard(emptyCard)
			setPreviewCard(emptyCard)
			setIsEditing(false)
			setSelectedKey(null)
		} catch {
			alert("Invalid parse pack")
		}
	}

	return (
		<div className="cardset-page">
			<div className="cardset-panel cardset-left">
				<div className="cardset-left-header">
					<h2>Card Builder</h2>

					<div style={{ display: "flex", gap: "0.5rem" }}>
						<label className="cardset-btn secondary">
							Import Parse Pack
							<input
								type="file"
								accept="application/json"
								onChange={importParsePack}
								style={{ display: "none" }}
							/>
						</label>

						<button
							className="cardset-btn secondary"
							onClick={() => {
								setSelectedKey(null)
								setCurrentCard(emptyCard)
								setPreviewCard(emptyCard)
								setIsEditing(false)
							}}
						>
							New
						</button>
					</div>
				</div>

				<CardBuilder
					card={currentCard}
					isEdit={isEditing}
					onSave={card => {
						saveCard(card)
						setCurrentCard(emptyCard)
						setPreviewCard(emptyCard)
						setIsEditing(false)
						setSelectedKey(null)
					}}
					onUpdate={card => {
						updateCard(card)
						setCurrentCard(emptyCard)
						setPreviewCard(emptyCard)
						setIsEditing(false)
						setSelectedKey(null)
					}}
					onPreview={c => setPreviewCard(c)}
				/>

				<div className="cardset-tester-box">
					<CardTester card={previewCard} />
				</div>
			</div>

			<div className="cardset-panel cardset-right">
				<h2>Saved Cards</h2>

				<div className="cardset-saved-scroll">
					<SavedCards
						cards={cards}
						loading={loading}
						error={error}
						selectedKey={selectedKey}
						onDelete={card => deleteCard(card)}
						onSelect={handleSelect}
					/>
				</div>
			</div>
		</div>
	)
}
