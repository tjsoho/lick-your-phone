"use client";

import { useState } from "react";
import type { FieldProps } from "./types";

interface PhoneValue {
  countryCode: string;
  number: string;
}

export default function PhoneField({ question, value, onChange }: FieldProps) {
  const phoneVal = (value as PhoneValue) ?? { countryCode: "+61", number: "" };
  const [error, setError] = useState("");

  function handleChange(field: keyof PhoneValue, val: string) {
    const next = { ...phoneVal, [field]: val };
    onChange(next);
    if (error) setError("");
  }

  function validate() {
    if (
      phoneVal.number &&
      !/^\d{6,15}$/.test(phoneVal.number.replace(/\s/g, ""))
    ) {
      setError("Please enter a valid phone number");
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
      <div className="flex gap-2">
        <input
          type="text"
          value={phoneVal.countryCode}
          onChange={(e) => handleChange("countryCode", e.target.value)}
          className="w-20 rounded-lg border border-lyp-white/20 bg-lyp-white/5 px-3 py-3 font-body text-sm text-lyp-white outline-none transition-colors focus:border-lyp-cherry focus:ring-1 focus:ring-lyp-cherry text-center"
          placeholder="+61"
        />
        <input
          type="tel"
          value={phoneVal.number}
          onChange={(e) => handleChange("number", e.target.value)}
          onBlur={validate}
          required={question.required}
          className="flex-1 rounded-lg border border-lyp-white/20 bg-lyp-white/5 px-4 py-3 font-body text-sm text-lyp-white placeholder-lyp-white/30 outline-none transition-colors focus:border-lyp-cherry focus:ring-1 focus:ring-lyp-cherry"
          placeholder="0400 000 000"
        />
      </div>
      {error && <p className="font-body text-xs text-lyp-cherry">{error}</p>}
    </div>
  );
}
