"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Pencil, X } from "lucide-react";
import { updatePage } from "@/server-actions/pages";
import toast from "react-hot-toast";

const EASE = "ease-brand";

interface PageTitleFormProps {
  pageId: string;
  initialTitle: string;
  initialSlug: string;
}

/**
 * Inline title/slug editor for the page header.
 *
 * Sends only `title` and `slug` — `updatePage` applies a partial patch, so the
 * featured image and image position are left untouched.
 */
export default function PageTitleForm({
  pageId,
  initialTitle,
  initialSlug,
}: PageTitleFormProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState(initialTitle);
  const [slug, setSlug] = useState(initialSlug);
  // Kept so Cancel restores the last SAVED values, not the last typed ones.
  const [saved, setSaved] = useState({ title: initialTitle, slug: initialSlug });

  const cancel = () => {
    setTitle(saved.title);
    setSlug(saved.slug);
    setEditing(false);
  };

  const save = async () => {
    const nextTitle = title.trim();
    const nextSlug = slug.trim();
    if (!nextTitle) {
      toast.error("Title is required");
      return;
    }
    if (!nextSlug) {
      toast.error("Slug is required");
      return;
    }

    setSaving(true);
    const res = await updatePage(pageId, { title: nextTitle, slug: nextSlug });
    setSaving(false);

    if (res.error) {
      toast.error(res.error);
      return;
    }
    setSaved({ title: nextTitle, slug: nextSlug });
    setTitle(nextTitle);
    setSlug(nextSlug);
    setEditing(false);
    toast.success("Page updated");
    // The slug is part of the portal URL, so refresh rather than trusting
    // local state to stay in step with the rest of the page.
    router.refresh();
  };

  if (!editing) {
    return (
      <div className="group flex items-center gap-2">
        <div className="min-w-0">
          <h1 className="mt-3 truncate font-heading text-[28px] font-bold leading-[1.05] tracking-[-0.03em] text-lyp-black">
            {saved.title || "Untitled Page"}
          </h1>
          <p className="mt-1.5 truncate font-mono text-[11px] text-[#A89898]">
            /{saved.slug}
          </p>
        </div>
        <button
          onClick={() => setEditing(true)}
          title="Edit title and slug"
          aria-label="Edit title and slug"
          className={`mt-3 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-[#EFE6E6] text-[#A89898] opacity-0 transition-all duration-500 ${EASE} hover:border-lyp-cherry/25 hover:text-lyp-cherry focus:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lyp-cherry/30 group-hover:opacity-100`}
        >
          <Pencil strokeWidth={1.5} className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <div className="flex flex-col gap-1.5">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={saving}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") cancel();
          }}
          placeholder="Page title"
          aria-label="Page title"
          className={`w-[22rem] max-w-full rounded-2xl border border-[#EFE6E6] bg-[#FBF8F8] px-4 py-2.5 font-heading text-[20px] font-bold tracking-[-0.02em] text-lyp-black outline-none transition-all duration-500 ${EASE} placeholder:font-body placeholder:text-[15px] placeholder:font-medium placeholder:text-[#C3B5B5] focus:border-lyp-cherry/30 focus:bg-lyp-white focus:shadow-[0_0_0_4px_rgba(178,38,38,0.07)] disabled:opacity-50`}
        />
        <input
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          disabled={saving}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") cancel();
          }}
          placeholder="page-slug"
          aria-label="Page slug"
          className={`w-[22rem] max-w-full rounded-2xl border border-[#EFE6E6] bg-[#FBF8F8] px-4 py-2 font-mono text-[11px] text-[#8A7A7A] outline-none transition-all duration-500 ${EASE} placeholder:text-[#C3B5B5] focus:border-lyp-cherry/30 focus:bg-lyp-white focus:shadow-[0_0_0_4px_rgba(178,38,38,0.07)] disabled:opacity-50`}
        />
      </div>

      <button
        onClick={save}
        disabled={saving}
        title="Save"
        aria-label="Save"
        className={`flex h-9 w-9 items-center justify-center rounded-full bg-lyp-cherry text-lyp-white shadow-[0_10px_30px_-10px_rgba(178,38,38,0.5)] transition-all duration-500 ${EASE} hover:bg-[#c22e2e] active:scale-95 disabled:opacity-40 disabled:shadow-none`}
      >
        {saving ? (
          <Loader2 strokeWidth={1.5} className="h-4 w-4 animate-spin" />
        ) : (
          <Check strokeWidth={1.5} className="h-4 w-4" />
        )}
      </button>
      <button
        onClick={cancel}
        disabled={saving}
        title="Cancel"
        aria-label="Cancel"
        className={`flex h-9 w-9 items-center justify-center rounded-full border border-[#EFE6E6] bg-lyp-white text-[#A89898] transition-all duration-500 ${EASE} hover:border-lyp-cherry/25 hover:text-lyp-cherry active:scale-95 disabled:opacity-40`}
      >
        <X strokeWidth={1.5} className="h-4 w-4" />
      </button>
    </div>
  );
}
