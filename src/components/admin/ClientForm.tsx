"use client";

import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { createClient, updateClient } from "@/server-actions/clients";
import { createSlug } from "@/utils/create-slug";
import toast from "react-hot-toast";
import { useEffect } from "react";
import { Check, Loader2 } from "lucide-react";

const EASE = "ease-brand";

const fieldClasses = `w-full rounded-2xl border border-[#EFE6E6] bg-[#FBF8F8] px-4 py-2.5 font-body text-[13px] text-lyp-black outline-none transition-all duration-500 ${EASE} placeholder:text-[#C3B5B5] focus:border-lyp-cherry/30 focus:bg-lyp-white focus:shadow-[0_0_0_4px_rgba(178,38,38,0.07)]`;

const labelClasses =
  "mb-2 block font-body text-[10px] font-medium uppercase tracking-[0.22em] text-[#A89898]";

const errorClasses = "mt-1.5 font-body text-[11px] text-lyp-cherry";

type FormValues = {
  name: string;
  slug: string;
  entityName: string;
  abn: string;
  email: string;
};

type Props = {
  client?: {
    id: string;
    name: string;
    slug: string;
    abn?: string;
    entity_name?: string;
    email: string;
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
      email: client?.email ?? "",
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
      email: values.email || undefined,
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
      const email = values.email || "";
      const { data, error } = await createClient({
        ...payload,
        email,
      });
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
      className="max-w-xl rounded-3xl border border-[#EFE6E6] bg-lyp-white p-6 sm:p-7"
    >
      <div className="space-y-5">
        <div>
          <label htmlFor="client-name" className={labelClasses}>
            Name <span className="text-lyp-cherry">*</span>
          </label>
          <input
            id="client-name"
            placeholder="Client name"
            {...register("name", { required: "Name is required" })}
            className={fieldClasses}
          />
          {errors.name && <p className={errorClasses}>{errors.name.message}</p>}
        </div>

        <div>
          <label htmlFor="client-email" className={labelClasses}>
            Email <span className="text-lyp-cherry">*</span>
          </label>
          <input
            id="client-email"
            placeholder="name@example.com"
            {...register("email", { required: "Email is required" })}
            className={fieldClasses}
          />
          {errors.email && (
            <p className={errorClasses}>{errors.email.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="client-slug" className={labelClasses}>
            Slug
          </label>
          <input
            id="client-slug"
            {...register("slug")}
            readOnly={!isEditing}
            className={`${fieldClasses} ${!isEditing ? "text-[#8A7A7A]" : ""}`}
          />
          {!isEditing && (
            <p className="mt-1.5 font-body text-[11px] text-[#A89898]">
              Generated automatically from the name.
            </p>
          )}
        </div>

        <div>
          <label htmlFor="client-entity-name" className={labelClasses}>
            Entity Name
          </label>
          <input
            id="client-entity-name"
            placeholder="Registered trading entity"
            {...register("entityName")}
            className={fieldClasses}
          />
        </div>

        <div>
          <label htmlFor="client-abn" className={labelClasses}>
            ABN
          </label>
          <input
            id="client-abn"
            placeholder="00 000 000 000"
            {...register("abn")}
            className={`${fieldClasses} tabular-nums`}
          />
        </div>
      </div>

      <div className="mt-7 flex flex-wrap items-center gap-2.5 border-t border-[#F1E8E8] pt-6">
        <button
          type="submit"
          disabled={isSubmitting}
          className={`group inline-flex items-center gap-3 rounded-full bg-lyp-cherry py-1.5 pl-6 pr-1.5 font-body text-[13px] font-semibold tracking-wide text-lyp-white shadow-[0_10px_30px_-10px_rgba(178,38,38,0.5)] transition-all duration-500 ${EASE} hover:bg-[#c22e2e] active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none`}
        >
          {isSubmitting
            ? "Saving..."
            : isEditing
              ? "Update Client"
              : "Create Client"}
          <span
            className={`flex h-8 w-8 items-center justify-center rounded-full bg-lyp-white/15 transition-transform duration-500 ${EASE} group-hover:scale-105`}
          >
            {isSubmitting ? (
              <Loader2 strokeWidth={1.5} className="h-4 w-4 animate-spin" />
            ) : (
              <Check strokeWidth={1.5} className="h-4 w-4" />
            )}
          </span>
        </button>

        <button
          type="button"
          onClick={() => router.back()}
          className={`inline-flex items-center rounded-full border border-[#EFE6E6] bg-lyp-white px-5 py-2.5 font-body text-[13px] font-semibold tracking-wide text-lyp-black transition-all duration-500 ${EASE} hover:border-lyp-cherry/25 hover:text-lyp-cherry active:scale-[0.985]`}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
