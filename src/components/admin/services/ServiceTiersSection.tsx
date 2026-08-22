"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  Plus,
  Pencil,
  Trash2,
  ChevronUp,
  ChevronDown,
  Layers,
} from "lucide-react";
import {
  getTiersByServiceId,
  deleteTier,
  reorderTiers,
} from "@/server-actions/service-tiers";
import { formatCents } from "@/lib/format";
import { cn } from "@/lib/utils";
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

const EASE = "ease-brand";

const thClasses =
  "whitespace-nowrap px-4 py-3 text-left font-body text-[9px] font-medium uppercase tracking-[0.2em] text-[#A89898]";

const iconButtonClasses = `flex h-7 w-7 items-center justify-center rounded-full border border-transparent text-[#A89898] transition-all duration-500 ${EASE} hover:border-lyp-cherry/15 hover:bg-lyp-cherry/[0.04] hover:text-lyp-cherry disabled:cursor-not-allowed disabled:border-transparent disabled:bg-transparent disabled:text-[#E4D8D8]`;

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
    <div className="rounded-2xl border border-[#EFE6E6] bg-lyp-white p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-heading text-[16px] font-bold tracking-[-0.02em] text-lyp-black">
            Service Pricing Tiers
          </h2>
          <p className="mt-1.5 font-body text-[12px] text-[#8A7A7A]">
            Manage the pricing options for this service.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditingTier(null);
            setIsModalOpen(true);
          }}
          className={`group inline-flex items-center gap-2.5 rounded-full bg-lyp-cherry py-1 pl-4 pr-1 font-body text-[12.5px] font-semibold tracking-wide text-lyp-white shadow-[0_10px_30px_-10px_rgba(178,38,38,0.5)] transition-all duration-500 ${EASE} hover:bg-[#c22e2e] active:scale-[0.985]`}
        >
          Add Tier
          <span
            className={`flex h-7 w-7 items-center justify-center rounded-full bg-lyp-white/15 transition-transform duration-500 ${EASE} group-hover:scale-105`}
          >
            <Plus strokeWidth={1.5} className="h-4 w-4" />
          </span>
        </button>
      </div>

      {loading && tiers.length === 0 ? (
        <p className="mt-6 py-6 text-center font-body text-[13px] text-[#A89898]">
          Loading tiers…
        </p>
      ) : tiers.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-[#EFE6E6] px-6 py-10 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-lyp-cherry/[0.05] ring-1 ring-lyp-cherry/10">
            <Layers strokeWidth={1} className="h-5 w-5 text-lyp-cherry/60" />
          </span>
          <p className="mt-4 font-body text-[13px] text-[#8A7A7A]">
            No tiers created yet.
          </p>
          <button
            type="button"
            onClick={() => {
              setEditingTier(null);
              setIsModalOpen(true);
            }}
            className={`mt-3 font-body text-[13px] font-semibold text-lyp-cherry transition-opacity duration-500 ${EASE} hover:opacity-70`}
          >
            Add your first tier
          </button>
        </div>
      ) : (
        <div className="mt-5 overflow-hidden rounded-2xl border border-[#EFE6E6]">
          <div className="overflow-x-auto">
            <table className="w-full text-left font-body text-[12.5px]">
              <thead>
                <tr className="border-b border-[#F1E8E8]">
                  <th className={thClasses}>Sequence</th>
                  <th className={thClasses}>Name</th>
                  <th className={thClasses}>Slug</th>
                  <th className={thClasses}>Price (AUD)</th>
                  <th className={thClasses}>Billing Cycle</th>
                  <th className={cn(thClasses, "text-right")}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tiers.map((tier, index) => (
                  <tr
                    key={tier.id}
                    className={`border-b border-[#F7F1F1] transition-colors duration-500 last:border-0 ${EASE} hover:bg-[#FBF8F8]`}
                  >
                    <td className="whitespace-nowrap px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleMove(index, "up")}
                          disabled={index === 0}
                          aria-label={`Move ${tier.name} up`}
                          className={iconButtonClasses}
                        >
                          <ChevronUp strokeWidth={1.5} className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMove(index, "down")}
                          disabled={index === tiers.length - 1}
                          aria-label={`Move ${tier.name} down`}
                          className={iconButtonClasses}
                        >
                          <ChevronDown
                            strokeWidth={1.5}
                            className="h-3.5 w-3.5"
                          />
                        </button>
                        <span className="ml-1 font-mono text-[11px] tabular-nums text-[#A89898]">
                          {tier.sequence}
                        </span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-lyp-black">
                      {tier.name}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-[11px] text-[#A89898]">
                      {tier.slug}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-medium tabular-nums text-lyp-black">
                      {formatCents(tier.target_price_cents)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 tabular-nums text-[#8A7A7A]">
                      {tier.billing_cycle_months}{" "}
                      {tier.billing_cycle_months === 1 ? "month" : "months"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingTier(tier);
                            setIsModalOpen(true);
                          }}
                          className={iconButtonClasses}
                          aria-label={`Edit tier ${tier.name}`}
                          title="Edit tier"
                        >
                          <Pencil strokeWidth={1.5} className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(tier.id, tier.name)}
                          className={iconButtonClasses}
                          aria-label={`Delete tier ${tier.name}`}
                          title="Delete tier"
                        >
                          <Trash2 strokeWidth={1.5} className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-lyp-black/40 p-4 backdrop-blur-[2px]">
          <div className="w-full max-w-md rounded-3xl border border-[#EFE6E6] bg-lyp-white p-6 shadow-[0_24px_60px_-24px_rgba(61,11,17,0.35)]">
            <div className="flex items-center gap-3">
              <span className="h-px w-7 bg-lyp-cherry/30" />
              <span className="font-body text-[10px] font-medium uppercase tracking-[0.32em] text-lyp-cherry/70">
                Pricing Tier
              </span>
            </div>
            <h3 className="mb-5 mt-3 font-heading text-[20px] font-bold leading-[1.1] tracking-[-0.02em] text-lyp-black">
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
