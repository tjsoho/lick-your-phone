"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Plus, Edit, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import {
  getTiersByServiceId,
  deleteTier,
  reorderTiers,
} from "@/server-actions/service-tiers";
import { formatCents } from "@/lib/format";
import TierForm from "./TierForm";

interface Tier {
  id: string;
  service_id: string;
  slug: string;
  name: string;
  target_price_cents: number;
  billing_cycle_months: number;
  sequence: number;
}

interface ServiceTiersSectionProps {
  serviceId: string;
}

export default function ServiceTiersSection({
  serviceId,
}: ServiceTiersSectionProps) {
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTier, setEditingTier] = useState<Tier | null>(null);

  async function fetchTiers() {
    setLoading(true);
    try {
      const { data, error } = await getTiersByServiceId(serviceId);
      if (error) throw new Error(error);
      setTiers(data ?? []);
    } catch (err) {
      toast.error((err as Error).message || "Failed to load tiers");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchTiers();
  }, [serviceId]);

  async function handleMove(index: number, direction: "up" | "down") {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= tiers.length) return;

    const updated = [...tiers];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    setTiers(updated);

    const ids = updated.map((t) => t.id);
    const { error } = await reorderTiers(ids);
    if (error) {
      toast.error(error);
      fetchTiers();
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Are you sure you want to delete tier "${name}"?`)) return;

    const { error } = await deleteTier(id);
    if (error) {
      toast.error(error);
    } else {
      toast.success("Tier deleted");
      fetchTiers();
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-lg font-bold text-lyp-black">
            Service Pricing Tiers
          </h2>
          <p className="font-body text-xs text-gray-500">
            Manage the pricing options for this service.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditingTier(null);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-1 bg-lyp-cherry text-white px-3 py-1.5 rounded-md font-body text-sm hover:bg-lyp-maroon transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Tier
        </button>
      </div>

      {loading && tiers.length === 0 ? (
        <div className="text-center py-6 text-gray-500 font-body text-sm">
          Loading tiers...
        </div>
      ) : tiers.length === 0 ? (
        <div className="text-center py-6 text-gray-500 font-body text-sm border border-dashed border-gray-200 rounded-md">
          No tiers created yet. &quot;Click Add Tier&quot; to create one.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-2 font-heading text-xs font-semibold text-lyp-black uppercase tracking-wider">
                  Sequence
                </th>
                <th className="px-4 py-2 font-heading text-xs font-semibold text-lyp-black uppercase tracking-wider">
                  Name
                </th>
                <th className="px-4 py-2 font-heading text-xs font-semibold text-lyp-black uppercase tracking-wider">
                  Slug
                </th>
                <th className="px-4 py-2 font-heading text-xs font-semibold text-lyp-black uppercase tracking-wider">
                  Price (AUD)
                </th>
                <th className="px-4 py-2 font-heading text-xs font-semibold text-lyp-black uppercase tracking-wider">
                  Billing Cycle
                </th>
                <th className="px-4 py-2 font-heading text-xs font-semibold text-lyp-black uppercase tracking-wider text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {tiers.map((tier, index) => (
                <tr
                  key={tier.id}
                  className="border-b border-gray-100 hover:bg-gray-50 transition-colors font-body text-sm text-lyp-black"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleMove(index, "up")}
                        disabled={index === 0}
                        className="p-1 rounded text-gray-400 hover:text-lyp-cherry hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMove(index, "down")}
                        disabled={index === tiers.length - 1}
                        className="p-1 rounded text-gray-400 hover:text-lyp-cherry hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-gray-500 font-mono text-xs ml-1">
                        {tier.sequence}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-semibold">{tier.name}</td>
                  <td className="px-4 py-3 text-gray-600 font-mono text-xs">
                    {tier.slug}
                  </td>
                  <td className="px-4 py-3">
                    {formatCents(tier.target_price_cents)}
                  </td>
                  <td className="px-4 py-3">
                    {tier.billing_cycle_months}{" "}
                    {tier.billing_cycle_months === 1 ? "month" : "months"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingTier(tier);
                          setIsModalOpen(true);
                        }}
                        className="p-1.5 text-gray-500 hover:text-lyp-cherry hover:bg-gray-100 rounded transition-colors"
                        title="Edit Tier"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(tier.id, tier.name)}
                        className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-gray-100 rounded transition-colors"
                        title="Delete Tier"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
            <h3 className="font-heading text-lg font-bold text-lyp-black mb-4">
              {editingTier ? "Edit Pricing Tier" : "Add Pricing Tier"}
            </h3>
            <TierForm
              serviceId={serviceId}
              tier={editingTier ?? undefined}
              onSuccess={() => {
                setIsModalOpen(false);
                setEditingTier(null);
                fetchTiers();
              }}
              onCancel={() => {
                setIsModalOpen(false);
                setEditingTier(null);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
