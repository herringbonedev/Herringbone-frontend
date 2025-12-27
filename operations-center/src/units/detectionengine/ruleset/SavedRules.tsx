type Props = {
	rules: any[]
	selected: any | null
	onSelect: (r: any) => void
	onDelete: (id: string) => void
}

export function SavedRules({
	rules,
	selected,
	onSelect,
	onDelete,
}: Props) {
	return (
		<div className="ruleset-panel">
			<h2>Saved Rules</h2>

			<div className="ruleset-saved">
				{rules.map(r => {
					const id =
						typeof r._id === "string"
							? r._id
							: r._id?.$oid

					return (
						<div
							key={id}
							className={`ruleset-saved-item ${
								selected?._id === r._id ||
								selected?._id?.$oid === id
									? "selected"
									: ""
							}`}
							onClick={() => onSelect(r)}
						>
							<strong>{r.name || id}</strong>
							{r.severity !== undefined && (
								<div>Severity: {r.severity}</div>
							)}

							<button
								className="ruleset-btn secondary"
								style={{ marginTop: "0.4rem" }}
								onClick={e => {
									e.stopPropagation()
									if (id) onDelete(id)
									else alert("Invalid rule id")
								}}
							>
								Delete
							</button>
						</div>
					)
				})}
			</div>
		</div>
	)
}
