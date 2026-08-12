"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { sendProposal } from "@/server-actions/proposals";
import { SendIcon } from "lucide-react";

export default function SendProposalButton({
  proposalId,
  status,
}: {
  proposalId: string;
  status: string;
}) {
  const [loading, setLoading] = useState(false);

  const isDraft = status === "draft";

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
      title={isDraft ? "Send proposal link" : "Resend proposal link"}
      onClick={handleSend}
      disabled={loading}
      className="disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <SendIcon
        className={
          "h-4 w-4 text-gray-500 hover:text-blue-600 transition-colors"
        }
      />
    </button>
  );
}
