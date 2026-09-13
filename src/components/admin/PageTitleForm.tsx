"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { updatePage } from "@/server-actions/pages";
import { updateService } from "@/server-actions/services";
import { useAutosave } from "@/hooks/use-autosave";
import SaveStatusBadge from "@/components/admin/SaveStatusBadge";

const EASE = "ease-brand";

const labelClasses =
  "mb-2 block font-body text-[10px] font-medium uppercase tracking-[0.22em] text-[#A89898]";

interface PageTitleFormProps {
  /** Called on every keystroke so a live preview can follow along. */
  onDraftChange?: (title: string) => void;
  pageId: string;
  initialTitle: string;
  initialSlug: string;
  /**
   * Set on a service page. The slide, summary and contract all show the
   * service's name rather than the page title, so the title field edits both.
   */
  serviceId?: string;
  /** The service's current name, shown in place of the page title if given. */
  initialServiceName?: string;
}

/**
 * Title and slug, saved as you type.
 *
 * Sends only `title` and `slug` — `updatePage` applies a partial patch, so the
 * featured image and image position are left untouched. On a service page the
 * title is also written to `services.name`; the service slug is never touched.
 */
export default function PageTitleForm({
  pageId,
  initialTitle,
  initialSlug,
  onDraftChange,
  serviceId,
  initialServiceName,
}: PageTitleFormProps) {
  const router = useRouter();
  const isService = !!serviceId;
  const [title, setTitle] = useState(
    isService ? (initialServiceName ?? initialTitle) : initialTitle,
  );
  const [slug, setSlug] = useState(initialSlug);

  useEffect(() => {
    onDraftChange?.(title);
  }, [title, onDraftChange]);

  // A half-typed title or slug is never worth writing, so hold the last good
  // value until both fields have something in them again.
  const isValid = title.trim() !== "" && slug.trim() !== "";

  const { status } = useAutosave(
    { title: title.trim(), slug: slug.trim() },
    async (value) => {
      const res = await updatePage(pageId, value);
      if (!res.error && serviceId) {
        const svc = await updateService(serviceId, { name: value.title });
        if (svc.error) return { error: svc.error };
      }
      if (!res.error) {
        // The slug is part of the portal URL, so let the rest of the page
        // catch up rather than trusting local state.
        router.refresh();
      }
      return { error: res.error };
    },
    { enabled: isValid },
  );

  const fieldClasses = `w-full rounded-2xl border border-[#EFE6E6] bg-[#FBF8F8] px-4 py-2.5 font-body text-[13px] text-lyp-black outline-none transition-all duration-500 ${EASE} placeholder:text-[#C3B5B5] focus:border-lyp-cherry/30 focus:bg-lyp-white focus:shadow-[0_0_0_4px_rgba(178,38,38,0.07)]`;

  return (
    <div>
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="font-heading text-[15px] font-bold tracking-[-0.01em] text-lyp-black">
          {isService ? "Name" : "Title"} &amp; Address
        </h2>
        <SaveStatusBadge status={status} />
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="page-title" className={labelClasses}>
            {isService ? "Service name" : "Page Title"}
          </label>
          <input
            id="page-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={isService ? "Service name" : "Page title"}
            className={fieldClasses}
          />
          {isService && (
            <p className="mt-1.5 font-body text-[11px] text-[#A89898]">
              Shown on the slide, the summary and the contract.
            </p>
          )}
        </div>

        <div>
          <label htmlFor="page-slug" className={labelClasses}>
            Slug
          </label>
          <input
            id="page-slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="page-slug"
            className={`${fieldClasses} font-mono text-[11px] text-[#8A7A7A]`}
          />
          <p className="mt-1.5 font-body text-[11px] text-[#A89898]">
            Part of the portal address. Cover, Summary, Signature, Payment and
            Onboarding are found by slug — renaming those breaks the flow.
          </p>
        </div>
      </div>
    </div>
  );
}
