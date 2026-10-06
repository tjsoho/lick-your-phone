"use client";

import { useState } from "react";
import { Images, Trash2 } from "lucide-react";
import MediaLibraryModal from "@/components/admin/MediaLibraryModal";
import { LOGO_SIZE_HINT, VENUE_LOGO_GUIDANCE } from "@/lib/client-logo";

const EASE = "ease-brand";

const labelClasses =
  "block font-body text-[10px] font-medium uppercase tracking-[0.22em] text-[#867474]";

interface VenueLogoFieldProps {
  /** Current logo URL, or "" for none. */
  value: string;
  /** Called with the new URL, or "" when the logo is removed. */
  onChange: (url: string) => void;
  /** Distinguishes the label's `id` when two of these share a page. */
  idPrefix?: string;
}

/**
 * This venue's own logo, picked from the media library.
 *
 * A client can hold several restaurants, each with its own branding, so the
 * logo on the proposal cover belongs to the venue the proposal is for. Shared
 * by every place a venue is created or edited — the venue form, and the
 * add-venue form on the client's own page — so the wording is written once.
 *
 * Deliberately the same field as `ClientLogoField`, down to the hint and the
 * preview surface; only the label and the fallback sentence differ. The two
 * should be folded into one parameterised field the next time both files are
 * open together.
 */
export default function VenueLogoField({
  value,
  onChange,
  idPrefix = "venue-logo",
}: VenueLogoFieldProps) {
  const [libraryOpen, setLibraryOpen] = useState(false);

  return (
    <div>
      <span className={labelClasses} id={`${idPrefix}-label`}>
        Venue Logo
      </span>
      <p className="mt-1.5 font-body text-[11px] text-[#867474]">
        {LOGO_SIZE_HINT}
      </p>

      {value ? (
        <div className="mt-2.5">
          {/* The preview sits on the cover's own dark tone, not on the card.
              This is not chrome around the artwork — it is the surface the
              logo will actually land on, and the light, transparent PNG the
              hint asks for would be invisible against a white card. The image
              itself stays bare: object-contain, no plate, no ring, no shadow. */}
          <div className="flex min-h-[88px] w-full max-w-xs items-center justify-center rounded-2xl bg-lyp-black px-6 py-5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value}
              alt="Venue logo"
              className="max-h-14 w-auto max-w-full object-contain"
            />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={() => setLibraryOpen(true)}
              className={`flex items-center gap-1.5 font-body text-[12.5px] font-medium text-[#6B5A5A] transition-colors duration-500 ${EASE} hover:text-lyp-cherry`}
            >
              <Images strokeWidth={1.5} className="h-3.5 w-3.5" />
              Replace logo
            </button>
            <button
              type="button"
              onClick={() => onChange("")}
              className={`flex items-center gap-1.5 font-body text-[12.5px] font-medium text-[#6B5A5A] transition-colors duration-500 ${EASE} hover:text-lyp-cherry`}
            >
              <Trash2 strokeWidth={1.5} className="h-3.5 w-3.5" />
              Remove logo
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setLibraryOpen(true)}
          aria-labelledby={`${idPrefix}-label`}
          className={`mt-2.5 flex w-full max-w-xs flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#EFE6E6] bg-[#FBF8F8] py-7 text-[#867474] transition-all duration-500 ${EASE} hover:border-lyp-cherry/30 hover:text-lyp-cherry`}
        >
          <Images strokeWidth={1.25} className="h-7 w-7" />
          <span className="font-body text-[13px]">Upload venue logo</span>
        </button>
      )}

      <p className="mt-2.5 max-w-md font-body text-[11px] leading-relaxed text-[#867474]">
        {VENUE_LOGO_GUIDANCE}
      </p>

      <MediaLibraryModal
        open={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        onSelect={onChange}
        title="Venue Logo"
        hint={LOGO_SIZE_HINT}
      />
    </div>
  );
}
