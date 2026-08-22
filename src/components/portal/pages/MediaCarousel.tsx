"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";

const AUTO_INTERVAL = 5000;

interface MediaCarouselProps {
  items: { url: string; alt: string }[];
  /**
   * Fill the height of the parent instead of running at the image's own size.
   * ServicePage uses this for the media well under the pricing card, where the
   * carousel has to live inside whatever height the page has left over.
   */
  frame?: boolean;
  /** Overrides the slide image classes. Only meaningful with `frame`. */
  imageClassName?: string;
}

export default function MediaCarousel({
  items,
  frame = false,
  imageClassName,
}: MediaCarouselProps) {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const len = items.length;

  const next = useCallback(() => setCurrent((c) => (c + 1) % len), [len]);
  const prev = useCallback(() => setCurrent((c) => (c - 1 + len) % len), [len]);

  useEffect(() => {
    if (paused || len <= 1) return;
    const id = setInterval(next, AUTO_INTERVAL);
    return () => clearInterval(id);
  }, [paused, next, len]);

  if (len === 0) return null;

  return (
    <div
      className={`relative w-full overflow-hidden ${
        frame ? "flex h-full min-h-0 items-end" : ""
      }`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Slides */}
      <div
        className={`flex transition-transform duration-500 ease-in-out ${
          frame ? "h-full w-full items-end pb-9" : ""
        }`}
        style={{ transform: `translateX(-${current * 100}%)` }}
      >
        {items.map((item, i) => (
          <div
            key={i}
            className={`w-full flex-shrink-0 ${
              frame ? "flex h-full items-end justify-center" : ""
            }`}
          >
            <Image
              src={item.url}
              alt={item.alt || "Media"}
              className={
                imageClassName ??
                "mx-auto h-auto max-h-[60vh] w-full object-contain"
              }
              width={800}
              height={450}
              priority={i === 0}
            />
          </div>
        ))}
      </div>

      {/* Prev / Next */}
      {len > 1 && (
        <>
          <button
            onClick={prev}
            className={`absolute left-2 -translate-y-1/2 rounded-full bg-lyp-black/70 p-1.5 text-lyp-white backdrop-blur-sm transition-colors hover:bg-lyp-black/85 ${
              frame ? "top-[calc(50%-1.125rem)]" : "top-1/2"
            }`}
            aria-label="Previous"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={next}
            className={`absolute right-2 -translate-y-1/2 rounded-full bg-lyp-black/70 p-1.5 text-lyp-white backdrop-blur-sm transition-colors hover:bg-lyp-black/85 ${
              frame ? "top-[calc(50%-1.125rem)]" : "top-1/2"
            }`}
            aria-label="Next"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}

      {/* Dots */}
      {len > 1 && (
        <div className={`absolute left-1/2 flex -translate-x-1/2 gap-1.5 rounded-full bg-lyp-black/60 px-2 py-1.5 backdrop-blur-sm ${
            frame ? "bottom-1" : "bottom-3"
          }`}>
          {items.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`h-2 w-2 rounded-full transition-colors ${
                i === current ? "bg-lyp-white" : "bg-lyp-white/70"
              }`}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
