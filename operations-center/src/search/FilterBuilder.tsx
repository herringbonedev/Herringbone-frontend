import type { SchemaField } from "./useSearchSchema"

export type FilterKind = "range" | "in" | "eq" | "contains" | "prefix"

export type FilterRow = {
  field?: string
  kind?: FilterKind
  min?: number | null
  max?: number | null
  values?: string | null
  join?: "and" | "or"
}

type Props = {
  fields: SchemaField[]
  value: FilterRow[]
  onChange: (rows: FilterRow[]) => void
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
      { value: "in", label: "in" },
    ]
  }

  if (hasType(field, "date")) {
    return [
      { value: "eq", label: "equals" },
      { value: "in", label: "in" },
    ]
  }

  if (hasType(field, "boolean")) {
    return [
      { value: "eq", label: "equals" },
      { value: "in", label: "in" },
    ]
  }

  return [
    { value: "contains", label: "contains" },
    { value: "prefix", label: "starts with" },
    { value: "eq", label: "equals" },
    { value: "in", label: "in" },
  ]
}

export function FilterBuilder({ fields, value, onChange }: Props) {
  const rows = value.length ? value : [{}]

  function updateRow(i: number, patch: Partial<FilterRow>) {
    const next = [...rows]
    next[i] = { ...next[i], ...patch }
    onChange(next)
  }

  function addRow() {
    onChange([...rows, { join: "and" }])
  }

  function removeRow(i: number) {
    const next = rows.filter((_, idx) => idx !== i)
    onChange(next.length ? next : [{}])
  }

  return (
    <div className="filter-builder">
      {rows.map((row, i) => {
        const field = fields.find(f => f.path === row.field)
        const options = kindOptions(field)
        const kind = row.kind || options[0]?.value
        const enumValues = Array.isArray(field?.enum) ? field.enum : []
        const showRange = kind === "range" && hasType(field, "number")
        const showValue = !!row.field && !!kind && !showRange

        return (
          <div
            key={i}
            style={{
              display: "grid",
              gridTemplateColumns: "120px minmax(220px, 1.4fr) minmax(130px, 0.8fr) minmax(220px, 1.2fr) auto auto",
              gap: 8,
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            {i === 0 ? (
              <select className="search-select" value="where" disabled>
                <option value="where">WHERE</option>
              </select>
            ) : (
              <select
                className="search-select"
                value={row.join || "and"}
                onChange={e =>
                  updateRow(i, { join: e.target.value as "and" | "or" })
                }
              >
                <option value="and">AND</option>
                <option value="or">OR</option>
              </select>
            )}

            <select
              className="search-select"
              value={row.field || ""}
              onChange={e =>
                updateRow(i, {
                  field: e.target.value || undefined,
                  kind: undefined,
                  min: null,
                  max: null,
                  values: null,
                })
              }
            >
              <option value="">Filter…</option>
              {fields.map(f => (
                <option key={f.path} value={f.path}>
                  {f.path}
                </option>
              ))}
            </select>

            <select
              className="search-select"
              value={kind || ""}
              disabled={!row.field}
              onChange={e =>
                updateRow(i, {
                  kind: e.target.value as FilterKind,
                  min: null,
                  max: null,
                  values: null,
                })
              }
            >
              <option value="">Operator…</option>
              {options.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>

            {showRange && (
              <div style={{ display: "flex", gap: 6 }}>
                <input
                  className="search-input"
                  placeholder="min"
                  type="number"
                  value={row.min ?? ""}
                  onChange={e =>
                    updateRow(i, {
                      kind: "range",
                      min: e.target.value === "" ? null : Number(e.target.value),
                    })
                  }
                />
                <input
                  className="search-input"
                  placeholder="max"
                  type="number"
                  value={row.max ?? ""}
                  onChange={e =>
                    updateRow(i, {
                      kind: "range",
                      max: e.target.value === "" ? null : Number(e.target.value),
                    })
                  }
                />
              </div>
            )}

            {showValue && enumValues.length > 0 && kind !== "contains" && kind !== "prefix" ? (
              <select
                className="search-select"
                value={row.values || ""}
                onChange={e =>
                  updateRow(i, {
                    kind,
                    values: e.target.value || null,
                  })
                }
              >
                <option value="">Value…</option>
                {enumValues.map((v: any) => (
                  <option key={String(v)} value={String(v)}>
                    {String(v)}
                  </option>
                ))}
              </select>
            ) : showValue ? (
              <input
                className="search-input"
                placeholder={kind === "in" ? "a,b,c" : "value"}
                value={row.values || ""}
                onChange={e =>
                  updateRow(i, {
                    kind,
                    values: e.target.value || null,
                  })
                }
              />
            ) : (
              <select className="search-select" value="" disabled>
                <option value="">Value…</option>
              </select>
            )}

            <button className="link-button" onClick={addRow}>
              +
            </button>

            {rows.length > 1 ? (
              <button className="link-button" onClick={() => removeRow(i)}>
                −
              </button>
            ) : (
              <span />
            )}
          </div>
        )
      })}
    </div>
  )
}
