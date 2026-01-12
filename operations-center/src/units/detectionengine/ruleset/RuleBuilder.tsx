import { useEffect, useState } from "react"

type Props = {
	rule: any | null
	onChange: (r: any) => void
	onSave: (r: any) => void
}

export function RuleBuilder({ rule, onChange, onSave }: Props) {
	const [name, setName] = useState("")
	const [severity, setSeverity] = useState(50)
	const [description, setDescription] = useState("")
	const [keyField, setKeyField] = useState("")
	const [regex, setRegex] = useState("")
	const [correlateOn, setCorrelateOn] = useState<string[]>([])
	const [newField, setNewField] = useState("")

	useEffect(() => {
		if (rule) {
			setName(rule.name || "")
			setSeverity(rule.severity ?? 50)
			setDescription(rule.description || "")
			setKeyField(rule.rule?.key || "")
			setRegex(rule.rule?.regex || "")
			setCorrelateOn(Array.isArray(rule.correlate_on) ? rule.correlate_on : [])
		} else {
			setName("")
			setSeverity(50)
			setDescription("")
			setKeyField("")
			setRegex("")
			setCorrelateOn([])
		}
	}, [rule])

	useEffect(() => {
		const draft = {
			...(rule || {}),
			name,
			severity: Number(severity),
			description,
			correlate_on: correlateOn,
			rule: {
				key: keyField,
				regex,
			},
		}
		onChange(draft)
	}, [name, severity, description, keyField, regex, correlateOn])

	const addField = () => {
		const v = newField.trim()
		if (!v) return
		if (correlateOn.includes(v)) return
		setCorrelateOn([...correlateOn, v])
		setNewField("")
	}

	const removeField = (f: string) => {
		setCorrelateOn(correlateOn.filter(x => x !== f))
	}

	const save = () => {
		const payload = {
			...(rule || {}),
			name,
			severity: Number(severity),
			description,
			correlate_on: correlateOn,
			rule: {
				key: keyField,
				regex,
			},
		}
		onSave(payload)
	}

	return (
		<div>
			<h3>{rule?._id ? "Edit Rule" : "New Rule"}</h3>

			<label>Name</label>
			<input
				className="ruleset-input"
				value={name}
				onChange={e => setName(e.target.value)}
			/>

			<label>Description</label>
			<input
				className="ruleset-input"
				value={description}
				onChange={e => setDescription(e.target.value)}
			/>

			<label>Severity (0–100)</label>
			<input
				type="number"
				min={0}
				max={100}
				className="ruleset-input"
				value={severity}
				onChange={e => setSeverity(Number(e.target.value))}
			/>

			<label>Key (field)</label>
			<input
				className="ruleset-input"
				placeholder="parsed.auth_result"
				value={keyField}
				onChange={e => setKeyField(e.target.value)}
			/>

			<label>Regex</label>
			<input
				className="ruleset-input"
				value={regex}
				onChange={e => setRegex(e.target.value)}
			/>

			<label>Correlate On</label>

			<div style={{ display: "flex", gap: "0.5rem" }}>
				<input
					className="ruleset-input"
					placeholder="parsed.source_ip"
					value={newField}
					onChange={e => setNewField(e.target.value)}
					onKeyDown={e => e.key === "Enter" && addField()}
				/>
				<button className="ruleset-btn secondary" onClick={addField}>
					Add
				</button>
			</div>

			<div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
				{correlateOn.map(f => (
					<span key={f} className="ruleset-chip" onClick={() => removeField(f)}>
						{f}
					</span>
				))}
			</div>

			<button className="ruleset-btn" style={{ marginTop: "0.75rem" }} onClick={save}>
				{rule?._id ? "Update Rule" : "Save Rule"}
			</button>
		</div>
	)
}
