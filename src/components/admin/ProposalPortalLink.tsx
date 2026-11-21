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
  internalUrl = null,
  variant = "card",
}: {
  url: string;
  /**
   * The team's own link onto the same deck. Opening it is not recorded as a
   * client open, which is the whole reason it exists: "our opens are
   * recorded as the client's".
   */
  internalUrl?: string | null;
  variant?: "card" | "step";
}) {
  const [copied, setCopied] = useState(false);
  const [copiedInternal, setCopiedInternal] = useState(false);
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

  async function handleCopyInternal() {
    if (!internalUrl) return;
    try {
      await navigator.clipboard.writeText(internalUrl);
      setCopiedInternal(true);
      toast.success("Team link copied");
      setTimeout(() => setCopiedInternal(false), 2000);
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
          href={internalUrl ?? url}
          target="_blank"
          rel="noopener noreferrer"
          title={
            internalUrl
              ? "Open the deck on the team's link — this visit is not recorded as a client open"
              : "Open the client's view in a new tab"
          }
          className={`inline-flex flex-shrink-0 items-center gap-2 rounded-full border border-[#EFE6E6] bg-lyp-white px-4 py-2 font-body text-[12.5px] font-semibold tracking-wide text-lyp-black outline-none transition-all duration-500 ${EASE} hover:border-lyp-cherry/25 hover:text-lyp-cherry focus-visible:ring-2 focus-visible:ring-lyp-cherry/40 active:scale-[0.985]`}
        >
          <ExternalLink strokeWidth={1.75} className="h-3.5 w-3.5" />
          Open deck
        </a>
      </div>

      <p className="mt-2.5 font-body text-[11px] leading-relaxed text-[#867474]">
        The link above is the client&rsquo;s. It is what they are emailed and
        what to paste into HubSpot, and opening it counts as a client open.
      </p>

      {/* THE SECOND LINK. Same deck, no tracking. */}
      {internalUrl && (
        <div className="mt-3.5 border-t border-[#EFE6E6] pt-3">
          <p className="font-body text-[10px] font-medium uppercase tracking-[0.22em] text-[#867474]">
            Team link
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-2.5">
            <code className="min-w-0 flex-1 truncate rounded-xl border border-[#EFE6E6] bg-lyp-white px-3 py-2 font-body text-[12.5px] text-lyp-black">
              {internalUrl.replace(/^https?:\/\//, "")}
            </code>

            <button
              type="button"
              onClick={handleCopyInternal}
              title={
                copiedInternal
                  ? "Team link copied"
                  : "Copy the team's link to the clipboard"
              }
              className={`inline-flex flex-shrink-0 items-center gap-2 rounded-full border border-[#EFE6E6] bg-lyp-white px-4 py-2 font-body text-[12.5px] font-semibold tracking-wide text-lyp-black outline-none transition-all duration-500 ${EASE} hover:border-lyp-cherry/25 hover:text-lyp-cherry focus-visible:ring-2 focus-visible:ring-lyp-cherry/40 active:scale-[0.985]`}
            >
              {copiedInternal ? (
                <Check strokeWidth={2} className="h-3.5 w-3.5" />
              ) : (
                <Copy strokeWidth={1.75} className="h-3.5 w-3.5" />
              )}
              {copiedInternal ? "Copied" : "Copy link"}
            </button>
          </div>

          <p className="mt-2.5 font-body text-[11px] leading-relaxed text-[#867474]">
            For the team only. The deck is identical, but opening it is not
            recorded, so checking a proposal never shows up as the client
            having read it. Never send this one to a client.
          </p>
        </div>
      )}
    </div>
  );
}
