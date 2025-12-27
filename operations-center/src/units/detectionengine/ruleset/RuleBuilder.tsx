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

	useEffect(() => {
		if (rule) {
			setName(rule.name || "")
			setSeverity(rule.severity ?? 50)
			setDescription(rule.description || "")
			setKeyField(rule.rule?.key || "")
			setRegex(rule.rule?.regex || "")
		} else {
			setName("")
			setSeverity(50)
			setDescription("")
			setKeyField("")
			setRegex("")
		}
	}, [rule])

	useEffect(() => {
		const draft = {
			...(rule || {}),
			name,
			severity: Number(severity),
			description,
			rule: {
				key: keyField,
				regex,
			},
		}
		onChange(draft)
	}, [name, severity, description, keyField, regex])

	const save = () => {
		const payload: any = {
			...(rule || {}),
			name,
			severity: Number(severity),
			description,
			rule: {
				key: keyField,
				regex,
			},
		}
		onSave(payload)
	}

	return (
		<div className="ruleset-panel">
			<h2>{rule?._id ? "Edit Rule" : "New Rule"}</h2>

			<label>Name</label>
			<input className="ruleset-input" value={name} onChange={e => setName(e.target.value)} />

			<label>Description</label>
			<input className="ruleset-input" value={description} onChange={e => setDescription(e.target.value)} />

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
				placeholder="raw_log"
				value={keyField}
				onChange={e => setKeyField(e.target.value)}
			/>

			<label>Regex</label>
			<input
				className="ruleset-input"
				value={regex}
				onChange={e => setRegex(e.target.value)}
			/>

			<button className="ruleset-btn" style={{ marginTop: "0.75rem" }} onClick={save}>
				{rule?._id ? "Update Rule" : "Save Rule"}
			</button>
		</div>
	)
}
