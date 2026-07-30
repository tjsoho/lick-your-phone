"use client"

import type { FieldProps } from "./types"

export default function RadioField({ question, value, onChange }: FieldProps) {
  const options = (question.options as string[]) ?? []

  return (
    <div className="space-y-2">
      <label className="block font-body text-sm text-lyp-white/80">
        {question.fieldLabel}
        {question.required && <span className="text-lyp-cherry ml-1">*</span>}
      </label>
      <div className="space-y-2">
        {options.map((opt) => (
          <label
            key={opt}
            className="flex cursor-pointer items-center gap-3 rounded-lg border border-lyp-white/10 px-4 py-3 transition-colors hover:border-lyp-white/30 has-[:checked]:border-lyp-cherry has-[:checked]:bg-lyp-cherry/10"
          >
            <input
              type="radio"
              name={`radio-${question.id}`}
              value={opt}
              checked={value === opt}
              onChange={() => onChange(opt)}
              className="h-4 w-4 accent-lyp-cherry"
            />
            <span className="font-body text-sm text-lyp-white">{opt}</span>
          </label>
        ))}
      </div>
    </div>
  )
}
