"use client";

import { useState, useRef } from "react";
import { Loader2, ImageIcon, Upload, Trash2 } from "lucide-react";
import { updatePageImage } from "@/server-actions/pages";
import { uploadImage } from "@/utils/storage";
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
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const result = await uploadImage(file);
    setUploading(false);
    if (result.error) {
      toast.error(result.error.message);
    } else {
      setImage(result.url);
      toast.success("Image uploaded");
    }
    if (fileRef.current) fileRef.current.value = "";
  };

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
              <div className="relative w-full aspect-video rounded-lg border border-gray-200 overflow-hidden bg-gray-50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image} alt="Featured" className="w-full h-full object-cover" />
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
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="w-full aspect-video rounded-lg border-2 border-dashed border-gray-300 hover:border-lyp-cherry/50 flex flex-col items-center justify-center gap-2 text-gray-400 hover:text-gray-500 transition-colors"
              >
                {uploading ? (
                  <Loader2 className="h-8 w-8 animate-spin" />
                ) : (
                  <>
                    <Upload className="h-8 w-8" />
                    <span className="font-body text-sm">Click to upload</span>
                  </>
                )}
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handleUpload}
              className="hidden"
            />
            {image && (
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="mt-2 flex items-center gap-1.5 text-sm text-gray-500 hover:text-lyp-cherry font-body transition-colors disabled:opacity-50"
              >
                {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
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
    </div>
  );
}
