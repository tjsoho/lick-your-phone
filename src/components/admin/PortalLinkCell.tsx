"use client";

import { Check, Copy, ExternalLink } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";

const EASE = "ease-[cubic-bezier(0.32,0.72,0,1)]";

export default function PortalLinkCell({ url }: { url: string | null }) {
  const [copied, setCopied] = useState(false);

  if (!url) return <span className="text-[#C3B5B5]">—</span>;

  async function handleCopy() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Portal link copied");
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
        className={`group inline-flex max-w-[190px] items-center gap-1.5 rounded-full border border-[#EFE6E6] bg-[#FBF8F8] py-1 pl-3 pr-2.5 transition-all duration-500 ${EASE} hover:border-lyp-cherry/25 hover:bg-lyp-white`}
      >
        <span className="truncate font-mono text-[11px] text-[#8A7A7A] transition-colors duration-500 group-hover:text-lyp-cherry">
          {url.replace(/^https?:\/\//, "")}
        </span>
        <ExternalLink
          strokeWidth={1.5}
          className="h-3 w-3 flex-shrink-0 text-[#C3B5B5] transition-colors duration-500 group-hover:text-lyp-cherry"
        />
      </a>

      <button
        type="button"
        onClick={handleCopy}
        title="Copy portal link"
        aria-label="Copy portal link"
        className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border border-[#EFE6E6] bg-lyp-white text-[#A89898] transition-all duration-500 ${EASE} hover:border-lyp-cherry/25 hover:text-lyp-cherry active:scale-95`}
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
