"use client";

import { Check, Copy, ExternalLink } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";

const EASE = "ease-brand";

export default function PortalLinkCell({ url }: { url: string | null }) {
  const [copied, setCopied] = useState(false);

  if (!url) return <span className="text-[#C3B5B5]">—</span>;

  async function handleCopy() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Proposal link copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy — copy it from the link instead");
    }
  }

  return (
    <div className="flex items-center gap-1.5">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        title={url}
        className={`group inline-flex max-w-[260px] items-center gap-2 rounded-full border border-lyp-cherry/30 bg-lyp-cherry/[0.06] py-1.5 pl-3.5 pr-3 transition-all duration-500 ${EASE} hover:border-lyp-cherry/50 hover:bg-lyp-cherry/[0.11]`}
      >
        <span className="truncate font-body text-[12.5px] font-semibold text-lyp-cherry underline decoration-lyp-cherry/35 underline-offset-[3px] transition-colors duration-500 group-hover:decoration-lyp-cherry">
          {url.replace(/^https?:\/\//, "")}
        </span>
        <ExternalLink
          strokeWidth={2}
          className={`h-3.5 w-3.5 flex-shrink-0 text-lyp-cherry transition-transform duration-500 ${EASE} group-hover:-translate-y-px group-hover:translate-x-px`}
        />
      </a>

      <button
        type="button"
        onClick={handleCopy}
        title="Copy proposal link"
        aria-label="Copy proposal link"
        className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-lyp-cherry/30 bg-lyp-cherry/[0.06] text-lyp-cherry transition-all duration-500 ${EASE} hover:border-lyp-cherry/50 hover:bg-lyp-cherry/[0.11] active:scale-95`}
      >
        {copied ? (
          <Check strokeWidth={2} className="h-3.5 w-3.5 text-lyp-cherry" />
        ) : (
          <Copy strokeWidth={1.5} className="h-3.5 w-3.5" />
        )}
      </button>
    </div>
  );
}
