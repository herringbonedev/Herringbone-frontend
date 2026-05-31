import { useEffect, useMemo, useRef, useState } from "react"

type Props = {
	rule: any | null
	isEdit: boolean
	onChange: (r: any) => void
	onSave: (r: any) => void
}

type BuilderTab = "details" | "condition" | "correlation"

function toCorrelateList(value: any): string[] {
	return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string" && v.trim() !== "") : []
}

function buildRulePayload(rule: any, state: {
	name: string
	description: string
	severity: number
	keyField: string
	regex: string
	correlateOn: string[]
}) {
	return {
		...(rule || {}),
		name: state.name.trim(),
		severity: Number(state.severity),
		description: state.description.trim(),
		correlate_on: state.correlateOn,
		rule: {
			key: state.keyField.trim(),
			regex: state.regex.trim(),
		},
	}
}

function severityLabel(value: number) {
	if (value >= 90) return "Critical"
	if (value >= 70) return "High"
	if (value >= 40) return "Medium"
	if (value > 0) return "Low"
	return "Informational"
}

function ruleIdentity(rule: any | null) {
	if (!rule) return "new"
	const id = typeof rule._id === "string" ? rule._id : rule._id?.$oid
	return id ? `id:${id}` : "new"
}

export function RuleBuilder({ rule, isEdit, onChange, onSave }: Props) {
	const [name, setName] = useState("")
	const [severity, setSeverity] = useState(50)
	const [description, setDescription] = useState("")
	const [keyField, setKeyField] = useState("")
	const [regex, setRegex] = useState("")
	const [correlateOn, setCorrelateOn] = useState<string[]>([])
	const [newField, setNewField] = useState("")
	const [activeTab, setActiveTab] = useState<BuilderTab>("details")
	const [baseRule, setBaseRule] = useState<any | null>(rule || null)
	const lastLoadedIdentity = useRef<string>("")

	useEffect(() => {
		const identity = ruleIdentity(rule)
		if (lastLoadedIdentity.current === identity) return

		lastLoadedIdentity.current = identity
		setBaseRule(rule || null)

		if (rule && identity !== "new") {
			setName(rule.name || "")
			setSeverity(rule.severity ?? 50)
			setDescription(rule.description || "")
			setKeyField(rule.rule?.key || "")
			setRegex(rule.rule?.regex || "")
			setCorrelateOn(toCorrelateList(rule.correlate_on))
		} else {
			setName("")
			setSeverity(50)
			setDescription("")
			setKeyField("")
			setRegex("")
			setCorrelateOn([])
		}
	}, [rule])

	const built = useMemo(() => buildRulePayload(baseRule, {
		name,
		description,
		severity,
		keyField,
		regex,
		correlateOn,
	}), [baseRule, name, description, severity, keyField, regex, correlateOn])

	useEffect(() => {
		onChange(built)
	}, [built, onChange])

	const addField = () => {
		const v = newField.trim()
		if (!v || correlateOn.includes(v)) return
		setCorrelateOn([...correlateOn, v])
		setNewField("")
	}

	const removeField = (f: string) => {
		setCorrelateOn(correlateOn.filter(x => x !== f))
	}

	const canSave = Boolean(name.trim()) && Boolean(keyField.trim()) && Boolean(regex.trim())
	const tabs: { id: BuilderTab; label: string }[] = [
		{ id: "details", label: "Rule details" },
		{ id: "condition", label: "Match condition" },
		{ id: "correlation", label: "Correlation" },
	]
	const activeIndex = tabs.findIndex(t => t.id === activeTab)

	return (
		<section className="ruleset-builder">
			<div className="ruleset-builder-head">
				<div>
					<h2>{isEdit ? "Edit rule" : "New rule"}</h2>
					<p>Define the field, match pattern, severity, and correlation keys.</p>
				</div>
				<button className="ruleset-btn ruleset-save" disabled={!canSave} onClick={() => onSave(built)}>
					{isEdit ? "Update rule" : "Save rule"}
				</button>
			</div>

			<div className="ruleset-builder-tabs" role="tablist" aria-label="Rule builder steps">
				{tabs.map(tab => (
					<button
						key={tab.id}
						className={`ruleset-builder-tab ${activeTab === tab.id ? "active" : ""}`}
						onClick={() => setActiveTab(tab.id)}
						type="button"
					>
						{tab.label}
					</button>
				))}
			</div>

			{activeTab === "details" && (
				<div className="ruleset-section">
					<div className="ruleset-section-title">
						<h3>Rule details</h3>
						<p>Name the rule and set the analyst-facing severity.</p>
					</div>
					<div className="ruleset-form-grid two">
						<label className="ruleset-field wide">
							<span>Name</span>
							<input className="ruleset-input" value={name} onChange={e => setName(e.target.value)} placeholder="Cloudflare WAF block" />
						</label>
						<label className="ruleset-field wide">
							<span>Description</span>
							<input className="ruleset-input" value={description} onChange={e => setDescription(e.target.value)} placeholder="Detect blocked Cloudflare WAF requests" />
						</label>
						<label className="ruleset-field">
							<span>Severity</span>
							<input type="number" min={0} max={100} className="ruleset-input" value={severity} onChange={e => setSeverity(Number(e.target.value))} />
						</label>
						<div className="ruleset-severity-preview">
							<span>{severityLabel(severity)}</span>
							<small>{severity}/100</small>
						</div>
					</div>
				</div>
			)}

			{activeTab === "condition" && (
				<div className="ruleset-section">
					<div className="ruleset-section-title">
						<h3>Match condition</h3>
						<p>Choose the parsed field and regex that should trigger this rule.</p>
					</div>
					<div className="ruleset-match-box">
						<div className="ruleset-form-grid match">
							<label className="ruleset-field wide">
								<span>Field</span>
								<input className="ruleset-input" placeholder="parsed.waf_action" value={keyField} onChange={e => setKeyField(e.target.value)} />
							</label>
							<label className="ruleset-field wide">
								<span>Regex</span>
								<input className="ruleset-input" placeholder="(?i)block|deny|challenge" value={regex} onChange={e => setRegex(e.target.value)} />
							</label>
						</div>
						<div className="ruleset-sentence">
							Run this rule when <strong>{keyField || "parsed.field"}</strong> matches <strong>{regex || "regex"}</strong>.
						</div>
					</div>
				</div>
			)}

			{activeTab === "correlation" && (
				<div className="ruleset-section">
					<div className="ruleset-section-title">
						<h3>Correlation fields</h3>
						<p>Add fields that help group, pivot, or correlate matching events.</p>
					</div>
					<div className="ruleset-kv-row">
						<input
							className="ruleset-input"
							placeholder="parsed.client_ip"
							value={newField}
							onChange={e => setNewField(e.target.value)}
							onKeyDown={e => e.key === "Enter" && addField()}
						/>
						<button className="ruleset-btn secondary" type="button" onClick={addField}>Add field</button>
					</div>

					{correlateOn.length === 0 ? (
						<div className="ruleset-empty-mini">No correlation fields yet.</div>
					) : (
						<div className="ruleset-tag-row">
							{correlateOn.map(f => (
								<span key={f} className="ruleset-chip" onClick={() => removeField(f)}>{f}</span>
							))}
						</div>
					)}

					<details className="ruleset-details">
						<summary>Rule JSON preview</summary>
						<textarea readOnly className="ruleset-input ruleset-json-preview" value={JSON.stringify(built, null, 2)} />
					</details>
				</div>
			)}

			<div className="ruleset-builder-step-actions">
				<button className="ruleset-btn secondary small" disabled={activeIndex <= 0} onClick={() => setActiveTab(tabs[Math.max(0, activeIndex - 1)].id)}>Back</button>
				<button className="ruleset-btn secondary small" disabled={activeIndex >= tabs.length - 1} onClick={() => setActiveTab(tabs[Math.min(tabs.length - 1, activeIndex + 1)].id)}>Next</button>
			</div>
		</section>
	)
}
