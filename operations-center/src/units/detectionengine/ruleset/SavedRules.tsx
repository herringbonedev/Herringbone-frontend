type Props = {
	rules: any[]
	selected: any | null
	onSelect: (r: any) => void
	onDelete: (id: string) => void
}

function getId(r: any): string | null {
	if (!r) return null
	if (typeof r._id === "string") return r._id
	if (typeof r._id === "object" && r._id?.$oid) return r._id.$oid
	return null
}

export function SavedRules({ rules, selected, onSelect, onDelete }: Props) {
	const list = Array.isArray(rules) ? rules : []

	return (
		<div className="ruleset-saved">
			{list.length === 0 && (
				<div style={{ opacity: 0.6 }}>No rules found.</div>
			)}

			{list.map((r, i) => {
				if (!r || !r.rule) return null

				const id = getId(r)
				if (!id) return null

				const selectedId = getId(selected)
				const isSelected = selectedId === id

				return (
					<div
						key={id || i}
						className={`ruleset-saved-item ${isSelected ? "selected" : ""}`}
						onClick={() => onSelect(r)}
					>
						<strong>{r.name || id}</strong>

						{r.severity !== undefined && <div>Severity: {r.severity}</div>}

						<button
							className="ruleset-btn secondary"
							style={{ marginTop: "0.4rem" }}
							onClick={e => {
								e.stopPropagation()
								onDelete(id)
							}}
						>
							Delete
						</button>
					</div>
				)
			})}
		</div>
	)
}
