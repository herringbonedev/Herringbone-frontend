import type { SchemaField } from "./useSearchSchema"

export type FilterKind =
  | "range"
  | "in"
  | "not_in"
  | "eq"
  | "ne"
  | "contains"
  | "not_contains"
  | "prefix"
  | "not_prefix"

export type LogicJoin = "and" | "or" | "nand" | "nor" | "xor" | "xnor"

export type FilterRow = {
  field?: string
  kind?: FilterKind
  min?: number | null
  max?: number | null
  values?: string | null
  join?: LogicJoin
  negate?: boolean
}

export type FilterGroup = {
  id: string
  join?: LogicJoin
  rows: FilterRow[]
}

type Props = {
  fields: SchemaField[]
  value: FilterGroup[]
  onChange: (groups: FilterGroup[]) => void
}

const logicOptions: { value: LogicJoin; label: string }[] = [
  { value: "and", label: "AND" },
  { value: "or", label: "OR" },
  { value: "nand", label: "NAND" },
  { value: "nor", label: "NOR" },
  { value: "xor", label: "XOR" },
  { value: "xnor", label: "XNOR" },
]

function newGroup(join: LogicJoin = "and"): FilterGroup {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    join,
    rows: [{}],
  }
}

function hasType(field: SchemaField | undefined, type: string) {
  return !!field?.types?.includes(type)
}

function kindOptions(field: SchemaField | undefined): { value: FilterKind; label: string }[] {
  if (!field) return []

  if (hasType(field, "number")) {
    return [
      { value: "range", label: "between" },
      { value: "eq", label: "equals" },
      { value: "ne", label: "not equals" },
      { value: "in", label: "in" },
      { value: "not_in", label: "not in" },
    ]
  }

  if (hasType(field, "date")) {
    return [
      { value: "eq", label: "equals" },
      { value: "ne", label: "not equals" },
      { value: "in", label: "in" },
      { value: "not_in", label: "not in" },
    ]
  }

  if (hasType(field, "boolean")) {
    return [
      { value: "eq", label: "equals" },
      { value: "ne", label: "not equals" },
      { value: "in", label: "in" },
      { value: "not_in", label: "not in" },
    ]
  }

  return [
    { value: "contains", label: "contains" },
    { value: "not_contains", label: "does not contain" },
    { value: "prefix", label: "starts with" },
    { value: "not_prefix", label: "does not start with" },
    { value: "eq", label: "equals" },
    { value: "ne", label: "not equals" },
    { value: "in", label: "in" },
    { value: "not_in", label: "not in" },
  ]
}

export function FilterBuilder({ fields, value, onChange }: Props) {
  const groups = value.length ? value : [newGroup()]

  function updateGroup(groupIndex: number, patch: Partial<FilterGroup>) {
    const next = [...groups]
    next[groupIndex] = { ...next[groupIndex], ...patch }
    onChange(next)
  }

  function updateRow(groupIndex: number, rowIndex: number, patch: Partial<FilterRow>) {
    const next = [...groups]
    const rows = next[groupIndex].rows.length ? next[groupIndex].rows : [{}]
    next[groupIndex] = {
      ...next[groupIndex],
      rows: rows.map((row, idx) => (idx === rowIndex ? { ...row, ...patch } : row)),
    }
    onChange(next)
  }

  function addRow(groupIndex: number, join: LogicJoin = "and") {
    const next = [...groups]
    const rows = next[groupIndex].rows.length ? next[groupIndex].rows : [{}]
    next[groupIndex] = { ...next[groupIndex], rows: [...rows, { join }] }
    onChange(next)
  }

  function removeRow(groupIndex: number, rowIndex: number) {
    const next = [...groups]
    const rows = next[groupIndex].rows.filter((_, idx) => idx !== rowIndex)
    next[groupIndex] = { ...next[groupIndex], rows: rows.length ? rows : [{}] }
    onChange(next)
  }

  function addGroup(join: LogicJoin = "and") {
    onChange([...groups, newGroup(join)])
  }

  function removeGroup(groupIndex: number) {
    const next = groups.filter((_, idx) => idx !== groupIndex)
    onChange(next.length ? next : [newGroup()])
  }

  return (
    <div className="filter-builder">
      {groups.map((group, groupIndex) => {
        const rows = group.rows.length ? group.rows : [{}]

        return (
          <div className="filter-group" key={group.id || groupIndex}>
            <div className="filter-group-header">
              <div className="group-title-wrap">
                {groupIndex === 0 ? (
                  <span className="group-prefix">WHERE</span>
                ) : (
                  <select
                    className="search-select group-join-select"
                    value={group.join || "and"}
                    onChange={e => updateGroup(groupIndex, { join: e.target.value as LogicJoin })}
                  >
                    {logicOptions.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                )}
                <span className="group-title">Group {groupIndex + 1}</span>
                <span className="group-parens">(</span>
              </div>

              <div className="group-actions">
                {groups.length > 1 && (
                  <button className="link-button danger-link" onClick={() => removeGroup(groupIndex)}>Remove group</button>
                )}
              </div>
            </div>

            {rows.map((row, rowIndex) => {
              const field = fields.find(f => f.path === row.field)
              const options = kindOptions(field)
              const kind = row.kind || options[0]?.value
              const enumValues = Array.isArray(field?.enum) ? field.enum : []
              const showRange = kind === "range" && hasType(field, "number")
              const showValue = !!row.field && !!kind && !showRange
              const enumCompatible = kind !== "contains" && kind !== "not_contains" && kind !== "prefix" && kind !== "not_prefix"

              return (
                <div className="filter-row" key={`${group.id}-${rowIndex}`}>
                  {rowIndex === 0 ? (
                    <span className="row-prefix row-spacer" aria-hidden="true"></span>
                  ) : (
                    <select
                      className="search-select logic-select"
                      value={row.join || "and"}
                      onChange={e => updateRow(groupIndex, rowIndex, { join: e.target.value as LogicJoin })}
                    >
                      {logicOptions.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  )}

                  <select
                    className="search-select not-select"
                    value={row.negate ? "not" : "is"}
                    onChange={e => updateRow(groupIndex, rowIndex, { negate: e.target.value === "not" })}
                  >
                    <option value="is">IS</option>
                    <option value="not">NOT</option>
                  </select>

                  <select
                    className="search-select"
                    value={row.field || ""}
                    onChange={e => updateRow(groupIndex, rowIndex, {
                      field: e.target.value || undefined,
                      kind: undefined,
                      min: null,
                      max: null,
                      values: null,
                    })}
                  >
                    <option value="">Filter…</option>
                    {fields.map(f => (
                      <option key={f.path} value={f.path}>{f.path}</option>
                    ))}
                  </select>

                  <select
                    className="search-select"
                    value={kind || ""}
                    disabled={!row.field}
                    onChange={e => updateRow(groupIndex, rowIndex, {
                      kind: e.target.value as FilterKind,
                      min: null,
                      max: null,
                      values: null,
                    })}
                  >
                    <option value="">Operator…</option>
                    {options.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>

                  {showRange && (
                    <div className="range-inputs">
                      <input
                        className="search-input"
                        placeholder="min"
                        type="number"
                        value={row.min ?? ""}
                        onChange={e => updateRow(groupIndex, rowIndex, {
                          kind: "range",
                          min: e.target.value === "" ? null : Number(e.target.value),
                        })}
                      />
                      <input
                        className="search-input"
                        placeholder="max"
                        type="number"
                        value={row.max ?? ""}
                        onChange={e => updateRow(groupIndex, rowIndex, {
                          kind: "range",
                          max: e.target.value === "" ? null : Number(e.target.value),
                        })}
                      />
                    </div>
                  )}

                  {showValue && enumValues.length > 0 && enumCompatible ? (
                    <select
                      className="search-select"
                      value={row.values || ""}
                      onChange={e => updateRow(groupIndex, rowIndex, { kind, values: e.target.value || null })}
                    >
                      <option value="">Value…</option>
                      {enumValues.map((v: any) => (
                        <option key={String(v)} value={String(v)}>{String(v)}</option>
                      ))}
                    </select>
                  ) : showValue ? (
                    <input
                      className="search-input value-input"
                      placeholder={kind === "in" || kind === "not_in" ? "a,b,c" : "value"}
                      value={row.values || ""}
                      onChange={e => updateRow(groupIndex, rowIndex, { kind, values: e.target.value || null })}
                    />
                  ) : (
                    <select className="search-select" value="" disabled>
                      <option value="">Value…</option>
                    </select>
                  )}

                  <button className="link-button row-icon-button" title="Add condition" onClick={() => addRow(groupIndex, row.join || "and")}>+</button>
                  {rows.length > 1 ? (
                    <button className="link-button row-icon-button" title="Remove condition" onClick={() => removeRow(groupIndex, rowIndex)}>−</button>
                  ) : (
                    <span />
                  )}
                </div>
              )
            })}

            <div className="group-close-paren">)</div>
          </div>
        )
      })}

      <div className="add-group-row">
        <button className="search-button secondary-button" onClick={() => addGroup("and")}>+ New group</button>
      </div>
    </div>
  )
}
