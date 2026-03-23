import { apiFetch } from "../../../api"

export function useRuleSetApi() {
	const getRules = async () => {
		const res = await apiFetch(`/detectionengine/ruleset/get_rules`)
		if (!res.ok) throw new Error(await res.text())
		return res.json()
	}

	const insertRule = async (rule: any) => {
		const res = await apiFetch(`/detectionengine/ruleset/insert_rule`, {
			method: "POST",
			body: JSON.stringify(rule),
		})
		if (!res.ok) throw new Error(await res.text())
	}

	const updateRule = async (rule: any) => {
		const res = await apiFetch(`/detectionengine/ruleset/update_rule`, {
			method: "POST",
			body: JSON.stringify(rule),
		})
		if (!res.ok) throw new Error(await res.text())
	}

	const deleteRule = async (id: string) => {
		const res = await apiFetch(`/detectionengine/ruleset/delete_rule?id=${encodeURIComponent(id)}`)
		if (!res.ok) throw new Error(await res.text())
	}

	return { getRules, insertRule, updateRule, deleteRule }
}
