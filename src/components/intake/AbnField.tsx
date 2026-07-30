"use client"

import { useState } from "react"
import type { FieldProps } from "./types"

/** ABN check-digit algorithm per Australian Government spec */
function validateAbn(abn: string): boolean {
  const digits = abn.replace(/\s/g, "")
  if (digits.length !== 11 || !/^\d{11}$/.test(digits)) return false

  const weights = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19]
  const nums = digits.split("").map(Number)
  // Subtract 1 from the first digit
  nums[0] = nums[0] - 1
  const sum = nums.reduce((acc, n, i) => acc + n * weights[i], 0)
  return sum % 89 === 0
}

export default function AbnField({ question, value, onChange }: FieldProps) {
  const [error, setError] = useState("")

  function handleBlur() {
    const raw = ((value as string) ?? "").replace(/\s/g, "")
    if (raw && !validateAbn(raw)) {
      setError("Please enter a valid 11-digit ABN")
    } else {
      setError("")
    }
  }

  function formatAbn(input: string): string {
    const digits = input.replace(/\D/g, "").slice(0, 11)
    if (digits.length <= 2) return digits
    if (digits.length <= 5) return `${digits.slice(0, 2)} ${digits.slice(2)}`
    if (digits.length <= 8)
      return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`
    return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`
  }

  return (
    <div className="space-y-2">
      <label className="block font-body text-sm text-lyp-white/80">
        {question.fieldLabel}
        {question.required && <span className="text-lyp-cherry ml-1">*</span>}
      </label>
      <input
        type="text"
        value={(value as string) ?? ""}
        onChange={(e) => {
          onChange(formatAbn(e.target.value))
          if (error) setError("")
        }}
        onBlur={handleBlur}
        required={question.required}
        className="w-full rounded-lg border border-lyp-white/20 bg-lyp-white/5 px-4 py-3 font-body text-sm text-lyp-white placeholder-lyp-white/30 outline-none transition-colors focus:border-lyp-cherry focus:ring-1 focus:ring-lyp-cherry"
        placeholder="XX XXX XXX XXX"
        maxLength={14}
      />
      {error && (
        <p className="font-body text-xs text-lyp-cherry">{error}</p>
      )}
    </div>
  )
}
