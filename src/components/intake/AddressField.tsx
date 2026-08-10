"use client";

import type { FieldProps } from "./types";

interface AddressValue {
  street: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
}

const AU_STATES = ["ACT", "NSW", "NT", "QLD", "SA", "TAS", "VIC", "WA"];

export default function AddressField({
  question,
  value,
  onChange,
}: FieldProps) {
  const addr: AddressValue = (value as AddressValue) ?? {
    street: "",
    city: "",
    state: "",
    postcode: "",
    country: "Australia",
  };

  function handleChange(field: keyof AddressValue, val: string) {
    onChange({ ...addr, [field]: val });
  }

  const inputClass =
    "w-full rounded-lg border border-lyp-white/20 bg-lyp-white/5 px-4 py-3 font-body text-sm text-lyp-white placeholder-lyp-white/30 outline-none transition-colors focus:border-lyp-cherry focus:ring-1 focus:ring-lyp-cherry";

  return (
    <div className="space-y-2">
      <label className="block font-body text-sm text-lyp-white/80">
        {question.fieldLabel}
        {question.required && <span className="text-lyp-cherry ml-1">*</span>}
      </label>
      <div className="space-y-3">
        <input
          type="text"
          value={addr.street}
          onChange={(e) => handleChange("street", e.target.value)}
          className={inputClass}
          placeholder="Street address"
          required={question.required}
        />
        <div className="grid grid-cols-2 gap-3">
          <input
            type="text"
            value={addr.city}
            onChange={(e) => handleChange("city", e.target.value)}
            className={inputClass}
            placeholder="City / Suburb"
          />
          <select
            value={addr.state}
            onChange={(e) => handleChange("state", e.target.value)}
            className={inputClass}
          >
            <option className="text-black" value="">
              State
            </option>
            {AU_STATES.map((s) => (
              <option className="text-black" key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <input
            type="text"
            value={addr.postcode}
            onChange={(e) => handleChange("postcode", e.target.value)}
            className={inputClass}
            placeholder="Postcode"
            maxLength={4}
          />
          <input
            type="text"
            value={addr.country}
            onChange={(e) => handleChange("country", e.target.value)}
            className={inputClass}
            placeholder="Country"
          />
        </div>
      </div>
    </div>
  );
}
