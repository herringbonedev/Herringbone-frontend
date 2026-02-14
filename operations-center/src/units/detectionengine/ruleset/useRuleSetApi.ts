const API_BASE = "http://localhost:7002/detectionengine/ruleset"

function normalizeMongoId<T extends Record<string, any>>(obj: T): T {
	if (obj && typeof obj === "object" && "_id" in obj) {
		const id = (obj as any)._id
		if (typeof id === "object" && id?.$oid) {
			return { ...obj, _id: id.$oid }
		}
	}
	return obj
}

function normalizeMongoDocs<T extends Record<string, any>>(docs: T[]): T[] {
	return docs.map(normalizeMongoId)
}

function authHeaders(): HeadersInit {
	const token = localStorage.getItem("hb_token")

	if (!token) {
		return {}
	}

	return {
		Authorization: `Bearer ${token}`,
	}
}

export function useRuleSetApi() {
	const getRules = async () => {
		const res = await fetch(`${API_BASE}/get_rules`, {
			headers: authHeaders(),
		})

		if (!res.ok) throw new Error(await res.text())

		const data = await res.json()
		return Array.isArray(data) ? normalizeMongoDocs(data) : data
	}

	const insertRule = async (rule: any) => {
		const res = await fetch(`${API_BASE}/insert_rule`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				...authHeaders(),
			},
			body: JSON.stringify(rule),
		})

		if (!res.ok) throw new Error(await res.text())
	}

	const updateRule = async (rule: any) => {
		const normalized = normalizeMongoId(rule)

		if (!normalized._id || typeof normalized._id !== "string") {
			throw new Error("updateRule: missing or invalid _id")
		}

		const res = await fetch(`${API_BASE}/update_rule`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				...authHeaders(),
			},
			body: JSON.stringify(normalized),
		})

		if (!res.ok) throw new Error(await res.text())
	}

	const deleteRule = async (id: string) => {
		const res = await fetch(
			`${API_BASE}/delete_rule?id=${encodeURIComponent(id)}`,
			{
				headers: authHeaders(),
			}
		)

		if (!res.ok) throw new Error(await res.text())
	}

	const importRules = async (rules: any[]) => {
		if (!Array.isArray(rules)) {
			throw new Error("Rule pack must be an array")
		}

		for (const r of rules) {
			if (!r?.rule?.key || !r?.rule?.regex) {
				console.warn("Skipping invalid rule", r)
				continue
			}

			const { _id, ...clean } = r
			await insertRule(clean)
		}
	}

	return {
		getRules,
		insertRule,
		updateRule,
		deleteRule,
		importRules,
	}
}
