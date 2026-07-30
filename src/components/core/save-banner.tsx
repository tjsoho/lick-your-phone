"use client";

import Link from "next/link";
import { ExternalLink, LayoutGrid, Save } from "lucide-react";

interface SaveBannerProps {
    pageTitle: string;
    onSave: () => void;
    isSaving?: boolean;
    saveStatus?: "idle" | "success" | "error";
}

export function SaveBanner({
    pageTitle,
    onSave,
    isSaving = false,
    saveStatus = "idle",
}: SaveBannerProps) {
    const monogram = (pageTitle?.[0] || "A").toUpperCase();

    const saveLabel = isSaving
        ? "Saving…"
        : saveStatus === "success"
          ? "Saved"
          : saveStatus === "error"
            ? "Error — retry"
            : "Save changes";

    const saveTone =
        saveStatus === "success"
            ? "bg-brand-green text-white border-brand-green"
            : saveStatus === "error"
              ? "bg-red-600 text-white border-red-700"
              : "bg-brand-green text-white border-brand-green hover:bg-brand-green/90";

    return (
        <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-[rgba(18,23,23,0.10)] shadow-sm">
            <div className="mx-auto max-w-7xl px-4 lg:px-6">
                <div className="flex flex-wrap items-center justify-between gap-3 py-3 sm:h-16 sm:py-0">
                    {/* Identity */}
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-cream text-brand-green">
                            <span className="text-sm font-bold">
                                {monogram}
                            </span>
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-brand-black/50 leading-none">
                                Editing
                            </p>
                            <h1 className="text-base font-semibold text-brand-black leading-tight truncate">
                                {pageTitle}
                            </h1>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <Link
                            href="/admin"
                            className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(18,23,23,0.12)] bg-white px-3 py-1.5 text-xs font-semibold text-brand-black/75 hover:bg-[#f5f5f3] hover:text-brand-black transition-colors"
                        >
                            <LayoutGrid className="w-3.5 h-3.5" />
                            Dashboard
                        </Link>
                        <Link
                            href="/"
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(18,23,23,0.12)] bg-white px-3 py-1.5 text-xs font-semibold text-brand-black/75 hover:bg-[#f5f5f3] hover:text-brand-black transition-colors"
                        >
                            <ExternalLink className="w-3.5 h-3.5" />
                            View site
                        </Link>
                        <button
                            onClick={onSave}
                            disabled={isSaving}
                            aria-label={saveLabel}
                            className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-xs font-bold transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${saveTone}`}
                        >
                            <Save className="w-3.5 h-3.5" />
                            {saveLabel}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
