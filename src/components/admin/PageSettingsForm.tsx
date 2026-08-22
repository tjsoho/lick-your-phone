"use client";

import { useState } from "react";
import { Loader2, ImageIcon, Images, Trash2 } from "lucide-react";
import { updatePageImage } from "@/server-actions/pages";
import MediaLibraryModal from "./MediaLibraryModal";
import toast from "react-hot-toast";

interface PageSettingsFormProps {
  pageId: string;
  initialImage: string | null;
  initialPosition: string;
}

const ic =
  "w-full border border-gray-300 rounded-md px-3 py-2 font-body text-sm text-lyp-black focus:outline-none focus:ring-2 focus:ring-lyp-cherry/30 focus:border-lyp-cherry";

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
    <div className="space-y-4">
      <h2 className="font-heading text-lg font-semibold text-lyp-black flex items-center gap-2">
        <ImageIcon className="h-5 w-5 text-gray-400" /> Featured Image
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
        <div className="space-y-3">
          <div>
            <label className="block font-heading text-sm font-semibold text-lyp-black mb-1">
              Image
            </label>
            {image ? (
              <div className="relative w-full aspect-video rounded-lg overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image} alt="Featured" className="w-full h-full object-contain" />
                <button
                  onClick={handleRemove}
                  className="absolute top-2 right-2 p-1.5 rounded-md bg-black/50 text-white hover:bg-black/70 transition-colors"
                  title="Remove image"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setLibraryOpen(true)}
                className="w-full aspect-video rounded-lg border-2 border-dashed border-gray-300 hover:border-lyp-cherry/50 flex flex-col items-center justify-center gap-2 text-gray-400 hover:text-gray-500 transition-colors"
              >
                <Images className="h-8 w-8" />
                <span className="font-body text-sm">Choose from library</span>
              </button>
            )}
            {image && (
              <button
                onClick={() => setLibraryOpen(true)}
                className="mt-2 flex items-center gap-1.5 text-sm text-gray-500 hover:text-lyp-cherry font-body transition-colors"
              >
                <Images className="h-3.5 w-3.5" />
                Replace image
              </button>
            )}
          </div>
        </div>
        <div>
          <label className="block font-heading text-sm font-semibold text-lyp-black mb-1">
            Image Position
          </label>
          <select
            value={position}
            onChange={(e) => setPosition(e.target.value)}
            className={ic}
          >
            <option value="left">Left</option>
            <option value="right">Right</option>
          </select>
        </div>
      </div>
      <button
        onClick={handleSave}
        disabled={saving}
        className="flex items-center gap-1.5 bg-lyp-cherry text-white px-4 py-2 rounded-md font-body text-sm hover:bg-lyp-maroon transition-colors disabled:opacity-50"
      >
        {saving && <Loader2 className="h-4 w-4 animate-spin" />}
        Save Image Settings
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
