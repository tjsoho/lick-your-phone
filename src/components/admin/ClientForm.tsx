"use client";

import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { createClient, updateClient } from "@/server-actions/clients";
import { createSlug } from "@/utils/create-slug";
import toast from "react-hot-toast";
import { useEffect } from "react";

type FormValues = {
  name: string;
  slug: string;
  entityName: string;
  abn: string;
};

type Props = {
  client?: {
    id: string;
    name: string;
    slug: string;
    abn?: string;
    entity_name?: string;
  };
};

export default function ClientForm({ client }: Props) {
  const router = useRouter();
  const isEditing = !!client;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: {
      name: client?.name ?? "",
      slug: client?.slug ?? "",
      entityName: client?.entity_name ?? "",
      abn: client?.abn ?? "",
    },
  });

  const nameValue = watch("name");

  useEffect(() => {
    if (!isEditing && nameValue) {
      setValue("slug", createSlug(nameValue));
    }
  }, [nameValue, isEditing, setValue]);

  async function onSubmit(values: FormValues) {
    const payload = {
      name: values.name,
      slug: values.slug,
      entity_name: values.entityName || undefined,
      abn: values.abn || undefined,
    };

    if (isEditing) {
      const { error } = await updateClient(client.id, payload);
      if (error) {
        toast.error(error);
        return;
      }
      toast.success("Client updated");
      router.push(`/admin/clients/${client.id}`);
    } else {
      const { data, error } = await createClient(payload);
      if (error) {
        toast.error(error);
        return;
      }
      toast.success("Client created");
      router.push(`/admin/clients/${data.id}`);
    }
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
          Slug
        </label>
        <input
          {...register("slug")}
          readOnly={!isEditing}
          className="w-full border border-gray-300 rounded px-3 py-2 font-body text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-lyp-cherry"
        />
      </div>

      <div>
        <label className="block font-body text-sm font-medium text-lyp-black mb-1">
          Entity Name
        </label>
        <input
          {...register("entityName")}
          className="w-full border border-gray-300 rounded px-3 py-2 font-body text-sm focus:outline-none focus:ring-2 focus:ring-lyp-cherry"
        />
      </div>

      <div>
        <label className="block font-body text-sm font-medium text-lyp-black mb-1">
          ABN
        </label>
        <input
          {...register("abn")}
          className="w-full border border-gray-300 rounded px-3 py-2 font-body text-sm focus:outline-none focus:ring-2 focus:ring-lyp-cherry"
        />
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-lyp-cherry text-white px-6 py-2 rounded-md font-body text-sm hover:opacity-90 transition-colors disabled:opacity-50"
        >
          {isSubmitting ? "Saving..." : isEditing ? "Update Client" : "Create Client"}
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
