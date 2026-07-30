"use client";

import { useState } from "react";
import Image from "next/image";
import { useImageLibrary } from "@/contexts/ImageLibraryContext";

interface EditableImageProps {
    src?: string;
    imageUrl?: string;
    alt?: string;
    className?: string;
    width?: number;
    height?: number;
    onImageChange?: (url: string) => void;
    setImageUrl?: (url: string) => void;
    usage?: "mobile" | "desktop" | string;
    sectionName?: string;
    title?: string;
}

export default function EditableImage({
    src,
    imageUrl,
    alt = "Editable Image",
    className = "",
    width = 400,
    height = 300,
    onImageChange,
    setImageUrl,
    usage,
    sectionName,
    title,
}: EditableImageProps) {
    const [isHovered, setIsHovered] = useState(false);
    const { openImageLibrary } = useImageLibrary();

    // Use imageUrl if provided, otherwise use src
    const imageSrc = imageUrl || src || "";

    // Use setImageUrl if provided, otherwise use onImageChange
    const handleImageChange = setImageUrl || onImageChange || (() => {});

    const handleClick = () => {
        openImageLibrary(handleImageChange, usage || sectionName);
    };

    // Validate and fix image URL
    const getValidImageSrc = (src: string) => {
        if (!src || src === "" || src === "undefined" || src === "null") {
            return "/placeholder.jpg";
        }

        // Check if it's a valid URL or path
        try {
            new URL(src);
            return src;
        } catch {
            // If it's not a valid URL, check if it starts with /
            if (src.startsWith("/")) {
                return src;
            }
            return "/placeholder.jpg";
        }
    };

    return (
        <div className="space-y-2">
            {title && (
                <label className="block text-sm font-medium text-gray-700">
                    {title}
                </label>
            )}
            <div
                className="relative cursor-pointer group inline-block"
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                onClick={handleClick}
            >
                <Image
                    src={getValidImageSrc(imageSrc)}
                    alt={alt}
                    width={width}
                    height={height}
                    className={className}
                />

                <div
                    className={`absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center transition-opacity duration-200 ${
                        isHovered ? "opacity-100" : "opacity-0"
                    }`}
                >
                    <span className="text-white text-sm">
                        Click to change image
                    </span>
                </div>
            </div>
        </div>
    );
}
