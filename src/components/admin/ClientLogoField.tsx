"use client";

import { useState } from "react";
import { Images, Trash2 } from "lucide-react";
import MediaLibraryModal from "./MediaLibraryModal";
import { CLIENT_LOGO_GUIDANCE, CLIENT_LOGO_SIZE_HINT } from "@/lib/client-logo";

const EASE = "ease-brand";

const labelClasses =
  "block font-body text-[10px] font-medium uppercase tracking-[0.22em] text-[#A89898]";

interface ClientLogoFieldProps {
  /** Current logo URL, or "" for none. */
  value: string;
  /** Called with the new URL, or "" when the logo is removed. */
  onChange: (url: string) => void;
  /** Distinguishes the label's `id` when two of these share a page. */
  idPrefix?: string;
}

/**
 * The client's logo, picked from the media library.
 *
 * Shared by the proposal wizard's new-client step and the client's own edit
 * card so the hint, the guidance and the preview are worded once.
 */
export default function ClientLogoField({
  value,
  onChange,
  idPrefix = "client-logo",
}: ClientLogoFieldProps) {
  const [libraryOpen, setLibraryOpen] = useState(false);

  return (
    <div>
      <span className={labelClasses} id={`${idPrefix}-label`}>
        Client Logo
      </span>
      <p className="mt-1.5 font-body text-[11px] text-[#A89898]">
        {CLIENT_LOGO_SIZE_HINT}
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
              alt="Client logo"
              className="max-h-14 w-auto max-w-full object-contain"
            />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={() => setLibraryOpen(true)}
              className={`flex items-center gap-1.5 font-body text-[12.5px] font-medium text-[#8A7A7A] transition-colors duration-500 ${EASE} hover:text-lyp-cherry`}
            >
              <Images strokeWidth={1.5} className="h-3.5 w-3.5" />
              Replace logo
            </button>
            <button
              type="button"
              onClick={() => onChange("")}
              className={`flex items-center gap-1.5 font-body text-[12.5px] font-medium text-[#8A7A7A] transition-colors duration-500 ${EASE} hover:text-lyp-cherry`}
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
          className={`mt-2.5 flex w-full max-w-xs flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#EFE6E6] bg-[#FBF8F8] py-7 text-[#A89898] transition-all duration-500 ${EASE} hover:border-lyp-cherry/30 hover:text-lyp-cherry`}
        >
          <Images strokeWidth={1.25} className="h-7 w-7" />
          <span className="font-body text-[13px]">Upload client logo</span>
        </button>
      )}

      <p className="mt-2.5 max-w-md font-body text-[11px] leading-relaxed text-[#A89898]">
        {CLIENT_LOGO_GUIDANCE}
      </p>

      <MediaLibraryModal
        open={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        onSelect={onChange}
        title="Client Logo"
        hint={CLIENT_LOGO_SIZE_HINT}
      />
    </div>
  );
}
