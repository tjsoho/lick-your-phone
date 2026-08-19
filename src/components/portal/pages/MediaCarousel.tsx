"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";

const AUTO_INTERVAL = 5000;

interface MediaCarouselProps {
  items: { url: string; alt: string }[];
}

export default function MediaCarousel({ items }: MediaCarouselProps) {
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
      className="relative w-full overflow-hidden rounded-2xl border border-lyp-white/10"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Slides */}
      <div
        className="flex transition-transform duration-500 ease-in-out"
        style={{ transform: `translateX(-${current * 100}%)` }}
      >
        {items.map((item, i) => (
          <div key={i} className="w-full flex-shrink-0">
            <Image
              src={item.url}
              alt={item.alt || "Media"}
              className="w-full h-auto object-cover aspect-video"
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
            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-1.5 text-white backdrop-blur-sm transition-colors hover:bg-black/60"
            aria-label="Previous"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={next}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-1.5 text-white backdrop-blur-sm transition-colors hover:bg-black/60"
            aria-label="Next"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}

      {/* Dots */}
      {len > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
          {items.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`h-2 w-2 rounded-full transition-colors ${
                i === current ? "bg-white" : "bg-white/40"
              }`}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
