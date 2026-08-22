"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { Check, Plus } from "lucide-react";
import { createSlug } from "@/utils/create-slug";
import { upsertTier } from "@/server-actions/service-tiers";
import { cn } from "@/lib/utils";

interface TierFormData {
  name: string;
  slug: string;
  target_price_dollars: number;
  billing_cycle_months: number;
}

interface Tier {
  id: string;
  service_id: string;
  slug: string;
  name: string;
  target_price_cents: number;
  billing_cycle_months: number;
  sequence: number;
}

interface TierFormProps {
  serviceId: string;
  tier?: Tier;
  onSuccess: () => void;
  onCancel: () => void;
}

const EASE = "ease-brand";

const inputClasses = `w-full rounded-2xl border border-[#EFE6E6] bg-[#FBF8F8] px-4 py-2.5 font-body text-[13px] text-lyp-black outline-none transition-all duration-500 ${EASE} placeholder:text-[#C3B5B5] focus:border-lyp-cherry/30 focus:bg-lyp-white focus:shadow-[0_0_0_4px_rgba(178,38,38,0.07)]`;

const labelClasses =
  "block font-body text-[10px] font-medium uppercase tracking-[0.22em] text-[#A89898]";

const errorClasses = "mt-1.5 font-body text-[11px] text-lyp-cherry";

export default function TierForm({
  serviceId,
  tier,
  onSuccess,
  onCancel,
}: TierFormProps) {
  const isEditing = !!tier;
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<TierFormData>({
    defaultValues: {
      name: tier?.name ?? "",
      slug: tier?.slug ?? "",
      target_price_dollars: tier ? tier.target_price_cents / 100 : 0,
      billing_cycle_months: tier?.billing_cycle_months ?? 1,
    },
  });

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    const name = e.target.value;
    setValue("name", name);
    if (!isEditing) {
      setValue("slug", createSlug(name));
    }
  }

  async function onSubmit(data: TierFormData) {
    setSaving(true);
    try {
      const payload = {
        id: tier?.id,
        service_id: serviceId,
        name: data.name,
        slug: data.slug || createSlug(data.name),
        target_price_cents: Math.round(data.target_price_dollars * 100),
        billing_cycle_months: Number(data.billing_cycle_months),
        sequence: tier?.sequence,
      };

      const { error } = await upsertTier(payload);
      if (error) throw new Error(error);

      toast.success(isEditing ? "Tier updated" : "Tier created");
      onSuccess();
    } catch (err) {
      toast.error((err as Error).message || "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label htmlFor="tier-name" className={labelClasses}>
          Name
        </label>
        <input
          id="tier-name"
          type="text"
          {...register("name", { required: "Name is required" })}
          onChange={handleNameChange}
          className={cn(inputClasses, "mt-2")}
        />
        {errors.name && <p className={errorClasses}>{errors.name.message}</p>}
      </div>

      <div>
        <label htmlFor="tier-slug" className={labelClasses}>
          Slug
        </label>
        <input
          id="tier-slug"
          type="text"
          {...register("slug", { required: "Slug is required" })}
          className={cn(inputClasses, "mt-2 font-mono")}
        />
        {errors.slug && <p className={errorClasses}>{errors.slug.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="tier-price" className={labelClasses}>
            Target Price (AUD)
          </label>
          <input
            id="tier-price"
            type="number"
            step="0.01"
            min="0"
            {...register("target_price_dollars", {
              required: "Price is required",
              valueAsNumber: true,
              validate: (val) => !isNaN(val) || "Must be a valid number",
            })}
            className={cn(inputClasses, "mt-2 tabular-nums")}
          />
          {errors.target_price_dollars && (
            <p className={errorClasses}>
              {errors.target_price_dollars.message}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="tier-billing" className={labelClasses}>
            Billing Cycle (Months)
          </label>
          <input
            id="tier-billing"
            type="number"
            min="1"
            {...register("billing_cycle_months", {
              required: "Billing cycle is required",
              valueAsNumber: true,
              validate: (val) =>
                (Number.isInteger(val) && val >= 1) ||
                "Must be at least 1 month",
            })}
            className={cn(inputClasses, "mt-2 tabular-nums")}
          />
          {errors.billing_cycle_months && (
            <p className={errorClasses}>
              {errors.billing_cycle_months.message}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className={`inline-flex items-center rounded-full border border-[#EFE6E6] bg-lyp-white px-5 py-2 font-body text-[13px] font-semibold tracking-wide text-lyp-black transition-all duration-500 ${EASE} hover:border-lyp-cherry/25 hover:text-lyp-cherry active:scale-[0.985]`}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className={cn(
            `group inline-flex items-center gap-3 rounded-full bg-lyp-cherry py-1.5 pl-5 pr-1.5 font-body text-[13px] font-semibold tracking-wide text-lyp-white shadow-[0_10px_30px_-10px_rgba(178,38,38,0.5)] transition-all duration-500 ${EASE} hover:bg-[#c22e2e] active:scale-[0.985]`,
            saving && "cursor-not-allowed opacity-50"
          )}
        >
          {saving ? "Saving..." : isEditing ? "Save Changes" : "Add Tier"}
          <span
            className={`flex h-8 w-8 items-center justify-center rounded-full bg-lyp-white/15 transition-transform duration-500 ${EASE} group-hover:scale-105`}
          >
            {isEditing ? (
              <Check strokeWidth={1.5} className="h-4 w-4" />
            ) : (
              <Plus strokeWidth={1.5} className="h-4 w-4" />
            )}
          </span>
        </button>
      </div>
    </form>
  );
}
