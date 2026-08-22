"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Check, ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import {
  createService,
  updateService,
  deleteService,
  updateServiceInclusions,
  updateServiceObligations,
} from "@/server-actions/services";
import { createSlug } from "@/utils/create-slug";
import { cn } from "@/lib/utils";

interface ListItem {
  text: string;
  sequence: number;
}

interface ServiceFormData {
  name: string;
  slug: string;
  billing: "one_off" | "recurring_monthly" | "in_kind";
  term: string;
  target_price_dollars: number;
  discount_pct_display: number;
  discount_window_hours: number;
  price_display_period: string;
  sequence: number;
  requires_other_service: boolean;
}

interface ServiceFormProps {
  service?: {
    id: string;
    slug: string;
    name: string;
    billing: "one_off" | "recurring_monthly" | "in_kind";
    term?: string;
    target_price_cents?: number;
    discount_pct?: number;
    discount_window_hours?: number;
    price_display_period?: string;
    requires_other_service?: boolean;
    sequence?: number;
    service_inclusions?: { text: string; sequence: number }[];
    service_client_obligations?: { text: string; sequence: number }[];
  };
}

const EASE = "ease-brand";

const inputClasses = `w-full rounded-2xl border border-[#EFE6E6] bg-[#FBF8F8] px-4 py-2.5 font-body text-[13px] text-lyp-black outline-none transition-all duration-500 ${EASE} placeholder:text-[#C3B5B5] focus:border-lyp-cherry/30 focus:bg-lyp-white focus:shadow-[0_0_0_4px_rgba(178,38,38,0.07)]`;

const labelClasses =
  "block font-body text-[10px] font-medium uppercase tracking-[0.22em] text-[#A89898]";

const errorClasses = "mt-1.5 font-body text-[11px] text-lyp-cherry";

const cardClasses = "rounded-2xl border border-[#EFE6E6] bg-lyp-white p-6";

const sectionTitleClasses =
  "font-heading text-[16px] font-bold tracking-[-0.02em] text-lyp-black";

export default function ServiceForm({ service }: ServiceFormProps) {
  const router = useRouter();
  const isEditing = !!service;
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [inclusions, setInclusions] = useState<ListItem[]>(
    service?.service_inclusions?.sort((a, b) => a.sequence - b.sequence) ?? []
  );
  const [obligations, setObligations] = useState<ListItem[]>(
    service?.service_client_obligations?.sort((a, b) => a.sequence - b.sequence) ?? []
  );

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ServiceFormData>({
    defaultValues: {
      name: service?.name ?? "",
      slug: service?.slug ?? "",
      billing: service?.billing ?? "one_off",
      term: service?.term ?? "",
      target_price_dollars: service?.target_price_cents
        ? service.target_price_cents / 100
        : 0,
      discount_pct_display: service?.discount_pct
        ? Math.round(service.discount_pct * 100)
        : 0,
      discount_window_hours: service?.discount_window_hours ?? 0,
      price_display_period: service?.price_display_period ?? "",
      sequence: service?.sequence ?? 0,
      requires_other_service: service?.requires_other_service ?? false,
    },
  });

  watch("name");

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    const name = e.target.value;
    setValue("name", name);
    if (!isEditing) {
      setValue("slug", createSlug(name));
    }
  }

  async function onSubmit(data: ServiceFormData) {
    setSaving(true);
    try {
      const payload = {
        name: data.name,
        slug: data.slug,
        billing: data.billing,
        term: data.term || undefined,
        target_price_cents: Math.round(data.target_price_dollars * 100),
        discount_pct: data.discount_pct_display / 100,
        discount_window_hours: data.discount_window_hours || undefined,
        price_display_period: data.price_display_period || undefined,
        requires_other_service: data.requires_other_service,
        sequence: data.sequence,
      };

      if (isEditing) {
        const { error } = await updateService(service.id, payload);
        if (error) throw new Error(error);

        const { error: inclError } = await updateServiceInclusions(
          service.id,
          inclusions.map((item, i) => ({ text: item.text, sequence: i }))
        );
        if (inclError) throw new Error(inclError);

        const { error: oblError } = await updateServiceObligations(
          service.id,
          obligations.map((item, i) => ({ text: item.text, sequence: i }))
        );
        if (oblError) throw new Error(oblError);

        toast.success("Service updated");
      } else {
        const { data: created, error } = await createService(payload);
        if (error) throw new Error(error);

        if (created?.id) {
          await updateServiceInclusions(
            created.id,
            inclusions.map((item, i) => ({ text: item.text, sequence: i }))
          );
          await updateServiceObligations(
            created.id,
            obligations.map((item, i) => ({ text: item.text, sequence: i }))
          );
        }

        toast.success("Service created");
      }

      router.push("/admin/services");
    } catch (err) {
      toast.error((err as Error).message || "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!service) return;
    if (!window.confirm(`Are you sure you want to delete "${service.name}"? This cannot be undone.`))
      return;

    setDeleting(true);
    try {
      const { error } = await deleteService(service.id);
      if (error) throw new Error(error);
      toast.success("Service deleted");
      router.push("/admin/services");
    } catch (err) {
      toast.error((err as Error).message || "Failed to delete");
    } finally {
      setDeleting(false);
    }
  }

  // List helpers
  function addItem(
    list: ListItem[],
    setList: React.Dispatch<React.SetStateAction<ListItem[]>>
  ) {
    setList([...list, { text: "", sequence: list.length }]);
  }

  function removeItem(
    index: number,
    list: ListItem[],
    setList: React.Dispatch<React.SetStateAction<ListItem[]>>
  ) {
    setList(list.filter((_, i) => i !== index));
  }

  function updateItemText(
    index: number,
    text: string,
    list: ListItem[],
    setList: React.Dispatch<React.SetStateAction<ListItem[]>>
  ) {
    const updated = [...list];
    updated[index] = { ...updated[index], text };
    setList(updated);
  }

  function moveItem(
    index: number,
    direction: "up" | "down",
    list: ListItem[],
    setList: React.Dispatch<React.SetStateAction<ListItem[]>>
  ) {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= list.length) return;
    const updated = [...list];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    setList(updated);
  }

  function renderListSection(
    title: string,
    items: ListItem[],
    setItems: React.Dispatch<React.SetStateAction<ListItem[]>>
  ) {
    return (
      <div className={cardClasses}>
        <div className="flex items-center justify-between gap-4">
          <h2 className={sectionTitleClasses}>{title}</h2>
          <button
            type="button"
            onClick={() => addItem(items, setItems)}
            className={`group inline-flex items-center gap-1.5 font-body text-[12px] font-semibold tracking-wide text-lyp-cherry transition-opacity duration-500 ${EASE} hover:opacity-70`}
          >
            <Plus strokeWidth={1.5} className="h-3.5 w-3.5" />
            Add Item
          </button>
        </div>

        {items.length === 0 ? (
          <p className="mt-4 font-body text-[13px] text-[#8A7A7A]">
            No items yet.
          </p>
        ) : (
          <div className="mt-4 space-y-2">
            {items.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className="flex flex-col">
                  <button
                    type="button"
                    onClick={() => moveItem(index, "up", items, setItems)}
                    disabled={index === 0}
                    aria-label={`Move ${title} item ${index + 1} up`}
                    className={cn(
                      `rounded-full p-1 transition-colors duration-500 ${EASE}`,
                      index === 0
                        ? "cursor-not-allowed text-[#E4D8D8]"
                        : "text-[#A89898] hover:text-lyp-cherry"
                    )}
                  >
                    <ChevronUp strokeWidth={1.5} className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveItem(index, "down", items, setItems)}
                    disabled={index === items.length - 1}
                    aria-label={`Move ${title} item ${index + 1} down`}
                    className={cn(
                      `rounded-full p-1 transition-colors duration-500 ${EASE}`,
                      index === items.length - 1
                        ? "cursor-not-allowed text-[#E4D8D8]"
                        : "text-[#A89898] hover:text-lyp-cherry"
                    )}
                  >
                    <ChevronDown strokeWidth={1.5} className="h-3.5 w-3.5" />
                  </button>
                </div>
                <input
                  type="text"
                  value={item.text}
                  onChange={(e) => updateItemText(index, e.target.value, items, setItems)}
                  className={cn(inputClasses, "flex-1")}
                  placeholder="Item text"
                  aria-label={`${title} item ${index + 1}`}
                />
                <button
                  type="button"
                  onClick={() => removeItem(index, items, setItems)}
                  aria-label={`Remove ${title} item ${index + 1}`}
                  className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-transparent text-[#A89898] transition-all duration-500 ${EASE} hover:border-lyp-cherry/15 hover:bg-lyp-cherry/[0.04] hover:text-lyp-cherry`}
                >
                  <Trash2 strokeWidth={1.5} className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-2xl space-y-5">
      {/* Main fields */}
      <div className={cn(cardClasses, "space-y-5")}>
        <div>
          <label htmlFor="name" className={labelClasses}>
            Name
          </label>
          <input
            id="name"
            type="text"
            {...register("name", { required: "Name is required" })}
            onChange={handleNameChange}
            className={cn(inputClasses, "mt-2")}
          />
          {errors.name && <p className={errorClasses}>{errors.name.message}</p>}
        </div>

        <div>
          <label htmlFor="slug" className={labelClasses}>
            Slug
          </label>
          <input
            id="slug"
            type="text"
            {...register("slug", { required: "Slug is required" })}
            className={cn(
              inputClasses,
              "mt-2 font-mono",
              isEditing && "text-[#8A7A7A]"
            )}
            readOnly={isEditing}
          />
          {errors.slug && <p className={errorClasses}>{errors.slug.message}</p>}
        </div>

        <div>
          <label htmlFor="billing" className={labelClasses}>
            Billing
          </label>
          <select
            id="billing"
            {...register("billing", { required: "Billing is required" })}
            className={cn(inputClasses, "mt-2")}
          >
            <option value="one_off">One-off</option>
            <option value="recurring_monthly">Monthly</option>
            <option value="in_kind">In Kind</option>
          </select>
        </div>

        <div>
          <label htmlFor="term" className={labelClasses}>
            Term
          </label>
          <input
            id="term"
            type="text"
            {...register("term")}
            className={cn(inputClasses, "mt-2")}
          />
        </div>

        <div>
          <label htmlFor="target_price_dollars" className={labelClasses}>
            Target Price (AUD)
          </label>
          <input
            id="target_price_dollars"
            type="number"
            step="0.01"
            {...register("target_price_dollars", { valueAsNumber: true })}
            className={cn(inputClasses, "mt-2 tabular-nums")}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="discount_pct_display" className={labelClasses}>
              Discount (%)
            </label>
            <input
              id="discount_pct_display"
              type="number"
              min="0"
              max="100"
              {...register("discount_pct_display", { valueAsNumber: true })}
              className={cn(inputClasses, "mt-2 tabular-nums")}
            />
          </div>
          <div>
            <label htmlFor="discount_window_hours" className={labelClasses}>
              Discount Window (hours)
            </label>
            <input
              id="discount_window_hours"
              type="number"
              {...register("discount_window_hours", { valueAsNumber: true })}
              className={cn(inputClasses, "mt-2 tabular-nums")}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="price_display_period" className={labelClasses}>
              Price Display Period
            </label>
            <input
              id="price_display_period"
              type="text"
              {...register("price_display_period")}
              className={cn(inputClasses, "mt-2")}
            />
          </div>
          <div>
            <label htmlFor="sequence" className={labelClasses}>
              Sequence
            </label>
            <input
              id="sequence"
              type="number"
              {...register("sequence", { valueAsNumber: true })}
              className={cn(inputClasses, "mt-2 tabular-nums")}
            />
          </div>
        </div>

        <div className="flex items-center gap-2.5 rounded-2xl border border-[#EFE6E6] bg-[#FBF8F8] px-4 py-3">
          <input
            id="requires_other_service"
            type="checkbox"
            {...register("requires_other_service")}
            className={`h-4 w-4 rounded border-[#E4D8D8] text-lyp-cherry transition-all duration-500 ${EASE} focus:ring-2 focus:ring-lyp-cherry/30 focus:ring-offset-0`}
          />
          <label
            htmlFor="requires_other_service"
            className="font-body text-[13px] text-lyp-black"
          >
            Requires other service
          </label>
        </div>
      </div>

      {/* Inclusions */}
      {renderListSection("Inclusions", inclusions, setInclusions)}

      {/* Client Obligations */}
      {renderListSection("Client Obligations", obligations, setObligations)}

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className={cn(
            `group inline-flex items-center gap-3 rounded-full bg-lyp-cherry py-1.5 pl-6 pr-1.5 font-body text-[13px] font-semibold tracking-wide text-lyp-white shadow-[0_10px_30px_-10px_rgba(178,38,38,0.5)] transition-all duration-500 ${EASE} hover:bg-[#c22e2e] active:scale-[0.985]`,
            saving && "cursor-not-allowed opacity-50"
          )}
        >
          {saving ? "Saving..." : isEditing ? "Update Service" : "Create Service"}
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

        {isEditing && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className={cn(
              `group inline-flex items-center gap-3 rounded-full border border-lyp-cherry/15 bg-lyp-cherry/[0.04] py-1.5 pl-6 pr-1.5 font-body text-[13px] font-semibold tracking-wide text-lyp-cherry transition-all duration-500 ${EASE} hover:border-lyp-cherry/30 active:scale-[0.985]`,
              deleting && "cursor-not-allowed opacity-50"
            )}
          >
            {deleting ? "Deleting..." : "Delete Service"}
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-full bg-lyp-cherry/[0.07] transition-transform duration-500 ${EASE} group-hover:scale-105`}
            >
              <Trash2 strokeWidth={1.5} className="h-4 w-4" />
            </span>
          </button>
        )}
      </div>
    </form>
  );
}
