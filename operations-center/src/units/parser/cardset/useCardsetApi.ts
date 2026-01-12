import { useEffect, useState } from "react"
import type { Card } from "./types"

const API_BASE = "http://127.0.0.1:7005"

export function useCardsetApi() {
	const [cards, setCards] = useState<Card[]>([])
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const loadCards = async () => {
		setLoading(true)
		setError(null)
		try {
			const res = await fetch(`${API_BASE}/parser/cardset/pull_all_cards`)
			if (!res.ok) throw new Error(`HTTP ${res.status}`)
			const data = await res.json()
			if (data?.ok && Array.isArray(data.cards)) {
				setCards(data.cards)
			} else {
				setCards([])
			}
		} catch (e: any) {
			setError(e.message || "Failed to load cards")
		} finally {
			setLoading(false)
		}
	}

	const sanitize = (card: Card) => {
		const payload: any = {
			name: card.name,
			selector: card.selector,
		}
		if (card.regex && card.regex.length > 0) payload.regex = card.regex
		if (card.jsonp && card.jsonp.length > 0) payload.jsonp = card.jsonp
		return payload
	}

	const saveCard = async (card: Card) => {
		const payload = sanitize(card)
		await fetch(`${API_BASE}/parser/cardset/insert_card`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(payload),
		})
		await loadCards()
	}

	const updateCard = async (card: Card) => {
		const payload = sanitize(card)
		await fetch(`${API_BASE}/parser/cardset/update_card`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(payload),
		})
		await loadCards()
	}

	const deleteCard = async (card: Card) => {
		const payload = {
			selector_type: card.selector.type,
			selector_value: card.selector.value,
		}
		await fetch(`${API_BASE}/parser/cardset/delete_cards`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(payload),
		})
		await loadCards()
	}

	useEffect(() => {
		loadCards()
	}, [])

	return { cards, loading, error, saveCard, updateCard, deleteCard }
}