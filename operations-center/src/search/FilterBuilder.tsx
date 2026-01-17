import type { SchemaField } from "./useSearchSchema"

export type FilterRow = {
  field?: string
  kind?: "range" | "in"
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

        const isNumber = field?.types.includes("number")
        const isEnum = field?.types.includes("string") && field.enum?.length

        const canShowValue = !!row.field && (isNumber || isEnum)

        return (
          <div
            key={i}
            style={{
              display: "grid",
              gridTemplateColumns: "120px 1fr 1fr auto auto",
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

            {!canShowValue && (
              <select className="search-select" value="" disabled>
                <option value="">Value…</option>
              </select>
            )}

            {canShowValue && isNumber && (
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

            {canShowValue && isEnum && (
              <select
                className="search-select"
                value={row.values || ""}
                onChange={e =>
                  updateRow(i, {
                    kind: "in",
                    values: e.target.value || null,
                  })
                }
              >
                <option value="">Value…</option>
                {field!.enum.map(v => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            )}

            <button className="link-button" onClick={addRow}>+</button>

            {rows.length > 1 ? (
              <button className="link-button" onClick={() => removeRow(i)}>−</button>
            ) : (
              <span />
            )}
          </div>
        )
      })}
    </div>
  )
}
