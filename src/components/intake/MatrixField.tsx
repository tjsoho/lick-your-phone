"use client"

import type { FieldProps } from "./types"

interface MatrixConfig {
  rows: string[]
  columns: string[]
}

export default function MatrixField({ question, value, onChange }: FieldProps) {
  const config = (question.config as MatrixConfig) ?? { rows: [], columns: [] }
  const matrix = (value as Record<string, Record<string, string>>) ?? {}

  function handleChange(row: string, col: string, val: string) {
    const next = {
      ...matrix,
      [row]: {
        ...(matrix[row] ?? {}),
        [col]: val,
      },
    }
    onChange(next)
  }

  return (
    <div className="space-y-2">
      <label className="block font-body text-sm text-lyp-white/80">
        {question.fieldLabel}
        {question.required && <span className="text-lyp-cherry ml-1">*</span>}
      </label>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="p-2 text-left font-body text-xs text-lyp-white/50" />
              {config.columns.map((col) => (
                <th
                  key={col}
                  className="p-2 text-left font-body text-xs text-lyp-white/50 font-normal"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {config.rows.map((row) => (
              <tr key={row} className="border-t border-lyp-white/10">
                <td className="p-2 font-body text-sm text-lyp-white whitespace-nowrap">
                  {row}
                </td>
                {config.columns.map((col) => (
                  <td key={col} className="p-2">
                    <input
                      type="text"
                      value={matrix[row]?.[col] ?? ""}
                      onChange={(e) =>
                        handleChange(row, col, e.target.value)
                      }
                      className="w-full min-w-[100px] rounded border border-lyp-white/20 bg-lyp-white/5 px-3 py-2 font-body text-sm text-lyp-white placeholder-lyp-white/30 outline-none focus:border-lyp-cherry"
                      placeholder="—"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
