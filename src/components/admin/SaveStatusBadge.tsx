"use client";

import { AlertCircle, Check, Loader2 } from "lucide-react";
import type { SaveStatus } from "@/hooks/use-autosave";

const EASE = "ease-brand";

/**
 * Quiet confirmation that autosave is keeping up.
 *
 * IT SAYS SO BEFORE IT HAS ANYTHING TO SAY. This used to render nothing at
 * all until the first edit, so a screen you had just opened gave no sign that
 * saving happened by itself: "Is there a save?" There is, on every card, and
 * now the resting state says so rather than waiting to be trusted.
 */
export default function SaveStatusBadge({ status }: { status: SaveStatus }) {
  const config = {
    idle: {
      label: "Saves as you type",
      className: "text-[#9C8C8C]",
      icon: null,
    },
    pending: {
      label: "Unsaved changes",
      className: "text-[#867474]",
      icon: null,
    },
    saving: {
      label: "Saving",
      className: "text-[#867474]",
      icon: (
        <Loader2 strokeWidth={1.5} className="h-3 w-3 animate-spin" />
      ),
    },
    saved: {
      label: "Saved",
      className: "text-lyp-cherry/70",
      icon: <Check strokeWidth={2} className="h-3 w-3" />,
    },
    error: {
      label: "Not saved",
      className: "text-lyp-cherry",
      icon: <AlertCircle strokeWidth={1.5} className="h-3 w-3" />,
    },
  }[status];

  return (
    <span
      role="status"
      aria-live="polite"
      // 11px, not 10. At 10 it sat at the same weight as every field label
      // on the page and was read as one more of them.
      className={`inline-flex items-center gap-1.5 font-body text-[11px] font-medium uppercase tracking-[0.14em] transition-colors duration-500 ${EASE} ${config.className}`}
    >
      {config.icon}
      {config.label}
    </span>
  );
}
