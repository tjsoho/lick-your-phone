"use client";

import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { upsertVenue } from "@/server-actions/venues";
import toast from "react-hot-toast";
import { Check, X } from "lucide-react";

const EASE = "ease-brand";

const labelClasses =
  "mb-2 block font-body text-[10px] font-medium uppercase tracking-[0.22em] text-[#A89898]";

const fieldClasses = `w-full rounded-2xl border border-[#EFE6E6] bg-[#FBF8F8] px-4 py-2.5 font-body text-[13px] text-lyp-black outline-none transition-all duration-500 ${EASE} placeholder:text-[#C3B5B5] focus:border-lyp-cherry/30 focus:bg-lyp-white focus:shadow-[0_0_0_4px_rgba(178,38,38,0.07)] disabled:opacity-50`;

const errorClasses = "mt-2 font-body text-[11px] text-lyp-cherry";

type FormValues = {
  name: string;
  client_id: string;
  state_id: string;
  address: string;
};

type Props = {
  venue?: {
    id: string;
    name: string;
    client_id?: string | null;
    state_id: string;
    address?: string | null;
  };
  clients: { id: string; name: string }[];
  states: { id: string; name: string }[];
};

export default function VenueForm({ venue, clients, states }: Props) {
  const router = useRouter();
  const isEditing = !!venue;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: {
      name: venue?.name ?? "",
      client_id: venue?.client_id ?? "",
      state_id: venue?.state_id ?? "",
      address: venue?.address ?? "",
    },
  });

  async function onSubmit(values: FormValues) {
    const payload = {
      id: venue?.id,
      name: values.name,
      client_id: values.client_id || null,
      state_id: values.state_id,
      address: values.address || null,
    };

    const { error } = await upsertVenue(payload);
    if (error) {
      toast.error(error);
      return;
    }

    toast.success(isEditing ? "Venue updated" : "Venue created");
    router.push("/admin/venues");
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="rounded-3xl border border-[#EFE6E6] bg-lyp-white p-6 sm:p-7"
    >
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="venue-name" className={labelClasses}>
            Name <span className="text-lyp-cherry">*</span>
          </label>
          <input
            id="venue-name"
            placeholder="Venue name"
            className={fieldClasses}
            {...register("name", { required: "Name is required" })}
          />
          {errors.name && <p className={errorClasses}>{errors.name.message}</p>}
        </div>

        <div>
          <label htmlFor="venue-client" className={labelClasses}>
            Client
          </label>
          <select
            id="venue-client"
            className={fieldClasses}
            {...register("client_id")}
          >
            <option value="">No Client (Independent Venue)</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="venue-state" className={labelClasses}>
            State <span className="text-lyp-cherry">*</span>
          </label>
          <select
            id="venue-state"
            className={fieldClasses}
            {...register("state_id", { required: "State is required" })}
          >
            <option value="">Select State</option>
            {states.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          {errors.state_id && (
            <p className={errorClasses}>{errors.state_id.message}</p>
          )}
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="venue-address" className={labelClasses}>
            Address
          </label>
          <textarea
            id="venue-address"
            rows={3}
            placeholder="Street, suburb, postcode"
            className={`${fieldClasses} resize-y`}
            {...register("address")}
          />
        </div>
      </div>

      <div className="mt-7 flex flex-wrap items-center gap-2.5 border-t border-[#F1E8E8] pt-6">
        <button
          type="submit"
          disabled={isSubmitting}
          className={`group inline-flex items-center gap-3 rounded-full bg-lyp-cherry py-1.5 pl-6 pr-1.5 font-body text-[13px] font-semibold tracking-wide text-lyp-white shadow-[0_10px_30px_-10px_rgba(178,38,38,0.5)] transition-all duration-500 ${EASE} hover:bg-[#c22e2e] active:scale-[0.985] disabled:opacity-50`}
        >
          {isSubmitting
            ? "Saving..."
            : isEditing
              ? "Update Venue"
              : "Create Venue"}
          <span
            className={`flex h-8 w-8 items-center justify-center rounded-full bg-lyp-white/15 transition-transform duration-500 ${EASE} group-hover:scale-105`}
          >
            <Check strokeWidth={1.5} aria-hidden="true" className="h-4 w-4" />
          </span>
        </button>

        <button
          type="button"
          onClick={() => router.back()}
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
    </form>
  );
}
