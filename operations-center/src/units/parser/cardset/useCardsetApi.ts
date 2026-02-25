import { useEffect, useState } from "react"
import type { Card } from "./types"

export function useCardsetApi() {
	const [cards, setCards] = useState<Card[]>([])
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const getAuthHeaders = () => {
	const token = localStorage.getItem("hb_token")

	if (!token) {
		console.error("No auth token in localStorage")
		throw new Error("Not authenticated")
	}

		return {
			"Content-Type": "application/json",
			"Authorization": `Bearer ${token}`,
		}
	}

	const loadCards = async () => {
		setLoading(true)
		setError(null)
		try {
			const res = await fetch(`/parser/cardset/pull_all_cards`, {
				headers: getAuthHeaders(),
			})

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

		await fetch(`/parser/cardset/insert_card`, {
			method: "POST",
			headers: getAuthHeaders(),
			body: JSON.stringify(payload),
		})

		await loadCards()
	}

	const updateCard = async (card: Card) => {
		const payload = sanitize(card)

		await fetch(`/parser/cardset/update_card`, {
			method: "POST",
			headers: getAuthHeaders(),
			body: JSON.stringify(payload),
		})

		await loadCards()
	}

	const deleteCard = async (card: Card) => {
		const payload = {
			selector_type: card.selector.type,
			selector_value: card.selector.value,
		}

		await fetch(`/parser/cardset/delete_cards`, {
			method: "POST",
			headers: getAuthHeaders(),
			body: JSON.stringify(payload),
		})

		await loadCards()
	}

	useEffect(() => {
		loadCards()
	}, [])

	return { cards, loading, error, saveCard, updateCard, deleteCard }
}
