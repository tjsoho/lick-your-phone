"use client";

import { useEffect, useState } from "react";
import { ImageIcon, Images, Trash2 } from "lucide-react";
import { updatePageImage } from "@/server-actions/pages";
import MediaLibraryModal from "./MediaLibraryModal";
import { useAutosave } from "@/hooks/use-autosave";
import SaveStatusBadge from "@/components/admin/SaveStatusBadge";

const EASE = "ease-brand";

interface PageSettingsFormProps {
  /** Called whenever the image or its side changes, for the live preview. */
  onDraftChange?: (draft: {
    featuredImage: string | null;
    imagePosition: string;
  }) => void;
  pageId: string;
  initialImage: string | null;
  initialPosition: string;
}

const ic =
  `w-full rounded-2xl border border-[#EFE6E6] bg-[#FBF8F8] px-4 py-2.5 font-body text-[13px] text-lyp-black outline-none transition-all duration-500 ${EASE} placeholder:text-[#C3B5B5] focus:border-lyp-cherry/30 focus:bg-lyp-white focus:shadow-[0_0_0_4px_rgba(178,38,38,0.07)]`;

const labelClasses =
  "block font-body text-[10px] font-medium uppercase tracking-[0.22em] text-[#A89898]";

export function PageSettingsForm({ pageId, initialImage, initialPosition, onDraftChange }: PageSettingsFormProps) {
  const [image, setImage] = useState(initialImage ?? "");
  const [position, setPosition] = useState(initialPosition);
  const [libraryOpen, setLibraryOpen] = useState(false);

  useEffect(() => {
    onDraftChange?.({ featuredImage: image || null, imagePosition: position });
  }, [image, position, onDraftChange]);

  const handleRemove = () => setImage("");

  const { status } = useAutosave(
    { featured_image: image.trim() || null, image_position: position },
    async (value) => {
      const res = await updatePageImage(pageId, value);
      return { error: res.error };
    },
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-lyp-cherry/[0.06] ring-1 ring-lyp-cherry/10">
            <ImageIcon strokeWidth={1.25} className="h-4 w-4 text-lyp-cherry" />
          </span>
          <h2 className="font-heading text-[16px] font-bold tracking-[-0.02em] text-lyp-black">
            Featured Image
          </h2>
        </div>
        <SaveStatusBadge status={status} />
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

      <MediaLibraryModal
        open={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        onSelect={setImage}
        title="Featured Image"
      />
    </div>
  );
}
