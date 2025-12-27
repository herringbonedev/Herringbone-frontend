const API_BASE = "http://localhost:7002/detectionengine/ruleset"

export function useRuleSetApi() {
	const getRules = async () => {
		const r = await fetch(`${API_BASE}/get_rules`)
		return r.json()
	}

	const insertRule = async (rule: any) => {
		const res = await fetch(`${API_BASE}/insert_rule`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(rule),
		})
		if (!res.ok) throw new Error(await res.text())
	}

	const updateRule = async (rule: any) => {
		const res = await fetch(`${API_BASE}/update_rule`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(rule),
		})
		if (!res.ok) throw new Error(await res.text())
	}

	const deleteRule = async (id: string) => {
		const res = await fetch(
			`${API_BASE}/delete_rule?id=${encodeURIComponent(id)}`
		)
		if (!res.ok) throw new Error(await res.text())
	}

	return { getRules, insertRule, updateRule, deleteRule }
}
