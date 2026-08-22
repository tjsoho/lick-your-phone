"use client";

import {
  getAllImages,
  uploadImage,
  MAX_BATCH_SIZE,
  type MediaItem,
} from "@/utils/storage";
import { formatBytes } from "@/utils/image-compression";
import { Check, ImageIcon, Loader2, Search, Upload, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";

const EASE = "ease-brand";

interface MediaLibraryModalProps {
  open: boolean;
  onClose: () => void;
  /** Called with the chosen image's public URL. */
  onSelect: (url: string) => void;
  /**
   * Allow picking several images in one visit. `onSelect` still fires per
   * image, in the order they were chosen, so callers that append a row per
   * image need no special handling.
   */
  multiple?: boolean;
  title?: string;
}

export default function MediaLibraryModal({
  open,
  onClose,
  onSelect,
  multiple = false,
  title = "Media Library",
}: MediaLibraryModalProps) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [query, setQuery] = useState("");
  // Ordered so a multi-select preserves the click order in the result.
  const [selected, setSelected] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    const images = await getAllImages();
    setItems(images);
    setLoading(false);
  }, []);

  // Load on open, and reset transient state on close.
  useEffect(() => {
    if (!open) {
      setSelected([]);
      setQuery("");
      setProgress(null);
      return;
    }
    refresh();
  }, [open, refresh]);

  // Escape to dismiss, and stop the page behind from scrolling.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  async function handleFiles(files: FileList | File[]) {
    const list = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (list.length === 0) {
      toast.error("Only image files can be uploaded");
      return;
    }

    const batchBytes = list.reduce((sum, f) => sum + f.size, 0);
    if (batchBytes > MAX_BATCH_SIZE) {
      toast.error(
        `That selection is ${formatBytes(batchBytes)} — the limit is ${formatBytes(MAX_BATCH_SIZE)} at a time`,
      );
      return;
    }

    setUploading(true);
    setProgress({ done: 0, total: list.length });

    // Sequential: each file is decoded to a full-size bitmap during
    // compression, and doing 20 large ones at once would spike memory.
    const results = [];
    for (const file of list) {
      results.push(await uploadImage(file));
      setProgress((p) => (p ? { ...p, done: p.done + 1 } : p));
    }

    setUploading(false);
    setProgress(null);

    const failed = results.filter((r) => r.error);
    const succeeded = results.filter((r) => !r.error && r.url);

    if (failed.length) toast.error(failed[0].error?.message ?? "Upload failed");

    if (succeeded.length) {
      const before = succeeded.reduce((sum, r) => sum + r.originalSize, 0);
      const after = succeeded.reduce((sum, r) => sum + r.uploadedSize, 0);
      const saved = before > 0 ? Math.round((1 - after / before) * 100) : 0;

      const label =
        succeeded.length === 1 ? "Image uploaded" : `${succeeded.length} images uploaded`;

      toast.success(
        saved > 0
          ? `${label} · ${formatBytes(before)} → ${formatBytes(after)} (${saved}% smaller)`
          : label,
      );

      // Preselect the newest upload so one click confirms it.
      setSelected((prev) =>
        multiple
          ? [...prev, ...succeeded.map((r) => r.url)]
          : [succeeded[succeeded.length - 1].url],
      );
      await refresh();
    }
  }

  const toggle = (url: string) =>
    setSelected((prev) =>
      prev.includes(url)
        ? prev.filter((u) => u !== url)
        : multiple
          ? [...prev, url]
          : [url],
    );

  const confirm = (urls: string[]) => {
    if (urls.length === 0) return;
    urls.forEach(onSelect);
    onClose();
  };

  if (!open) return null;

  const visible = query.trim()
    ? items.filter((i) =>
        i.name.toLowerCase().includes(query.trim().toLowerCase()),
      )
    : items;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="absolute inset-0 bg-[#1a0606]/50 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative flex max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-[#EFE6E6] bg-lyp-white shadow-[0_40px_80px_-24px_rgba(61,11,17,0.45)]">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 border-b border-[#F1E8E8] px-6 py-5">
          <div>
            <div className="flex items-center gap-3">
              <span className="h-px w-7 bg-lyp-cherry/30" />
              <span className="font-body text-[10px] font-medium uppercase tracking-[0.32em] text-lyp-cherry/70">
                Images
              </span>
            </div>
            <h2 className="mt-2 font-heading text-[20px] font-bold tracking-[-0.02em] text-lyp-black">
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close media library"
            className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-[#EFE6E6] text-[#A89898] transition-all duration-500 ${EASE} hover:border-lyp-cherry/25 hover:text-lyp-cherry active:scale-95`}
          >
            <X strokeWidth={1.5} className="h-4 w-4" />
          </button>
        </div>

        {/* Upload + search */}
        <div className="border-b border-[#F1E8E8] px-6 py-4">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files);
            }}
            onClick={() => fileRef.current?.click()}
            className={`flex cursor-pointer items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-4 py-5 transition-all duration-500 ${EASE} ${
              dragging
                ? "border-lyp-cherry/50 bg-lyp-cherry/[0.04]"
                : "border-[#EFE6E6] bg-[#FBF8F8] hover:border-lyp-cherry/30"
            }`}
          >
            {uploading ? (
              <Loader2
                strokeWidth={1.5}
                className="h-5 w-5 animate-spin text-lyp-cherry"
              />
            ) : (
              <Upload strokeWidth={1.25} className="h-5 w-5 text-[#A89898]" />
            )}
            <span className="font-body text-[13px] text-[#8A7A7A]">
              {uploading
                ? progress
                  ? `Compressing and uploading ${progress.done + 1} of ${progress.total}…`
                  : "Uploading…"
                : "Drop images here, or click to upload"}
            </span>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.length) handleFiles(e.target.files);
              if (fileRef.current) fileRef.current.value = "";
            }}
          />

          <div className="relative mt-4">
            <Search
              strokeWidth={1.5}
              className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#C3B5B5]"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by filename…"
              className={`w-full rounded-2xl border border-[#EFE6E6] bg-[#FBF8F8] py-2.5 pl-11 pr-4 font-body text-[13px] text-lyp-black outline-none transition-all duration-500 ${EASE} placeholder:text-[#C3B5B5] focus:border-lyp-cherry/40 focus:bg-lyp-white focus:shadow-[0_0_0_4px_rgba(178,38,38,0.07)]`}
            />
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading ? (
            <div className="flex items-center justify-center gap-2.5 py-16">
              <Loader2
                strokeWidth={1.5}
                className="h-4 w-4 animate-spin text-lyp-cherry"
              />
              <span className="font-body text-[13px] text-[#8A7A7A]">
                Loading library…
              </span>
            </div>
          ) : visible.length === 0 ? (
            <div className="py-16 text-center">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-lyp-cherry/[0.05] ring-1 ring-lyp-cherry/10">
                <ImageIcon
                  strokeWidth={1}
                  className="h-6 w-6 text-lyp-cherry/60"
                />
              </span>
              <p className="mt-5 font-body text-[14px] text-[#8A7A7A]">
                {query.trim()
                  ? `Nothing matches “${query.trim()}”.`
                  : "No images in the library yet."}
              </p>
              {!query.trim() && (
                <p className="mt-1 font-body text-[13px] text-[#C3B5B5]">
                  Upload one above to get started.
                </p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {visible.map((item) => {
                const isSelected = selected.includes(item.url);
                const order = selected.indexOf(item.url) + 1;
                return (
                  <button
                    key={item.url}
                    type="button"
                    onClick={() => toggle(item.url)}
                    onDoubleClick={() => confirm([item.url])}
                    title={item.name}
                    className={`group relative overflow-hidden rounded-2xl border text-left transition-all duration-500 ${EASE} ${
                      isSelected
                        ? "border-lyp-cherry/40 shadow-[0_0_0_3px_rgba(178,38,38,0.12)]"
                        : "border-[#EFE6E6] hover:border-lyp-cherry/25"
                    }`}
                  >
                    <div className="aspect-square w-full overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.url}
                        alt={item.name}
                        loading="lazy"
                        className={`h-full w-full object-contain transition-transform duration-700 ${EASE} group-hover:scale-[1.03]`}
                      />
                    </div>

                    {isSelected && (
                      <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-lyp-cherry text-lyp-white shadow-[0_4px_12px_-2px_rgba(178,38,38,0.6)]">
                        {multiple ? (
                          <span className="font-body text-[11px] font-semibold tabular-nums">
                            {order}
                          </span>
                        ) : (
                          <Check strokeWidth={2.5} className="h-3.5 w-3.5" />
                        )}
                      </span>
                    )}

                    <div className="border-t border-[#F1E8E8] bg-lyp-white px-3 py-2">
                      <p className="truncate font-body text-[11px] text-lyp-black">
                        {item.name}
                      </p>
                      {item.size > 0 && (
                        <p className="mt-0.5 font-body text-[10px] tabular-nums text-[#C3B5B5]">
                          {formatBytes(item.size)}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-4 border-t border-[#F1E8E8] bg-[#FCFAFA] px-6 py-4">
          <p className="font-body text-[11px] text-[#A89898]">
            {visible.length} image{visible.length === 1 ? "" : "s"}
            {" · up to "}
            {formatBytes(MAX_BATCH_SIZE)} per upload, auto-compressed
            {multiple
              ? " · click to select several"
              : selected.length > 0
                ? " · double-click to use instantly"
                : ""}
          </p>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className={`inline-flex items-center rounded-full border border-[#EFE6E6] bg-lyp-white px-5 py-2 font-body text-[13px] font-semibold text-lyp-black transition-all duration-500 ${EASE} hover:border-lyp-cherry/25 hover:text-lyp-cherry active:scale-[0.985]`}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={selected.length === 0}
              onClick={() => confirm(selected)}
              className={`group inline-flex items-center gap-3 rounded-full bg-lyp-cherry py-1.5 pl-6 pr-1.5 font-body text-[13px] font-semibold tracking-wide text-lyp-white shadow-[0_10px_30px_-10px_rgba(178,38,38,0.5)] transition-all duration-500 ${EASE} hover:bg-[#c22e2e] active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none`}
            >
              {multiple && selected.length > 1
                ? `Use ${selected.length} images`
                : "Use image"}
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full bg-lyp-white/15 transition-transform duration-500 ${EASE} group-hover:scale-105`}
              >
                <Check strokeWidth={1.5} className="h-4 w-4" />
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
