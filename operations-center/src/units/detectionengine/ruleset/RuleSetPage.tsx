import { useEffect, useState } from "react"
import { useRuleSetApi } from "./useRuleSetApi"
import { SavedRules } from "./SavedRules"
import { RuleTester } from "./RuleTester"
import { RuleBuilder } from "./RuleBuilder"
import "./ruleset.css"

export default function RuleSetPage() {
	const api = useRuleSetApi()
	const [rules, setRules] = useState<any[]>([])
	const [selected, setSelected] = useState<any | null>(null)
	const [draft, setDraft] = useState<any | null>(null)

	const load = async () => {
		const r = await api.getRules()
		setRules(r || [])
	}

	useEffect(() => {
		load()
	}, [])

	useEffect(() => {
		setDraft(selected)
	}, [selected])

	const saveRule = async (r: any) => {
		try {
			if (r._id) {
				await api.updateRule(r)
			} else {
				await api.insertRule(r)
			}
			setSelected(null)
			setDraft(null)
			load()
		} catch (e: any) {
			alert(e.message || "Save failed")
		}
	}

	const deleteRule = async (id: string) => {
		if (!confirm("Delete this rule?")) return
		try {
			await api.deleteRule(id)

			const selId =
				typeof selected?._id === "string"
					? selected?._id
					: selected?._id?.$oid

			if (selId === id) {
				setSelected(null)
				setDraft(null)
			}
			load()
		} catch (e: any) {
			alert(e.message || "Delete failed")
		}
	}

	return (
		<div className="ruleset-page">
			<div style={{ flex: 1 }}>
				<SavedRules
					rules={rules}
					selected={selected}
					onSelect={setSelected}
					onDelete={deleteRule}
				/>
			</div>

			<div
				style={{
					flex: 1,
					display: "flex",
					flexDirection: "column",
					gap: "1rem",
				}}
			>
				<RuleBuilder
					rule={draft}
					onChange={setDraft}
					onSave={saveRule}
				/>
				<RuleTester rule={draft} />
			</div>
		</div>
	)
}
