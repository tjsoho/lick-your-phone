"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createProvider, updateProvider } from "@/server-actions/providers";
import { Plus, Pencil, Camera, Video, Check, X } from "lucide-react";
import toast from "react-hot-toast";
import { formatCents } from "@/lib/format";

const EASE = "ease-brand";

const thClasses =
  "whitespace-nowrap px-5 py-3 text-left font-body text-[9px] font-medium uppercase tracking-[0.2em] text-[#A89898]";

const labelClasses =
  "mb-2 block font-body text-[10px] font-medium uppercase tracking-[0.22em] text-[#A89898]";

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

  const inputClass = `w-full rounded-2xl border border-[#EFE6E6] bg-[#FBF8F8] px-4 py-2.5 font-body text-[13px] text-lyp-black outline-none transition-all duration-500 ${EASE} placeholder:text-[#C3B5B5] focus:border-lyp-cherry/30 focus:bg-lyp-white focus:shadow-[0_0_0_4px_rgba(178,38,38,0.07)]`;

  const renderForm = (onSubmit: () => void, submitLabel: string) => (
    <div className="mb-4 rounded-3xl border border-[#EFE6E6] bg-lyp-white p-6">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div>
          <label htmlFor="provider-name" className={labelClasses}>
            Name
          </label>
          <input
            id="provider-name"
            className={inputClass}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Provider name"
          />
        </div>
        <div>
          <label htmlFor="provider-type" className={labelClasses}>
            Type
          </label>
          <select
            id="provider-type"
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
          <label htmlFor="provider-portfolio" className={labelClasses}>
            Portfolio URL
          </label>
          <input
            id="provider-portfolio"
            className={inputClass}
            value={form.portfolio_url}
            onChange={(e) =>
              setForm({ ...form, portfolio_url: e.target.value })
            }
            placeholder="https://..."
          />
        </div>
        <div>
          <label htmlFor="provider-price" className={labelClasses}>
            Price (cents)
          </label>
          <input
            id="provider-price"
            className={`${inputClass} tabular-nums`}
            type="number"
            value={form.price_cents}
            onChange={(e) =>
              setForm({ ...form, price_cents: parseInt(e.target.value) || 0 })
            }
          />
        </div>
        <div className="md:col-span-2">
          <span className={labelClasses}>States</span>
          <div className="flex flex-wrap gap-2">
            {states.map((s) => {
              const checked = form.state_ids.includes(s.id);
              return (
                <label
                  key={s.id}
                  className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-3.5 py-1.5 font-body text-[12px] transition-all duration-500 ${EASE} ${
                    checked
                      ? "border-lyp-cherry/25 bg-lyp-cherry/[0.05] text-lyp-cherry"
                      : "border-[#EFE6E6] bg-[#FBF8F8] text-[#8A7A7A] hover:border-lyp-cherry/20"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      setForm({
                        ...form,
                        state_ids: e.target.checked
                          ? [...form.state_ids, s.id]
                          : form.state_ids.filter((id) => id !== s.id),
                      });
                    }}
                    className="h-3.5 w-3.5 rounded border-[#E2D2D2] text-lyp-cherry accent-lyp-cherry focus:ring-lyp-cherry/30"
                  />
                  {s.name} ({s.code})
                </label>
              );
            })}
          </div>
        </div>
        <div className="md:col-span-2">
          <label htmlFor="provider-description" className={labelClasses}>
            Description
          </label>
          <textarea
            id="provider-description"
            className={`${inputClass} resize-y`}
            rows={2}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Brief description..."
          />
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2.5 border-t border-[#F1E8E8] pt-5">
        <button
          onClick={onSubmit}
          disabled={saving}
          className={`group inline-flex items-center gap-3 rounded-full bg-lyp-cherry py-1.5 pl-6 pr-1.5 font-body text-[13px] font-semibold tracking-wide text-lyp-white shadow-[0_10px_30px_-10px_rgba(178,38,38,0.5)] transition-all duration-500 ${EASE} hover:bg-[#c22e2e] active:scale-[0.985] disabled:opacity-50`}
        >
          {saving ? "Saving..." : submitLabel}
          <span
            className={`flex h-8 w-8 items-center justify-center rounded-full bg-lyp-white/15 transition-transform duration-500 ${EASE} group-hover:scale-105`}
          >
            <Check strokeWidth={1.5} aria-hidden="true" className="h-4 w-4" />
          </span>
        </button>
        <button
          onClick={() => {
            setShowForm(false);
            cancelEdit();
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
  );

  return (
    <div>
      {!showForm && !editingId && (
        <button
          onClick={() => {
            setShowForm(true);
            setForm(emptyForm);
          }}
          className={`group mb-4 inline-flex items-center gap-3 rounded-full bg-lyp-cherry py-1.5 pl-6 pr-1.5 font-body text-[13px] font-semibold tracking-wide text-lyp-white shadow-[0_10px_30px_-10px_rgba(178,38,38,0.5)] transition-all duration-500 ${EASE} hover:bg-[#c22e2e] active:scale-[0.985]`}
        >
          Add Provider
          <span
            className={`flex h-8 w-8 items-center justify-center rounded-full bg-lyp-white/15 transition-transform duration-500 ${EASE} group-hover:scale-105`}
          >
            <Plus strokeWidth={1.5} aria-hidden="true" className="h-4 w-4" />
          </span>
        </button>
      )}

      {showForm && renderForm(handleCreate, "Create Provider")}

      <div className="overflow-hidden rounded-2xl border border-[#EFE6E6] bg-lyp-white">
        {providers.length === 0 ? (
          <div className="px-8 py-12 text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-lyp-cherry/[0.05] ring-1 ring-lyp-cherry/10">
              <Camera
                strokeWidth={1}
                aria-hidden="true"
                className="h-6 w-6 text-lyp-cherry/60"
              />
            </span>
            <p className="mt-5 font-body text-[14px] text-[#8A7A7A]">
              No providers yet.
            </p>
            <button
              onClick={() => {
                setShowForm(true);
                setForm(emptyForm);
              }}
              className={`mt-3 inline-block font-body text-[13px] font-semibold text-lyp-cherry transition-opacity duration-500 ${EASE} hover:opacity-70`}
            >
              Add your first provider
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-body text-[12.5px]">
              <thead>
                <tr className="border-b border-[#F1E8E8]">
                  <th className={thClasses}>Name</th>
                  <th className={thClasses}>Type</th>
                  <th className={thClasses}>States</th>
                  <th className={thClasses}>Price</th>
                  <th className={`${thClasses} text-right`}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {providers.map((provider) => (
                  <tr
                    key={provider.id}
                    className={`border-b border-[#F7F1F1] transition-colors duration-500 last:border-0 ${EASE} hover:bg-[#FBF8F8]`}
                  >
                    {editingId === provider.id ? (
                      <td colSpan={5} className="p-4">
                        {renderForm(handleUpdate, "Update Provider")}
                      </td>
                    ) : (
                      <>
                        <td className="whitespace-nowrap px-5 py-3 font-medium text-lyp-black">
                          {provider.name}
                        </td>
                        <td className="whitespace-nowrap px-5 py-3 text-[#8A7A7A]">
                          <span className="inline-flex items-center gap-1.5 capitalize">
                            {provider.type === "videographer" ? (
                              <Video
                                strokeWidth={1.5}
                                aria-hidden="true"
                                className="h-3.5 w-3.5 text-[#C3B5B5]"
                              />
                            ) : (
                              <Camera
                                strokeWidth={1.5}
                                aria-hidden="true"
                                className="h-3.5 w-3.5 text-[#C3B5B5]"
                              />
                            )}
                            {provider.type ?? "—"}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-[#8A7A7A]">
                          {provider.provider_states
                            ?.map((ps) => ps.states?.code)
                            .filter(Boolean)
                            .join(", ") || "—"}
                        </td>
                        <td className="whitespace-nowrap px-5 py-3 font-medium tabular-nums text-lyp-black">
                          {provider.price_cents
                            ? formatCents(provider.price_cents)
                            : "—"}
                        </td>
                        <td className="whitespace-nowrap px-5 py-3 text-right">
                          <button
                            onClick={() => startEdit(provider)}
                            aria-label={`Edit ${provider.name}`}
                            title="Edit"
                            className={`rounded-full p-1.5 text-[#A89898] transition-colors duration-500 ${EASE} hover:bg-[#F7F1F1] hover:text-lyp-cherry focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lyp-cherry/30`}
                          >
                            <Pencil strokeWidth={1.5} className="h-4 w-4" />
                          </button>
                        </td>
                      </>
                    )}
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
