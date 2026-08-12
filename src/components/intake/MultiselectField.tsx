"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, X } from "lucide-react";
import type { FieldProps } from "./types";

export default function MultiselectField({
  question,
  value,
  onChange,
}: FieldProps) {
  const options = (question.options as string[]) ?? [];
  const selected = (value as string[]) ?? [];
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function toggle(opt: string) {
    if (selected.includes(opt)) {
      onChange(selected.filter((s) => s !== opt));
    } else {
      onChange([...selected, opt]);
    }
  }

  function remove(opt: string) {
    onChange(selected.filter((s) => s !== opt));
  }

  return (
    <div className="space-y-2">
      <label className="block font-body text-sm text-lyp-white/80">
        {question.field_label}
        {question.required && <span className="text-lyp-cherry ml-1">*</span>}
      </label>
      <div ref={ref} className="relative">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex w-full items-center justify-between rounded-lg border border-lyp-white/20 bg-lyp-white/5 px-4 py-3 text-left font-body text-sm text-lyp-white outline-none transition-colors focus:border-lyp-cherry"
        >
          <span className={selected.length === 0 ? "text-lyp-white/30" : ""}>
            {selected.length === 0
              ? "Select options..."
              : `${selected.length} selected`}
          </span>
          <ChevronDown
            className={`h-4 w-4 text-lyp-white/40 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>

        {open && (
          <div className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-lyp-white/20 bg-lyp-black shadow-xl">
            {options.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => toggle(opt)}
                className={`flex w-full items-center gap-2 px-4 py-2.5 text-left font-body text-sm transition-colors hover:bg-lyp-white/10 ${
                  selected.includes(opt) ? "text-lyp-cherry" : "text-lyp-white"
                }`}
              >
                <span
                  className={`flex h-4 w-4 items-center justify-center rounded border ${
                    selected.includes(opt)
                      ? "border-lyp-cherry bg-lyp-cherry text-lyp-white"
                      : "border-lyp-white/30"
                  }`}
                >
                  {selected.includes(opt) && (
                    <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
                      <path
                        d="M2 6l3 3 5-5"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </span>
                {opt}
              </button>
            ))}
          </div>
        )}

        {selected.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {selected.map((s) => (
              <span
                key={s}
                className="flex items-center gap-1 rounded-full bg-lyp-cherry/20 px-3 py-1 font-body text-xs text-lyp-cherry"
              >
                {s}
                <button type="button" onClick={() => remove(s)}>
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
