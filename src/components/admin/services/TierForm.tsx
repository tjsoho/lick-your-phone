"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { createSlug } from "@/utils/create-slug";
import { upsertTier } from "@/server-actions/service-tiers";

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

const inputClasses =
  "w-full border border-gray-300 rounded-md px-3 py-2 font-body text-sm text-lyp-black focus:outline-none focus:ring-2 focus:ring-lyp-cherry focus:border-transparent";

const labelClasses =
  "block font-heading text-sm font-semibold text-lyp-black mb-1";

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
          className={inputClasses}
        />
        {errors.name && (
          <p className="text-red-600 text-xs mt-1">{errors.name.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="tier-slug" className={labelClasses}>
          Slug
        </label>
        <input
          id="tier-slug"
          type="text"
          {...register("slug", { required: "Slug is required" })}
          className={inputClasses}
        />
        {errors.slug && (
          <p className="text-red-600 text-xs mt-1">{errors.slug.message}</p>
        )}
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
            className={inputClasses}
          />
          {errors.target_price_dollars && (
            <p className="text-red-600 text-xs mt-1">
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
            className={inputClasses}
          />
          {errors.billing_cycle_months && (
            <p className="text-red-600 text-xs mt-1">
              {errors.billing_cycle_months.message}
            </p>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-md font-body text-sm text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="bg-lyp-cherry text-white px-4 py-2 rounded-md font-body text-sm hover:bg-lyp-maroon transition-colors disabled:opacity-50"
        >
          {saving ? "Saving..." : isEditing ? "Save Changes" : "Add Tier"}
        </button>
      </div>
    </form>
  );
}
