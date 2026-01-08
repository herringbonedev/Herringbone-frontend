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
		setRules(Array.isArray(r) ? r : [])
	}

	useEffect(() => {
		load()
	}, [])

	useEffect(() => {
		setDraft(selected)
	}, [selected])

	const saveRule = async (r: any) => {
		try {
			if (r?._id) {
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
					? selected._id
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

	const importRulePack = async (
		e: React.ChangeEvent<HTMLInputElement>
	) => {
		const file = e.target.files?.[0]
		if (!file) return

		try {
			const text = await file.text()
			const parsed = JSON.parse(text)
			await api.importRules(parsed)
			await load()
			e.target.value = ""
		} catch {
			alert("Invalid rule pack")
		}
	}

	return (
		<div className="ruleset-page">
			<div
				className="ruleset-panel"
				style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
			>
				<h2>Rule Builder</h2>

				<div style={{ display: "flex", gap: "0.5rem" }}>
					<label className="ruleset-btn secondary">
						Import Rule Pack
						<input
							type="file"
							accept="application/json"
							onChange={importRulePack}
							style={{ display: "none" }}
						/>
					</label>

					<button
						className="ruleset-btn secondary"
						onClick={() => {
							setSelected(null)
							setDraft(null)
						}}
					>
						New
					</button>
				</div>

				<RuleBuilder
					rule={draft}
					onChange={setDraft}
					onSave={saveRule}
				/>

				<textarea
					readOnly
					className="ruleset-input"
					style={{ height: "180px" }}
					value={
						draft
							? JSON.stringify(draft, null, 2)
							: ""
					}
				/>

				<RuleTester rule={draft} />
			</div>

			<div className="ruleset-panel">
				<SavedRules
					rules={rules}
					selected={selected}
					onSelect={setSelected}
					onDelete={deleteRule}
				/>
			</div>
		</div>
	)
}
