"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
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

const inputClasses =
  "w-full border border-gray-300 rounded-md px-3 py-2 font-body text-sm text-lyp-black focus:outline-none focus:ring-2 focus:ring-lyp-cherry focus:border-transparent";

const labelClasses = "block font-heading text-sm font-semibold text-lyp-black mb-1";

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
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading text-lg font-bold text-lyp-black">{title}</h2>
          <button
            type="button"
            onClick={() => addItem(items, setItems)}
            className="text-sm font-body text-lyp-cherry hover:text-lyp-maroon transition-colors"
          >
            + Add Item
          </button>
        </div>
        {items.length === 0 ? (
          <p className="font-body text-sm text-gray-500">No items yet.</p>
        ) : (
          <div className="space-y-2">
            {items.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className="flex flex-col">
                  <button
                    type="button"
                    onClick={() => moveItem(index, "up", items, setItems)}
                    disabled={index === 0}
                    className={cn(
                      "text-xs px-1 py-0.5 rounded",
                      index === 0
                        ? "text-gray-300 cursor-not-allowed"
                        : "text-gray-500 hover:text-lyp-cherry"
                    )}
                  >
                    &#9650;
                  </button>
                  <button
                    type="button"
                    onClick={() => moveItem(index, "down", items, setItems)}
                    disabled={index === items.length - 1}
                    className={cn(
                      "text-xs px-1 py-0.5 rounded",
                      index === items.length - 1
                        ? "text-gray-300 cursor-not-allowed"
                        : "text-gray-500 hover:text-lyp-cherry"
                    )}
                  >
                    &#9660;
                  </button>
                </div>
                <input
                  type="text"
                  value={item.text}
                  onChange={(e) => updateItemText(index, e.target.value, items, setItems)}
                  className={cn(inputClasses, "flex-1")}
                  placeholder="Item text"
                />
                <button
                  type="button"
                  onClick={() => removeItem(index, items, setItems)}
                  className="text-red-500 hover:text-red-700 text-sm font-body px-2 py-1"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
      {/* Main fields */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
        <div>
          <label htmlFor="name" className={labelClasses}>
            Name
          </label>
          <input
            id="name"
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
          <label htmlFor="slug" className={labelClasses}>
            Slug
          </label>
          <input
            id="slug"
            type="text"
            {...register("slug", { required: "Slug is required" })}
            className={inputClasses}
            readOnly={isEditing}
          />
          {errors.slug && (
            <p className="text-red-600 text-xs mt-1">{errors.slug.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="billing" className={labelClasses}>
            Billing
          </label>
          <select
            id="billing"
            {...register("billing", { required: "Billing is required" })}
            className={inputClasses}
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
            className={inputClasses}
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
            className={inputClasses}
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
              className={inputClasses}
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
              className={inputClasses}
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
              className={inputClasses}
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
              className={inputClasses}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            id="requires_other_service"
            type="checkbox"
            {...register("requires_other_service")}
            className="rounded border-gray-300 text-lyp-cherry focus:ring-lyp-cherry"
          />
          <label htmlFor="requires_other_service" className="font-body text-sm text-lyp-black">
            Requires other service
          </label>
        </div>
      </div>

      {/* Inclusions */}
      {renderListSection("Inclusions", inclusions, setInclusions)}

      {/* Client Obligations */}
      {renderListSection("Client Obligations", obligations, setObligations)}

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className={cn(
            "bg-lyp-cherry text-white px-6 py-2 rounded-md font-body text-sm hover:bg-lyp-maroon transition-colors",
            saving && "opacity-50 cursor-not-allowed"
          )}
        >
          {saving ? "Saving..." : isEditing ? "Update Service" : "Create Service"}
        </button>
        {isEditing && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className={cn(
              "bg-red-600 text-white px-6 py-2 rounded-md font-body text-sm hover:bg-red-700 transition-colors",
              deleting && "opacity-50 cursor-not-allowed"
            )}
          >
            {deleting ? "Deleting..." : "Delete Service"}
          </button>
        )}
      </div>
    </form>
  );
}
