"use client";

import { useState, useEffect, useCallback } from "react";
import { useReducedMotion } from "framer-motion";
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
  /**
   * How wide a slide actually renders. Required in practice: without it the
   * browser assumes 100vw and pulls the largest srcset candidate for a picture
   * that may only be drawn 600px wide.
   */
  sizes?: string;
}

export default function MediaCarousel({
  items,
  frame = false,
  imageClassName,
  sizes = "(min-width: 1024px) 720px, 92vw",
}: MediaCarouselProps) {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduceMotion = useReducedMotion();
  const len = items.length;

  const next = useCallback(() => setCurrent((c) => (c + 1) % len), [len]);
  const prev = useCallback(() => setCurrent((c) => (c - 1 + len) % len), [len]);

  useEffect(() => {
    // Reduced motion stops the slideshow driving itself; the arrows and dots
    // still work, so nothing becomes unreachable.
    if (paused || reduceMotion || len <= 1) return;
    const id = setInterval(next, AUTO_INTERVAL);
    return () => clearInterval(id);
  }, [paused, reduceMotion, next, len]);

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
        // ease-brand at 700ms rather than ease-in-out at 500: the track has
        // mass, so it leaves quickly and settles slowly instead of gliding.
        className={`flex transition-transform duration-700 ease-brand motion-reduce:transition-none ${
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
              sizes={sizes}
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
            className={`absolute left-2 -translate-y-1/2 rounded-full bg-lyp-black/70 p-1.5 text-lyp-white backdrop-blur-sm transition-[background-color,transform] duration-300 ease-brand hover:scale-110 hover:bg-lyp-black/85 motion-reduce:transition-none motion-reduce:hover:scale-100 ${
              frame ? "top-[calc(50%-1.125rem)]" : "top-1/2"
            }`}
            aria-label="Previous"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={next}
            className={`absolute right-2 -translate-y-1/2 rounded-full bg-lyp-black/70 p-1.5 text-lyp-white backdrop-blur-sm transition-[background-color,transform] duration-300 ease-brand hover:scale-110 hover:bg-lyp-black/85 motion-reduce:transition-none motion-reduce:hover:scale-100 ${
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
              className={`h-2 w-2 rounded-full transition-[background-color,transform] duration-500 ease-brand motion-reduce:transition-none ${
                i === current
                  ? "scale-125 bg-lyp-white"
                  : "bg-lyp-white/70 motion-reduce:scale-100"
              }`}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
