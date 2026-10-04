"use client";

import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

const EASE = "ease-brand";

/**
 * The search box that sits above the Proposals and Clients tables.
 *
 * Controlled, and deliberately dumb: the list that owns it decides what a
 * match means. Both lists filter in the browser rather than round-tripping to
 * the server — a few dozen rows arrive with the page already, so filtering
 * them is instant and nothing flashes while you type.
 */
export default function AdminSearchField({
  value,
  onChange,
  placeholder,
  label,
  className,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
  /** Read out to screen readers in place of a visible label. */
  label: string;
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <Search
        strokeWidth={1.5}
        aria-hidden="true"
        className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#C3B5B5]"
      />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={label}
        className={cn(
          "w-full rounded-full border border-[#EFE6E6] bg-lyp-white py-2 pl-9 pr-9 font-body text-[12.5px] text-lyp-black outline-none transition-all duration-500",
          EASE,
          "placeholder:text-[#C3B5B5]",
          "focus:border-lyp-cherry/25 focus:ring-2 focus:ring-lyp-cherry/10",
          // Safari draws its own clear button on a search input; ours is nicer.
          "[&::-webkit-search-cancel-button]:appearance-none",
        )}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear search"
          className={`absolute right-2.5 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full text-[#A89898] transition-all duration-500 ${EASE} hover:bg-[#F7F1F1] hover:text-lyp-cherry active:scale-95`}
        >
          <X strokeWidth={1.75} className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
