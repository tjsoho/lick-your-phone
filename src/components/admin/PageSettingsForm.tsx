"use client";

import { useState } from "react";
import { Loader2, ImageIcon, Images, Trash2, Check } from "lucide-react";
import { updatePageImage } from "@/server-actions/pages";
import MediaLibraryModal from "./MediaLibraryModal";
import toast from "react-hot-toast";

const EASE = "ease-brand";

interface PageSettingsFormProps {
  pageId: string;
  initialImage: string | null;
  initialPosition: string;
}

const ic =
  `w-full rounded-2xl border border-[#EFE6E6] bg-[#FBF8F8] px-4 py-2.5 font-body text-[13px] text-lyp-black outline-none transition-all duration-500 ${EASE} placeholder:text-[#C3B5B5] focus:border-lyp-cherry/30 focus:bg-lyp-white focus:shadow-[0_0_0_4px_rgba(178,38,38,0.07)]`;

const labelClasses =
  "block font-body text-[10px] font-medium uppercase tracking-[0.22em] text-[#A89898]";

export function PageSettingsForm({ pageId, initialImage, initialPosition }: PageSettingsFormProps) {
  const [image, setImage] = useState(initialImage ?? "");
  const [position, setPosition] = useState(initialPosition);
  const [saving, setSaving] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);

  const handleRemove = () => setImage("");

  const handleSave = async () => {
    setSaving(true);
    const res = await updatePageImage(pageId, {
      featured_image: image.trim() || null,
      image_position: position,
    });
    setSaving(false);
    if (res.error) toast.error(res.error);
    else toast.success("Image settings saved");
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-lyp-cherry/[0.06] ring-1 ring-lyp-cherry/10">
          <ImageIcon strokeWidth={1.25} className="h-4 w-4 text-lyp-cherry" />
        </span>
        <h2 className="font-heading text-[16px] font-bold tracking-[-0.02em] text-lyp-black">
          Featured Image
        </h2>
      </div>

      <div className="grid grid-cols-1 items-start gap-5 md:grid-cols-2">
        <div className="space-y-3">
          <div>
            <span className={labelClasses}>Image</span>
            {image ? (
              <div className="mt-2">
                <div className="relative inline-block max-w-full">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={image}
                    alt="Featured"
                    className="max-h-56 w-auto max-w-full rounded-xl object-contain"
                  />
                  <button
                    onClick={handleRemove}
                    title="Remove image"
                    aria-label="Remove featured image"
                    className={`absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-[#1a0606]/45 text-lyp-white backdrop-blur-sm transition-all duration-500 ${EASE} hover:bg-lyp-cherry active:scale-95`}
                  >
                    <Trash2 strokeWidth={1.5} className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setLibraryOpen(true)}
                className={`mt-2 flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#EFE6E6] bg-[#FBF8F8] text-[#A89898] transition-all duration-500 ${EASE} hover:border-lyp-cherry/30 hover:text-lyp-cherry`}
              >
                <Images strokeWidth={1.25} className="h-7 w-7" />
                <span className="font-body text-[13px]">Choose from library</span>
              </button>
            )}
            {image && (
              <button
                onClick={() => setLibraryOpen(true)}
                className={`mt-3 flex items-center gap-1.5 font-body text-[12.5px] font-medium text-[#8A7A7A] transition-colors duration-500 ${EASE} hover:text-lyp-cherry`}
              >
                <Images strokeWidth={1.5} className="h-3.5 w-3.5" />
                Replace image
              </button>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="page-image-position" className={labelClasses}>
            Image Position
          </label>
          <select
            id="page-image-position"
            value={position}
            onChange={(e) => setPosition(e.target.value)}
            className={`${ic} mt-2`}
          >
            <option value="left">Left</option>
            <option value="right">Right</option>
          </select>
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className={`group inline-flex items-center gap-3 rounded-full bg-lyp-cherry py-1.5 pl-6 pr-1.5 font-body text-[13px] font-semibold tracking-wide text-lyp-white shadow-[0_10px_30px_-10px_rgba(178,38,38,0.5)] transition-all duration-500 ${EASE} hover:bg-[#c22e2e] active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none`}
      >
        Save Image Settings
        <span
          className={`flex h-8 w-8 items-center justify-center rounded-full bg-lyp-white/15 transition-transform duration-500 ${EASE} group-hover:scale-105`}
        >
          {saving ? (
            <Loader2 strokeWidth={1.5} className="h-4 w-4 animate-spin" />
          ) : (
            <Check strokeWidth={1.5} className="h-4 w-4" />
          )}
        </span>
      </button>

      <MediaLibraryModal
        open={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        onSelect={setImage}
        title="Featured Image"
      />
    </div>
  );
}
