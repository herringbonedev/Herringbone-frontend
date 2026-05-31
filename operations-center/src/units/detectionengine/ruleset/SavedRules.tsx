import { useMemo, useState } from "react"

type Props = {
	rules: any[]
	loading: boolean
	error: string | null
	selectedKey: string | null
	onSelect: (r: any) => void
	onDelete: (id: string) => void
}

type SortMode = "name" | "severity_desc" | "severity_asc" | "key"

type Group = {
	key: string
	title: string
	subtitle: string
	rules: any[]
}

function getId(r: any): string {
	if (!r) return ""
	if (typeof r._id === "string") return r._id
	if (typeof r._id === "object" && r._id?.$oid) return r._id.$oid
	return ""
}

export function keyForRule(rule: any): string {
	const id = getId(rule)
	if (id) return `id:${id}`
	if (rule?.name) return `name:${rule.name}`
	return `rule:${ruleSummary(rule)}`
}

function displayName(rule: any): string {
	return rule?.metadata?.label || rule?.name || "Untitled rule"
}

function ruleKey(rule: any): string {
	return rule?.rule?.key || "No field"
}

function ruleRegex(rule: any): string {
	return rule?.rule?.regex || "No regex"
}

function severity(rule: any): number {
	const value = Number(rule?.severity ?? 0)
	return Number.isFinite(value) ? value : 0
}

function severityBand(value: number): string {
	if (value >= 90) return "Critical"
	if (value >= 70) return "High"
	if (value >= 40) return "Medium"
	if (value > 0) return "Low"
	return "Informational"
}

function severityFolder(rule: any): string {
	return rule?.metadata?.folder || `${severityBand(severity(rule))} severity`
}

function correlateCount(rule: any): number {
	return Array.isArray(rule?.correlate_on) ? rule.correlate_on.length : 0
}

function ruleSummary(rule: any): string {
	return `${ruleKey(rule)} matches ${ruleRegex(rule)}`
}

function cleanForExport(rule: any) {
	const payload: any = {
		name: rule?.name,
		description: rule?.description,
		severity: rule?.severity,
		correlate_on: Array.isArray(rule?.correlate_on) ? rule.correlate_on : [],
		rule: rule?.rule || {},
	}
	if (rule?.metadata) payload.metadata = rule.metadata
	return Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined))
}

function exportRules(folder: string, rules: any[]) {
	const clean = rules.map(cleanForExport)
	const blob = new Blob([JSON.stringify(clean, null, 2)], { type: "application/json" })
	const url = URL.createObjectURL(blob)
	const a = document.createElement("a")
	a.href = url
	a.download = `${folder.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "rules"}-rule-pack.json`
	document.body.appendChild(a)
	a.click()
	a.remove()
	URL.revokeObjectURL(url)
}

function sortRules(rules: any[], sort: SortMode): any[] {
	const copy = [...rules]
	return copy.sort((a, b) => {
		if (sort === "severity_desc") return severity(b) - severity(a) || displayName(a).localeCompare(displayName(b))
		if (sort === "severity_asc") return severity(a) - severity(b) || displayName(a).localeCompare(displayName(b))
		if (sort === "key") return ruleKey(a).localeCompare(ruleKey(b)) || displayName(a).localeCompare(displayName(b))
		return displayName(a).localeCompare(displayName(b))
	})
}

function groupRules(rules: any[], sort: SortMode): Group[] {
	const grouped = new Map<string, any[]>()
	for (const rule of rules) {
		const folder = severityFolder(rule)
		grouped.set(folder, [...(grouped.get(folder) || []), rule])
	}

	return [...grouped.entries()]
		.map(([title, items]) => {
			const avgSeverity = items.length
				? Math.round(items.reduce((sum, r) => sum + severity(r), 0) / items.length)
				: 0
			return {
				key: title,
				title,
				subtitle: `${items.length} rule${items.length === 1 ? "" : "s"} · avg severity ${avgSeverity}`,
				rules: sortRules(items, sort),
			}
		})
		.sort((a, b) => a.title.localeCompare(b.title))
}

function matchesQuery(rule: any, q: string): boolean {
	if (!q) return true
	const text = [
		displayName(rule),
		rule?.name,
		rule?.description,
		ruleKey(rule),
		ruleRegex(rule),
		severityFolder(rule),
		...(Array.isArray(rule?.correlate_on) ? rule.correlate_on : []),
	]
		.filter(Boolean)
		.join(" ")
		.toLowerCase()
	return text.includes(q)
}

export function SavedRules({ rules, loading, error, selectedKey, onSelect, onDelete }: Props) {
	const [query, setQuery] = useState("")
	const [sort, setSort] = useState<SortMode>("name")
	const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

	const validRules = useMemo(() => (Array.isArray(rules) ? rules.filter(r => r && r.rule) : []), [rules])
	const filtered = useMemo(() => validRules.filter(rule => matchesQuery(rule, query.trim().toLowerCase())), [validRules, query])
	const groups = useMemo(() => groupRules(filtered, sort), [filtered, sort])

	return (
		<div className="ruleset-saved">
			<div className="ruleset-library-head">
				<div>
					<h2>Rules</h2>
					<p>{validRules.length} rules · {groups.length} folders</p>
				</div>
				{validRules.length > 0 && (
					<button className="ruleset-text-btn" onClick={() => exportRules("all-rules", validRules)}>Export all</button>
				)}
			</div>

			<div className="ruleset-list-controls">
				<input
					className="ruleset-input ruleset-search"
					value={query}
					onChange={e => setQuery(e.target.value)}
					placeholder="Search rules, fields, regex, correlation…"
				/>
				<label className="ruleset-sort-control">
					<span>Sort</span>
					<select className="ruleset-input" value={sort} onChange={e => setSort(e.target.value as SortMode)}>
						<option value="name">Name</option>
						<option value="severity_desc">Highest severity</option>
						<option value="severity_asc">Lowest severity</option>
						<option value="key">Field</option>
					</select>
				</label>
			</div>

			{loading && <div className="ruleset-empty-state">Loading rules…</div>}
			{error && <div className="ruleset-error-state">{error}</div>}
			{!loading && validRules.length === 0 && <div className="ruleset-empty-state">No rules yet. Import a pack or create your first rule.</div>}
			{!loading && validRules.length > 0 && groups.length === 0 && <div className="ruleset-empty-state">No rules match your search.</div>}

			<div className="ruleset-folder-list">
				{groups.map(group => {
					const isCollapsed = Boolean(collapsed[group.key])
					return (
						<section key={group.key} className="ruleset-folder">
							<div className="ruleset-folder-header">
								<div className="ruleset-folder-header-top">
									<button
										className="ruleset-folder-title"
										onClick={() => setCollapsed(c => ({ ...c, [group.key]: !c[group.key] }))}
									>
										<span className="ruleset-folder-caret">{isCollapsed ? "›" : "⌄"}</span>
										<span>
											<strong>{group.title}</strong>
											<small>{group.subtitle}</small>
										</span>
									</button>
									<div className="ruleset-folder-actions">
										<button className="ruleset-text-btn" onClick={() => exportRules(group.title, group.rules)}>Export</button>
									</div>
								</div>
							</div>

							{!isCollapsed && (
								<div className="ruleset-folder-rules">
									{group.rules.map((rule, i) => {
										const id = getId(rule)
										const key = keyForRule(rule)
										const isSelected = selectedKey === key
										return (
											<article
												key={key || i}
												className={`ruleset-saved-item ${isSelected ? "selected" : ""}`}
												onClick={() => onSelect(rule)}
											>
												<div className="ruleset-saved-main">
													<div className="ruleset-rule-title-row">
														<strong>{displayName(rule)}</strong>
														<span>{severityBand(severity(rule))}</span>
													</div>
													<span>{ruleSummary(rule)}</span>
													<div className="ruleset-rule-meta-line">
														<span>severity {severity(rule)}</span>
														<span>{correlateCount(rule)} correlate</span>
													</div>
												</div>
												<div className="ruleset-rule-side">
													<button
														className="ruleset-text-btn danger"
														onClick={e => {
															e.stopPropagation()
															if (id) onDelete(id)
														}}
													>
														Delete
													</button>
												</div>
											</article>
										)
									})}
								</div>
							)}
						</section>
					)
				})}
			</div>
		</div>
	)
}
