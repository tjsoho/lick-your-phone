"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { sendProposal } from "@/server-actions/proposals";
import { Loader2, SendIcon } from "lucide-react";

const EASE = "ease-brand";

export default function SendProposalButton({
  proposalId,
  status,
}: {
  proposalId: string;
  status: string;
}) {
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
    }

    setLoading(false);
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
