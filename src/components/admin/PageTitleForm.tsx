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
        <div>
          <h1 className="text-2xl font-heading font-bold text-lyp-black">
            {saved.title || "Untitled Page"}
          </h1>
          <p className="text-sm text-gray-500 font-mono">/{saved.slug}</p>
        </div>
        <button
          onClick={() => setEditing(true)}
          title="Edit title and slug"
          aria-label="Edit title and slug"
          className={`rounded-lg p-2 text-gray-400 opacity-0 transition-all duration-300 ${EASE} group-hover:opacity-100 hover:bg-gray-100 hover:text-lyp-cherry focus:opacity-100`}
        >
          <Pencil className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
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
          className="w-[22rem] max-w-full rounded-lg border border-gray-300 px-3 py-1.5 font-heading text-xl font-bold text-lyp-black focus:border-lyp-cherry focus:outline-none focus:ring-2 focus:ring-lyp-cherry/30 disabled:opacity-50"
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
          className="w-[22rem] max-w-full rounded-lg border border-gray-300 px-3 py-1 font-mono text-xs text-gray-600 focus:border-lyp-cherry focus:outline-none focus:ring-2 focus:ring-lyp-cherry/30 disabled:opacity-50"
        />
      </div>

      <button
        onClick={save}
        disabled={saving}
        title="Save"
        aria-label="Save"
        className="rounded-lg p-2 text-green-600 transition-colors hover:bg-green-50 disabled:opacity-50"
      >
        {saving ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Check className="h-4 w-4" />
        )}
      </button>
      <button
        onClick={cancel}
        disabled={saving}
        title="Cancel"
        aria-label="Cancel"
        className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
