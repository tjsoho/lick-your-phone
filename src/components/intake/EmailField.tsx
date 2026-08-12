"use client";

import { useState } from "react";
import type { FieldProps } from "./types";

export default function EmailField({ question, value, onChange }: FieldProps) {
  const [error, setError] = useState("");

  function validate(val: string) {
    if (val && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
      setError("Please enter a valid email address");
    } else {
      setError("");
    }
  }

  return (
    <div className="space-y-2">
      <label className="block font-body text-sm text-lyp-white/80">
        {question.field_label}
        {question.required && <span className="text-lyp-cherry ml-1">*</span>}
      </label>
      <input
        type="email"
        value={(value as string) ?? ""}
        onChange={(e) => {
          onChange(e.target.value);
          if (error) validate(e.target.value);
        }}
        onBlur={(e) => validate(e.target.value)}
        required={question.required}
        className="w-full rounded-lg border border-lyp-white/20 bg-lyp-white/5 px-4 py-3 font-body text-sm text-lyp-white placeholder-lyp-white/30 outline-none transition-colors focus:border-lyp-cherry focus:ring-1 focus:ring-lyp-cherry"
        placeholder="email@example.com"
      />
      {error && <p className="font-body text-xs text-lyp-cherry">{error}</p>}
    </div>
  );
}
