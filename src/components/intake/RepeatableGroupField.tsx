"use client";

import { Plus, Trash2 } from "lucide-react";
import { useCopy } from "@/components/portal/ProposalContext";
import type { FieldProps } from "./types";

interface SubField {
  key: string;
  label: string;
  type: string;
}

interface GroupConfig {
  subFields: SubField[];
  /**
   * What one entry is called, set per question in the data:
   * `{"entryLabel": "Team member"}` reads "Team member 1", "Team member 2".
   * A `{number}` in the value is replaced in place, so "Location {number}"
   * works too. Left unset, the editable "Entry {number}" wording stands.
   */
  entryLabel?: string;
  /**
   * What the add button says, e.g. `{"addLabel": "Add another location"}`.
   * The button draws its own + icon, so the wording doesn't need one.
   */
  addLabel?: string;
}

/** "Team member" + 2 → "Team member 2"; "Stop {number}" + 2 → "Stop 2". */
function numbered(label: string, number: number): string {
  return label.includes("{number}")
    ? label.replaceAll("{number}", String(number))
    : `${label} ${number}`;
}

export default function RepeatableGroupField({
  question,
  value,
  onChange,
}: FieldProps) {
  const t = useCopy("intake");
  const config = (question.config as unknown as GroupConfig) ?? {
    subFields: [],
  };
  const rows = (value as Record<string, string>[]) ?? [];

  // The question's own wording wins; the copy slot is the fallback for every
  // group that hasn't been given one.
  const entryLabel = config.entryLabel?.trim() || "";
  const addLabel = config.addLabel?.trim() || "";

  function addRow() {
    const empty: Record<string, string> = {};
    for (const f of config.subFields) {
      empty[f.key] = "";
    }
    onChange([...rows, empty]);
  }

  function removeRow(index: number) {
    onChange(rows.filter((_, i) => i !== index));
  }

  function updateField(rowIndex: number, key: string, val: string) {
    const next = rows.map((row, i) =>
      i === rowIndex ? { ...row, [key]: val } : row,
    );
    onChange(next);
  }

  const inputClass =
    "w-full rounded-lg border border-lyp-white/20 bg-lyp-white/5 px-4 py-3 font-body text-sm text-lyp-white placeholder-lyp-white/30 outline-none transition-colors focus:border-lyp-cherry focus:ring-1 focus:ring-lyp-cherry";

  return (
    <div className="space-y-2">
      <label className="block font-body text-sm text-lyp-white/80">
        {question.field_label}
        {question.required && <span className="text-lyp-cherry ml-1">*</span>}
      </label>

      <div className="space-y-4">
        {rows.map((row, i) => (
          <div
            key={i}
            className="rounded-lg border border-lyp-white/10 p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="font-body text-xs text-lyp-white/40">
                {entryLabel
                  ? numbered(entryLabel, i + 1)
                  : t("groupEntryLabel", { number: i + 1 })}
              </span>
              <button
                type="button"
                onClick={() => removeRow(i)}
                className="text-lyp-white/30 hover:text-lyp-cherry transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {config.subFields.map((f) => (
                <div key={f.key}>
                  <label className="mb-1 block font-body text-xs text-lyp-white/50">
                    {f.label}
                  </label>
                  <input
                    type={
                      f.type === "email"
                        ? "email"
                        : f.type === "phone"
                          ? "tel"
                          : "text"
                    }
                    value={row[f.key] ?? ""}
                    onChange={(e) => updateField(i, f.key, e.target.value)}
                    className={inputClass}
                    placeholder={f.label}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={addRow}
          className="flex items-center gap-2 rounded-lg border border-dashed border-lyp-white/20 px-4 py-3 font-body text-sm text-lyp-white/60 transition-colors hover:border-lyp-cherry hover:text-lyp-cherry"
        >
          <Plus className="h-4 w-4" />
          {addLabel || t("groupAddButton")}
        </button>
      </div>
    </div>
  );
}
