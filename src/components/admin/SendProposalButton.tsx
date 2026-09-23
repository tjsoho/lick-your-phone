"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { sendProposal } from "@/server-actions/proposals";
import { Loader2, SendIcon } from "lucide-react";

const EASE = "ease-brand";

/**
 * Sends — or resends — the portal link to the client.
 *
 * A draft also becomes "sent" the first time; after that the same action just
 * emails the link again, which is why the label changes rather than the button
 * disappearing. `icon` is the compact form used in the proposals table;
 * `pill` is the labelled form used as the final step on a proposal page.
 */
export default function SendProposalButton({
  proposalId,
  status,
  variant = "icon",
}: {
  proposalId: string;
  status: string;
  variant?: "icon" | "pill";
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const isDraft = status === "draft";
  const label = isDraft ? "Send proposal link" : "Resend proposal link";

  async function handleSend() {
    setLoading(true);

    const res = await sendProposal(proposalId);

    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success("Proposal sent");
      // A draft has just become "sent" — pull the fresh status in so the
      // page stops claiming it is still a draft.
      router.refresh();
    }

    setLoading(false);
  }

  if (variant === "pill") {
    return (
      <button
        type="button"
        title={label}
        onClick={handleSend}
        disabled={loading}
        className={`group inline-flex items-center gap-3 rounded-full border border-lyp-cherry/25 bg-lyp-cherry/[0.06] py-1.5 pl-5 pr-1.5 font-body text-[13px] font-semibold tracking-wide text-lyp-cherry outline-none transition-all duration-500 ${EASE} hover:bg-lyp-cherry/[0.12] focus-visible:ring-2 focus-visible:ring-lyp-cherry/40 active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-50`}
      >
        {label}
        <span
          className={`flex h-8 w-8 items-center justify-center rounded-full bg-lyp-white transition-transform duration-500 ${EASE} group-hover:scale-105`}
        >
          {loading ? (
            <Loader2 strokeWidth={1.75} className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <SendIcon strokeWidth={1.5} className="h-3.5 w-3.5" />
          )}
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={handleSend}
      disabled={loading}
      className={`group inline-flex h-7 w-7 items-center justify-center rounded-full border border-[#EFE6E6] bg-lyp-white text-[#A89898] outline-none transition-all duration-500 ${EASE} hover:border-lyp-cherry/25 hover:bg-lyp-cherry/[0.04] hover:text-lyp-cherry focus-visible:ring-2 focus-visible:ring-lyp-cherry/40 active:scale-[0.94] disabled:cursor-not-allowed disabled:opacity-50`}
    >
      {loading ? (
        <Loader2 strokeWidth={1.75} className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <SendIcon strokeWidth={1.5} className="h-3.5 w-3.5" />
      )}
    </button>
  );
}
