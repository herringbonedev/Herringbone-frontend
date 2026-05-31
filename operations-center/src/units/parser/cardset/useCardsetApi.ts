import { useEffect, useState } from "react"
import type { Card } from "./types"
import { apiFetch } from "../../../api"

function stripEmptyObject(value: Record<string, unknown>) {
	return Object.fromEntries(
		Object.entries(value).filter(([, v]) => {
			if (v === undefined || v === null) return false
			if (typeof v === "string" && v.trim() === "") return false
			if (Array.isArray(v) && v.length === 0) return false
			return true
		}),
	)
}

export function useCardsetApi() {
	const [cards, setCards] = useState<Card[]>([])
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const loadCards = async () => {
		setLoading(true)
		setError(null)
		try {
			const res = await apiFetch(`/parser/cardset/pull_all_cards`)
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
		const selector = stripEmptyObject({ ...(card.selector || {}) })
		const metadata = stripEmptyObject({ ...(card.metadata || {}) })

		const payload: any = {
			name: card.name,
			selector,
		}

		if (Object.keys(metadata).length > 0) payload.metadata = metadata
		if (card.regex && card.regex.length > 0) payload.regex = card.regex
		if (card.jsonp && card.jsonp.length > 0) payload.jsonp = card.jsonp
		return payload
	}

	const saveCard = async (card: Card) => {
		const res = await apiFetch(`/parser/cardset/insert_card`, {
			method: "POST",
			body: JSON.stringify(sanitize(card)),
		})
		if (!res.ok) throw new Error(await res.text())
		await loadCards()
	}

	const updateCard = async (card: Card) => {
		const res = await apiFetch(`/parser/cardset/update_card`, {
			method: "POST",
			body: JSON.stringify(sanitize(card)),
		})
		if (!res.ok) throw new Error(await res.text())
		await loadCards()
	}

	const deleteCard = async (card: Card) => {
		const res = await apiFetch(`/parser/cardset/delete_cards`, {
			method: "POST",
			body: JSON.stringify({
				name: card.name,
				selector_type: card.selector.type,
				selector_value: card.selector.value || card.selector.path || card.selector.field || "",
			}),
		})
		if (!res.ok) throw new Error(await res.text())
		await loadCards()
	}

	useEffect(() => {
		loadCards()
	}, [])

	return { cards, loading, error, saveCard, updateCard, deleteCard, loadCards }
}
