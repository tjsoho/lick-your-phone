"use client";

import { AlertCircle, Check, Loader2 } from "lucide-react";
import type { SaveStatus } from "@/hooks/use-autosave";

const EASE = "ease-brand";

/** Quiet confirmation that autosave is keeping up. */
export default function SaveStatusBadge({ status }: { status: SaveStatus }) {
  if (status === "idle") return null;

  const config = {
    pending: {
      label: "Unsaved changes",
      className: "text-[#A89898]",
      icon: null,
    },
    saving: {
      label: "Saving",
      className: "text-[#A89898]",
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
      className={`inline-flex items-center gap-1.5 font-body text-[10px] font-medium uppercase tracking-[0.18em] transition-colors duration-500 ${EASE} ${config.className}`}
    >
      {config.icon}
      {config.label}
    </span>
  );
}
