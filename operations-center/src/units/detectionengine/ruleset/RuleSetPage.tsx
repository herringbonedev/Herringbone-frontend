import { useEffect, useMemo, useState, type ChangeEvent } from "react"
import { useRuleSetApi } from "./useRuleSetApi"
import { SavedRules, keyForRule } from "./SavedRules"
import { RuleTester } from "./RuleTester"
import { RuleBuilder } from "./RuleBuilder"
import "./ruleset.css"

const emptyRule = {
	name: "",
	description: "",
	severity: 50,
	correlate_on: [],
	rule: {
		key: "",
		regex: "",
	},
}

function ruleId(rule: any): string | null {
	if (!rule) return null
	if (typeof rule._id === "string") return rule._id
	if (typeof rule._id === "object" && rule._id?.$oid) return rule._id.$oid
	return null
}

export default function RuleSetPage() {
	const api = useRuleSetApi()

	const [rules, setRules] = useState<any[]>([])
	const [selected, setSelected] = useState<any | null>(null)
	const [draft, setDraft] = useState<any | null>(emptyRule)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [notice, setNotice] = useState<string | null>(null)

	const load = async () => {
		setLoading(true)
		setError(null)
		try {
			const r = await api.getRules()
			setRules(Array.isArray(r) ? r : [])
		} catch (e) {
			const err = e as Error
			setError(err.message || "Failed to load rules")
		} finally {
			setLoading(false)
		}
	}

	useEffect(() => {
		load()
	}, [])

	const resetEditor = () => {
		setSelected(null)
		setDraft(emptyRule)
	}

	const selectRule = (rule: any) => {
		const key = keyForRule(rule)
		if (selected && keyForRule(selected) === key) {
			resetEditor()
			return
		}
		setSelected(rule)
		setDraft(rule)
	}

	const saveRule = async (r: any) => {
		try {
			if (r?._id) {
				await api.updateRule(r)
				setNotice("Rule updated.")
			} else {
				await api.insertRule(r)
				setNotice("Rule saved.")
			}
			window.setTimeout(() => setNotice(null), 2500)
			resetEditor()
			load()
		} catch (e) {
			const err = e as Error
			alert(err.message || "Save failed")
		}
	}

	const deleteRule = async (id: string) => {
		if (!confirm("Delete this rule?")) return
		try {
			await api.deleteRule(id)

			if (ruleId(selected) === id) {
				resetEditor()
			}

			setNotice("Rule deleted.")
			window.setTimeout(() => setNotice(null), 2500)
			load()
		} catch (e) {
			const err = e as Error
			alert(err.message || "Delete failed")
		}
	}

	const importRulePack = async (e: ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0]
		if (!file) return

		try {
			const text = await file.text()
			const parsed = JSON.parse(text)

			if (!Array.isArray(parsed) || !api.importRules) {
				throw new Error("Rule pack must be a JSON array")
			}

			await api.importRules(parsed)
			await load()
			setNotice(`Imported ${parsed.length} rule${parsed.length === 1 ? "" : "s"}.`)
			window.setTimeout(() => setNotice(null), 3500)
			resetEditor()
		} catch (err: any) {
			alert(err?.message || "Invalid rule pack")
		} finally {
			e.target.value = ""
		}
	}

	const selectedKey = selected ? keyForRule(selected) : null
	const severityAverage = useMemo(() => {
		if (!rules.length) return 0
		const total = rules.reduce((sum, r) => sum + Number(r?.severity || 0), 0)
		return Math.round(total / rules.length)
	}, [rules])

	return (
		<div className="ruleset-app">
			<header className="ruleset-topbar">
				<div className="ruleset-title-block">
					<h1>RuleSet</h1>
					<span>{rules.length} rules · avg severity {severityAverage}</span>
				</div>
				<div className="ruleset-topbar-actions">
					<label className="ruleset-btn secondary">
						Import pack
						<input type="file" accept="application/json" onChange={importRulePack} style={{ display: "none" }} />
					</label>
					<button className="ruleset-btn" onClick={resetEditor}>New rule</button>
				</div>
			</header>

			{notice && <div className="ruleset-notice">{notice}</div>}

			<div className="ruleset-layout">
				<aside className="ruleset-sidebar">
					<SavedRules
						rules={rules}
						loading={loading}
						error={error}
						selectedKey={selectedKey}
						onSelect={selectRule}
						onDelete={deleteRule}
					/>
				</aside>

				<main className="ruleset-main">
					<RuleBuilder
						rule={draft}
						isEdit={Boolean(selected?._id)}
						onChange={setDraft}
						onSave={saveRule}
					/>

					<RuleTester rule={draft} />
				</main>
			</div>
		</div>
	)
}
