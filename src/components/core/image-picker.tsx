"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useImageLibrary } from "@/contexts/ImageLibraryContext";
import { ImageIcon, X } from "lucide-react";

interface ImagePickerProps {
    value: string;
    onChange: (url: string) => void;
    label?: string;
    className?: string;
    usage?: "mobile" | "desktop" | string;
    placeholder?: string;
}

export default function ImagePicker({
    value,
    onChange,
    label,
    className = "",
    usage,
    placeholder = "No image selected",
}: ImagePickerProps) {
    const { openImageLibrary } = useImageLibrary();
    const [previewError, setPreviewError] = useState(false);

    // Reset preview error when value changes
    useEffect(() => {
        setPreviewError(false);
    }, [value]);

    const handleSelectImage = () => {
        openImageLibrary(onChange, usage);
    };

    const handleClearImage = () => {
        onChange("");
        setPreviewError(false);
    };

    // Validate and get image URL
    const getValidImageSrc = (src: string) => {
        if (!src || src === "" || src === "undefined" || src === "null") {
            return null;
        }

        try {
            new URL(src);
            return src;
        } catch {
            if (src.startsWith("/")) {
                return src;
            }
            return null;
        }
    };

    const validSrc = getValidImageSrc(value);
    const hasImage = validSrc && !previewError;

    return (
        <div className={`space-y-2 ${className}`}>
            {label && (
                <label className="text-sm font-medium block">{label}</label>
            )}

            <div className="flex items-start gap-3">
                {/* Preview */}
                <div className="flex-shrink-0">
                    {hasImage ? (
                        <div className="relative w-32 h-32 border-2 border-gray-300 rounded-lg overflow-hidden bg-gray-50">
                            <Image
                                key={validSrc}
                                src={validSrc}
                                alt="Preview"
                                fill
                                className="object-contain"
                                onError={() => setPreviewError(true)}
                            />
                            <button
                                type="button"
                                onClick={handleClearImage}
                                className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                                title="Remove image"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </div>
                    ) : (
                        <div className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
                            <ImageIcon className="w-8 h-8 text-gray-400" />
                        </div>
                    )}
                </div>

                {/* Controls */}
                <div className="flex-1 space-y-2">
                    <button
                        type="button"
                        onClick={handleSelectImage}
                        className="w-full px-4 py-2 bg-brand-green text-white rounded-lg hover:bg-brand-green/90 transition-colors font-medium"
                    >
                        {hasImage ? "Change Image" : "Select Image"}
                    </button>

                    <div className="text-sm text-gray-500">
                        {hasImage ? (
                            <div className="break-all">
                                <span className="font-medium">Current:</span>{" "}
                                {value}
                            </div>
                        ) : (
                            <span>{placeholder}</span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
