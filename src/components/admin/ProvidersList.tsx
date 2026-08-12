"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createProvider, updateProvider } from "@/server-actions/providers";
import { Plus, Pencil, Camera, Video } from "lucide-react";
import toast from "react-hot-toast";
import { formatCents } from "@/lib/format";

interface State {
  id: string;
  code: string;
  name: string;
}

interface Props {
  providers: Provider[];
  states: State[];
}

const emptyForm = {
  name: "",
  type: "photographer" as "photographer" | "videographer",
  description: "",
  portfolio_url: "",
  price_cents: 0,
  state_ids: [] as string[],
};

export default function ProvidersList({ providers, states }: Props) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    setSaving(true);
    const { error } = await createProvider({
      name: form.name,
      type: form.type,
      description: form.description || undefined,
      portfolio_url: form.portfolio_url || undefined,
      price_cents: form.price_cents || 0,
      state_ids: form.state_ids,
    });
    setSaving(false);
    if (error) {
      toast.error(error);
    } else {
      toast.success("Provider created");
      setShowForm(false);
      setForm(emptyForm);
      router.refresh();
    }
  };

  const handleUpdate = async () => {
    if (!editingId || !form.name.trim()) return;
    setSaving(true);
    const { error } = await updateProvider(editingId, {
      name: form.name,
      type: form.type,
      description: form.description || undefined,
      portfolio_url: form.portfolio_url || undefined,
      price_cents: form.price_cents || 0,
      state_ids: form.state_ids,
    });
    setSaving(false);
    if (error) {
      toast.error(error);
    } else {
      toast.success("Provider updated");
      setEditingId(null);
      setForm(emptyForm);
      router.refresh();
    }
  };

  const startEdit = (p: Provider) => {
    setEditingId(p.id);
    setShowForm(false);
    setForm({
      name: p.name,
      type: p.type ?? "photographer",
      description: p.description ?? "",
      portfolio_url: p.portfolio_url ?? "",
      price_cents: p.price_cents ?? 0,
      state_ids:
        (p.provider_states
          ?.map((ps) => ps.states?.id)
          .filter(Boolean) as string[]) ?? [],
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const inputClass =
    "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-lyp-cherry/30 focus:border-lyp-cherry";

  const renderForm = (onSubmit: () => void, submitLabel: string) => (
    <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Name
          </label>
          <input
            className={inputClass}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Provider name"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Type
          </label>
          <select
            className={inputClass}
            value={form.type}
            onChange={(e) =>
              setForm({
                ...form,
                type: e.target.value as "photographer" | "videographer",
              })
            }
          >
            <option value="photographer">Photographer</option>
            <option value="videographer">Videographer</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Portfolio URL
          </label>
          <input
            className={inputClass}
            value={form.portfolio_url}
            onChange={(e) =>
              setForm({ ...form, portfolio_url: e.target.value })
            }
            placeholder="https://..."
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Price (cents)
          </label>
          <input
            className={inputClass}
            type="number"
            value={form.price_cents}
            onChange={(e) =>
              setForm({ ...form, price_cents: parseInt(e.target.value) || 0 })
            }
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            States
          </label>
          <div className="flex flex-wrap gap-2">
            {states.map((s) => (
              <label
                key={s.id}
                className="inline-flex items-center gap-1.5 text-sm cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={form.state_ids.includes(s.id)}
                  onChange={(e) => {
                    setForm({
                      ...form,
                      state_ids: e.target.checked
                        ? [...form.state_ids, s.id]
                        : form.state_ids.filter((id) => id !== s.id),
                    });
                  }}
                  className="rounded border-gray-300 text-lyp-cherry focus:ring-lyp-cherry/30"
                />
                {s.name} ({s.code})
              </label>
            ))}
          </div>
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Description
          </label>
          <textarea
            className={inputClass}
            rows={2}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Brief description..."
          />
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={onSubmit}
          disabled={saving}
          className="px-4 py-2 bg-lyp-cherry text-white rounded-lg text-sm font-semibold hover:bg-lyp-maroon transition-colors disabled:opacity-50"
        >
          {saving ? "Saving..." : submitLabel}
        </button>
        <button
          onClick={() => {
            setShowForm(false);
            cancelEdit();
          }}
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );

  return (
    <div>
      {!showForm && !editingId && (
        <button
          onClick={() => {
            setShowForm(true);
            setForm(emptyForm);
          }}
          className="mb-4 inline-flex items-center gap-2 px-4 py-2 bg-lyp-cherry text-white rounded-lg text-sm font-semibold hover:bg-lyp-maroon transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Provider
        </button>
      )}

      {showForm && renderForm(handleCreate, "Create Provider")}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {providers.length === 0 ? (
          <div className="p-8 text-center text-gray-500 font-body">
            <Camera className="h-10 w-10 mx-auto mb-3 text-gray-300" />
            <p>No providers yet. Add your first provider.</p>
          </div>
        ) : (
          <table className="w-full text-sm font-body">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 font-semibold text-gray-600">
                  Name
                </th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">
                  Type
                </th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">
                  States
                </th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">
                  Price
                </th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {providers.map((provider) => (
                <tr key={provider.id}>
                  {editingId === provider.id ? (
                    <td colSpan={5} className="p-4">
                      {renderForm(handleUpdate, "Update Provider")}
                    </td>
                  ) : (
                    <>
                      <td className="px-4 py-3 font-medium text-lyp-black">
                        {provider.name}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        <span className="inline-flex items-center gap-1">
                          {provider.type === "videographer" ? (
                            <Video className="h-3.5 w-3.5" />
                          ) : (
                            <Camera className="h-3.5 w-3.5" />
                          )}
                          {provider.type ?? "-"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {provider.provider_states
                          ?.map((ps) => ps.states?.code)
                          .filter(Boolean)
                          .join(", ") || "-"}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {provider.price_cents
                          ? formatCents(provider.price_cents)
                          : "-"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => startEdit(provider)}
                          className="p-1.5 text-gray-400 hover:text-lyp-cherry transition-colors"
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
