"use client";

import { useEffect, useState } from "react";
import { Images, Trash2, Type } from "lucide-react";
import {
  COPY_REGISTRY,
  type CopyKind,
  type CopyOverrides,
  type CopySlot,
} from "@/lib/portal-copy";
import { updatePageCopy } from "@/server-actions/pages";
import { useAutosave } from "@/hooks/use-autosave";
import SaveStatusBadge from "@/components/admin/SaveStatusBadge";
import MediaLibraryModal from "./MediaLibraryModal";

const EASE = "ease-brand";

const fieldClasses = `w-full rounded-2xl border border-[#EFE6E6] bg-[#FBF8F8] px-4 py-2.5 font-body text-[13px] text-lyp-black outline-none transition-all duration-500 ${EASE} placeholder:text-[#C3B5B5] focus:border-lyp-cherry/30 focus:bg-lyp-white focus:shadow-[0_0_0_4px_rgba(178,38,38,0.07)]`;

const labelClasses =
  "block font-body text-[10px] font-medium uppercase tracking-[0.22em] text-[#A89898]";

const quietButton = `flex items-center gap-1.5 font-body text-[12.5px] font-medium text-[#8A7A7A] transition-colors duration-500 ${EASE} hover:text-lyp-cherry`;

const KIND_LABELS: Record<CopyKind, string> = {
  cover: "Cover",
  service: "Service",
  results: "Client Results",
  summary: "Summary",
  signature: "Signature",
  payment: "Payment",
  intake: "Onboarding",
  global: "Every Slide",
};

/**
 * The size to upload an image slot at, keyed `kind.slotKey`.
 *
 * Derived from how the slot is actually drawn: the cover logo runs through
 * `<Logo>` at h-14/h-16 — 64 CSS pixels tall — so 2x screens want ~128, and a
 * wordmark at that height is around 3:1.
 */
const IMAGE_SIZE_HINTS: Record<string, string> = {
  "cover.logo": "Recommended 600 x 200px (transparent PNG)",
};

/** Overrides with blank values removed, so an empty field means "use the default". */
export function cleanCopy(copy: CopyOverrides): CopyOverrides {
  return Object.fromEntries(
    Object.entries(copy).filter(([, value]) => value.trim() !== ""),
  );
}

type CopyFieldsProps = {
  kinds: CopyKind[];
  value: CopyOverrides;
  onChange: (next: CopyOverrides) => void;
  /** Keeps input ids unique when more than one set of fields is on screen. */
  idPrefix?: string;
};

/**
 * One field per registered wording slot. The default is the placeholder, so
 * an untouched field shows exactly what the client will read.
 */
export function CopyFields({
  kinds,
  value,
  onChange,
  idPrefix = "copy",
}: CopyFieldsProps) {
  // The kind travels with the slot so the media library can be told the same
  // recommended size the field shows.
  const [librarySlot, setLibrarySlot] = useState<{
    kind: CopyKind;
    slot: CopySlot;
  } | null>(null);

  const set = (key: string, next: string) =>
    onChange({ ...value, [key]: next });

  const reset = (key: string) => {
    const next = { ...value };
    delete next[key];
    onChange(next);
  };

  return (
    <div className="space-y-6">
      {kinds.map((kind) => (
        <div key={kind}>
          {kinds.length > 1 && (
            <div className="mb-4 flex items-center gap-2.5">
              <span className="h-px w-5 bg-lyp-cherry/30" />
              <span className="font-body text-[10px] font-medium uppercase tracking-[0.28em] text-lyp-cherry/70">
                {KIND_LABELS[kind]}
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {COPY_REGISTRY[kind].map((slot) => {
              const id = `${idPrefix}-${kind}-${slot.key}`;
              const current = value[slot.key] ?? "";
              const overridden = current.trim() !== "";
              const wide = slot.multiline || slot.image;
              const sizeHint = IMAGE_SIZE_HINTS[`${kind}.${slot.key}`];

              return (
                <div key={slot.key} className={wide ? "sm:col-span-2" : ""}>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    {slot.image ? (
                      <span className={labelClasses}>{slot.label}</span>
                    ) : (
                      <label htmlFor={id} className={labelClasses}>
                        {slot.label}
                      </label>
                    )}
                    {overridden && !slot.image && (
                      <button
                        type="button"
                        onClick={() => reset(slot.key)}
                        className={`font-body text-[10px] font-medium uppercase tracking-[0.18em] text-[#A89898] transition-colors duration-500 ${EASE} hover:text-lyp-cherry`}
                      >
                        Reset
                      </button>
                    )}
                  </div>

                  {slot.image ? (
                    <div>
                      {sizeHint && (
                        <p className="mb-2 font-body text-[11px] text-[#A89898]">
                          {sizeHint}
                        </p>
                      )}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={overridden ? current : slot.default}
                        alt={slot.label}
                        className="max-h-24 w-auto max-w-full rounded-lg object-contain"
                      />
                      <div className="mt-3 flex flex-wrap items-center gap-4">
                        <button
                          type="button"
                          onClick={() => setLibrarySlot({ kind, slot })}
                          className={quietButton}
                        >
                          <Images strokeWidth={1.5} className="h-3.5 w-3.5" />
                          Choose from library
                        </button>
                        {overridden ? (
                          <button
                            type="button"
                            onClick={() => reset(slot.key)}
                            className={quietButton}
                          >
                            <Trash2 strokeWidth={1.5} className="h-3.5 w-3.5" />
                            Remove
                          </button>
                        ) : (
                          <span className="font-body text-[11px] text-[#A89898]">
                            Using the default
                          </span>
                        )}
                      </div>
                    </div>
                  ) : slot.multiline ? (
                    <textarea
                      id={id}
                      value={current}
                      onChange={(e) => set(slot.key, e.target.value)}
                      placeholder={slot.default}
                      rows={3}
                      className={`${fieldClasses} resize-y leading-relaxed`}
                    />
                  ) : (
                    <input
                      id={id}
                      value={current}
                      onChange={(e) => set(slot.key, e.target.value)}
                      placeholder={slot.default}
                      className={fieldClasses}
                    />
                  )}

                  {slot.hint && (
                    <p className="mt-1.5 font-body text-[11px] leading-relaxed text-[#A89898]">
                      {slot.hint}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <MediaLibraryModal
        open={librarySlot !== null}
        onClose={() => setLibrarySlot(null)}
        onSelect={(url) => {
          if (librarySlot) set(librarySlot.slot.key, url);
        }}
        title={librarySlot?.slot.label}
        hint={
          librarySlot
            ? IMAGE_SIZE_HINTS[`${librarySlot.kind}.${librarySlot.slot.key}`]
            : undefined
        }
      />
    </div>
  );
}

type Props = {
  pageId: string;
  kinds: CopyKind[];
  initialCopy: CopyOverrides;
  /** Called on every keystroke so the live preview can follow along. */
  onDraftChange?: (copy: CopyOverrides) => void;
};

/** The fixed wording on one page — labels, buttons, messages — saved as you type. */
export default function PageWordingForm({
  pageId,
  kinds,
  initialCopy,
  onDraftChange,
}: Props) {
  const [copy, setCopy] = useState<CopyOverrides>(initialCopy);

  useEffect(() => {
    onDraftChange?.(cleanCopy(copy));
  }, [copy, onDraftChange]);

  const { status } = useAutosave(cleanCopy(copy), (value) =>
    updatePageCopy(pageId, value),
  );

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-lyp-cherry/[0.06] ring-1 ring-lyp-cherry/10">
            <Type strokeWidth={1.25} className="h-4 w-4 text-lyp-cherry" />
          </span>
          <div>
            <h2 className="font-heading text-[16px] font-bold tracking-[-0.02em] text-lyp-black">
              Page Wording
            </h2>
            <p className="mt-1 font-body text-[12.5px] leading-relaxed text-[#8A7A7A]">
              The labels, buttons and messages on this slide. Leave a field
              empty to use the wording shown in it.
            </p>
          </div>
        </div>
        <SaveStatusBadge status={status} />
      </div>

      <CopyFields
        kinds={kinds}
        value={copy}
        onChange={setCopy}
        idPrefix={`page-${pageId}`}
      />
    </div>
  );
}
