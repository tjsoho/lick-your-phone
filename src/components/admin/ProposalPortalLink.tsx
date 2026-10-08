"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

const EASE = "ease-brand";

/**
 * The client's own link, with the two things the team does with it: paste it
 * somewhere (HubSpot) and open it to check the deck before sending.
 *
 * The copy control is a labelled button rather than a bare icon: the only
 * other copy-shaped icon on this page used to belong to "Create new version",
 * which made an icon-only copy button genuinely ambiguous.
 *
 * `card` stands on its own. `step` is bare, for the send banner on the
 * proposal page, which already heads the step "Client link" and gives it a
 * tinted background of its own — a second card inside that would be a box in
 * a box.
 */
export default function ProposalPortalLink({
  url,
  variant = "card",
}: {
  url: string;
  variant?: "card" | "step";
}) {
  const [copied, setCopied] = useState(false);
  const isStep = variant === "step";

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Client link copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy — select the link and copy it by hand.");
    }
  }

  return (
    <div
      className={cn(
        !isStep &&
          "rounded-2xl border border-[#EFE6E6] bg-[#FCFAFA] px-4 py-3.5",
      )}
    >
      {!isStep && (
        <p className="font-body text-[10px] font-medium uppercase tracking-[0.22em] text-[#867474]">
          Client link
        </p>
      )}

      <div
        className={cn(
          "flex flex-wrap items-center gap-2.5",
          !isStep && "mt-2.5",
        )}
      >
        <code className="min-w-0 flex-1 truncate rounded-xl border border-[#EFE6E6] bg-lyp-white px-3 py-2 font-body text-[12.5px] text-lyp-black">
          {url.replace(/^https?:\/\//, "")}
        </code>

        <button
          type="button"
          onClick={handleCopy}
          title={
            copied ? "Link copied" : "Copy the client's link to the clipboard"
          }
          className={`inline-flex flex-shrink-0 items-center gap-2 rounded-full border border-lyp-cherry/25 bg-lyp-white px-4 py-2 font-body text-[12.5px] font-semibold tracking-wide text-lyp-cherry outline-none transition-all duration-500 ${EASE} hover:bg-lyp-cherry/[0.08] focus-visible:ring-2 focus-visible:ring-lyp-cherry/40 active:scale-[0.985]`}
        >
          {copied ? (
            <Check strokeWidth={2} className="h-3.5 w-3.5" />
          ) : (
            <Copy strokeWidth={1.75} className="h-3.5 w-3.5" />
          )}
          {copied ? "Copied" : "Copy link"}
        </button>

        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          title="Open the client's view in a new tab"
          className={`inline-flex flex-shrink-0 items-center gap-2 rounded-full border border-[#EFE6E6] bg-lyp-white px-4 py-2 font-body text-[12.5px] font-semibold tracking-wide text-lyp-black outline-none transition-all duration-500 ${EASE} hover:border-lyp-cherry/25 hover:text-lyp-cherry focus-visible:ring-2 focus-visible:ring-lyp-cherry/40 active:scale-[0.985]`}
        >
          <ExternalLink strokeWidth={1.75} className="h-3.5 w-3.5" />
          Open client view
        </a>
      </div>

      <p className="mt-2.5 font-body text-[11px] leading-relaxed text-[#867474]">
        The same link the client is emailed — safe to paste into HubSpot. It
        always shows the deck and discount exactly as set above.
      </p>
    </div>
  );
}
