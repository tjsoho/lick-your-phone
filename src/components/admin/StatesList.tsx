"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createState } from "@/server-actions/states";
import { Plus, MapPin, Check, X } from "lucide-react";
import toast from "react-hot-toast";

const EASE = "ease-brand";

const thClasses =
  "whitespace-nowrap px-5 py-3 text-left font-body text-[9px] font-medium uppercase tracking-[0.2em] text-[#A89898]";

const labelClasses =
  "mb-2 block font-body text-[10px] font-medium uppercase tracking-[0.22em] text-[#A89898]";

interface State {
  id: string;
  code: string;
  name: string;
  created_at: string;
}

interface Props {
  states: State[];
}

export default function StatesList({ states }: Props) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!code.trim() || !name.trim()) {
      toast.error("Code and name are required");
      return;
    }
    setSaving(true);
    const { error } = await createState({
      code: code.toUpperCase().trim(),
      name: name.trim(),
    });
    setSaving(false);
    if (error) {
      toast.error(error);
    } else {
      toast.success("State added");
      setShowForm(false);
      setCode("");
      setName("");
      router.refresh();
    }
  };

  const inputClass = `w-full rounded-2xl border border-[#EFE6E6] bg-[#FBF8F8] px-4 py-2.5 font-body text-[13px] text-lyp-black outline-none transition-all duration-500 ${EASE} placeholder:text-[#C3B5B5] focus:border-lyp-cherry/30 focus:bg-lyp-white focus:shadow-[0_0_0_4px_rgba(178,38,38,0.07)]`;

  return (
    <div>
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className={`group mb-4 inline-flex items-center gap-3 rounded-full bg-lyp-cherry py-1.5 pl-6 pr-1.5 font-body text-[13px] font-semibold tracking-wide text-lyp-white shadow-[0_10px_30px_-10px_rgba(178,38,38,0.5)] transition-all duration-500 ${EASE} hover:bg-[#c22e2e] active:scale-[0.985]`}
        >
          Add State
          <span
            className={`flex h-8 w-8 items-center justify-center rounded-full bg-lyp-white/15 transition-transform duration-500 ${EASE} group-hover:scale-105`}
          >
            <Plus strokeWidth={1.5} aria-hidden="true" className="h-4 w-4" />
          </span>
        </button>
      )}

      {showForm && (
        <div className="mb-4 rounded-3xl border border-[#EFE6E6] bg-lyp-white p-6">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <label htmlFor="state-code" className={labelClasses}>
                Code
              </label>
              <input
                id="state-code"
                className={inputClass}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. QLD"
                maxLength={5}
              />
            </div>
            <div>
              <label htmlFor="state-name" className={labelClasses}>
                Name
              </label>
              <input
                id="state-name"
                className={inputClass}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Queensland"
              />
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-2.5 border-t border-[#F1E8E8] pt-5">
            <button
              onClick={handleCreate}
              disabled={saving}
              className={`group inline-flex items-center gap-3 rounded-full bg-lyp-cherry py-1.5 pl-6 pr-1.5 font-body text-[13px] font-semibold tracking-wide text-lyp-white shadow-[0_10px_30px_-10px_rgba(178,38,38,0.5)] transition-all duration-500 ${EASE} hover:bg-[#c22e2e] active:scale-[0.985] disabled:opacity-50`}
            >
              {saving ? "Saving..." : "Add State"}
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full bg-lyp-white/15 transition-transform duration-500 ${EASE} group-hover:scale-105`}
              >
                <Check
                  strokeWidth={1.5}
                  aria-hidden="true"
                  className="h-4 w-4"
                />
              </span>
            </button>
            <button
              onClick={() => {
                setShowForm(false);
                setCode("");
                setName("");
              }}
              className={`group inline-flex items-center gap-3 rounded-full border border-[#EFE6E6] bg-lyp-white py-1.5 pl-6 pr-1.5 font-body text-[13px] font-semibold tracking-wide text-lyp-black transition-all duration-500 ${EASE} hover:border-lyp-cherry/25 hover:text-lyp-cherry active:scale-[0.985]`}
            >
              Cancel
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full bg-[#F7F1F1] transition-transform duration-500 ${EASE} group-hover:scale-105`}
              >
                <X strokeWidth={1.5} aria-hidden="true" className="h-4 w-4" />
              </span>
            </button>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-[#EFE6E6] bg-lyp-white">
        {states.length === 0 ? (
          <div className="px-8 py-12 text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-lyp-cherry/[0.05] ring-1 ring-lyp-cherry/10">
              <MapPin
                strokeWidth={1}
                aria-hidden="true"
                className="h-6 w-6 text-lyp-cherry/60"
              />
            </span>
            <p className="mt-5 font-body text-[14px] text-[#8A7A7A]">
              No states configured yet.
            </p>
            <button
              onClick={() => setShowForm(true)}
              className={`mt-3 inline-block font-body text-[13px] font-semibold text-lyp-cherry transition-opacity duration-500 ${EASE} hover:opacity-70`}
            >
              Add your first state
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-body text-[12.5px]">
              <thead>
                <tr className="border-b border-[#F1E8E8]">
                  <th className={thClasses}>Code</th>
                  <th className={thClasses}>Name</th>
                </tr>
              </thead>
              <tbody>
                {states.map((state) => (
                  <tr
                    key={state.id}
                    className={`border-b border-[#F7F1F1] transition-colors duration-500 last:border-0 ${EASE} hover:bg-[#FBF8F8]`}
                  >
                    <td className="whitespace-nowrap px-5 py-3 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-lyp-black">
                      {state.code}
                    </td>
                    <td className="px-5 py-3 text-[#8A7A7A]">{state.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
