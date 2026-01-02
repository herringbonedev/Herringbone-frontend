import { useState } from "react"
import type { Card } from "./types"
import { useCardsetApi } from "./useCardsetApi"
import { CardBuilder } from "./CardBuilder"
import { CardTester } from "./CardTester"
import { SavedCards } from "./SavedCards"
import "./cardset.css"

const emptyCard: Card = {
	name: "",
	selector: { type: "raw", value: "" },
}

function keyFor(card: Card): string {
	return `${card.selector.type}:${card.selector.value}`
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

	return (
		<div>
			<div className="cardset-page">
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

				<CardTester card={previewCard} />
			</div>

			<div
				className="cardset-panel"
				style={{ margin: "0 1rem 1rem 1rem" }}
			>
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
	)
}
