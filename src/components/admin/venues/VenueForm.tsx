"use client";

import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { upsertVenue } from "@/server-actions/venues";
import toast from "react-hot-toast";

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
      className="max-w-lg space-y-4 bg-white border border-gray-200 rounded-lg p-6"
    >
      <div>
        <label className="block font-body text-sm font-medium text-lyp-black mb-1">
          Name <span className="text-lyp-cherry">*</span>
        </label>
        <input
          {...register("name", { required: "Name is required" })}
          className="w-full border border-gray-300 rounded px-3 py-2 font-body text-sm focus:outline-none focus:ring-2 focus:ring-lyp-cherry"
        />
        {errors.name && (
          <p className="text-red-600 text-xs mt-1">{errors.name.message}</p>
        )}
      </div>

      <div>
        <label className="block font-body text-sm font-medium text-lyp-black mb-1">
          Client
        </label>
        <select
          {...register("client_id")}
          className="w-full border border-gray-300 rounded px-3 py-2 font-body text-sm focus:outline-none focus:ring-2 focus:ring-lyp-cherry"
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
        <label className="block font-body text-sm font-medium text-lyp-black mb-1">
          State <span className="text-lyp-cherry">*</span>
        </label>
        <select
          {...register("state_id", { required: "State is required" })}
          className="w-full border border-gray-300 rounded px-3 py-2 font-body text-sm focus:outline-none focus:ring-2 focus:ring-lyp-cherry"
        >
          <option value="">Select State</option>
          {states.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        {errors.state_id && (
          <p className="text-red-600 text-xs mt-1">{errors.state_id.message}</p>
        )}
      </div>

      <div>
        <label className="block font-body text-sm font-medium text-lyp-black mb-1">
          Address
        </label>
        <textarea
          {...register("address")}
          rows={3}
          className="w-full border border-gray-300 rounded px-3 py-2 font-body text-sm focus:outline-none focus:ring-2 focus:ring-lyp-cherry"
        />
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-lyp-cherry text-white px-6 py-2 rounded-md font-body text-sm hover:opacity-90 transition-colors disabled:opacity-50"
        >
          {isSubmitting
            ? "Saving..."
            : isEditing
              ? "Update Venue"
              : "Create Venue"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="border border-gray-300 text-lyp-black px-6 py-2 rounded-md font-body text-sm hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
