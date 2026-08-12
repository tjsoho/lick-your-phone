"use client";

import type { FieldProps } from "./types";

export default function TextareaField({
  question,
  value,
  onChange,
}: FieldProps) {
  return (
    <div className="space-y-2">
      <label className="block font-body text-sm text-lyp-white/80">
        {question.field_label}
        {question.required && <span className="text-lyp-cherry ml-1">*</span>}
      </label>
      <textarea
        value={(value as string) ?? ""}
        onChange={(e) => onChange(e.target.value)}
        required={question.required}
        rows={4}
        className="w-full rounded-lg border border-lyp-white/20 bg-lyp-white/5 px-4 py-3 font-body text-sm text-lyp-white placeholder-lyp-white/30 outline-none transition-colors focus:border-lyp-cherry focus:ring-1 focus:ring-lyp-cherry resize-y"
        placeholder={
          (question.config as Record<string, string>)?.placeholder ?? ""
        }
      />
    </div>
  );
}
