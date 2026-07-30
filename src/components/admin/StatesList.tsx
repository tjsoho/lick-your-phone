"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createState } from "@/server-actions/states";
import { Plus, MapPin } from "lucide-react";
import toast from "react-hot-toast";

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

  const inputClass =
    "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-lyp-cherry/30 focus:border-lyp-cherry";

  return (
    <div>
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="mb-4 inline-flex items-center gap-2 px-4 py-2 bg-lyp-cherry text-white rounded-lg text-sm font-semibold hover:bg-lyp-maroon transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add State
        </button>
      )}

      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Code
              </label>
              <input
                className={inputClass}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. QLD"
                maxLength={5}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Name
              </label>
              <input
                className={inputClass}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Queensland"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={saving}
              className="px-4 py-2 bg-lyp-cherry text-white rounded-lg text-sm font-semibold hover:bg-lyp-maroon transition-colors disabled:opacity-50"
            >
              {saving ? "Saving..." : "Add State"}
            </button>
            <button
              onClick={() => {
                setShowForm(false);
                setCode("");
                setName("");
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {states.length === 0 ? (
          <div className="p-8 text-center text-gray-500 font-body">
            <MapPin className="h-10 w-10 mx-auto mb-3 text-gray-300" />
            <p>No states configured yet.</p>
          </div>
        ) : (
          <table className="w-full text-sm font-body">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 font-semibold text-gray-600">
                  Code
                </th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">
                  Name
                </th>
              </tr>
            </thead>
            <tbody>
              {states.map((state) => (
                <tr
                  key={state.id}
                  className="border-b border-gray-50 hover:bg-gray-50"
                >
                  <td className="px-4 py-3 font-mono font-semibold text-lyp-black">
                    {state.code}
                  </td>
                  <td className="px-4 py-3 text-gray-700">{state.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
