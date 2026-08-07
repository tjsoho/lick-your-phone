"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { updateProposal } from "@/server-actions/proposals";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

const statuses = ["draft", "sent", "signed", "superseded"] as const;

const statusStyles: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700 border-gray-300",
  sent: "bg-blue-100 text-blue-700 border-blue-300",
  signed: "bg-green-100 text-green-700 border-green-300",
  superseded: "bg-red-100 text-red-700 border-red-300",
};

export default function ProposalStatusSelect({
  proposalId,
  currentStatus,
}: {
  proposalId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newStatus = e.target.value as (typeof statuses)[number];
    if (newStatus === currentStatus) return;

    setLoading(true);
    const { error } = await updateProposal(proposalId, { status: newStatus });
    setLoading(false);

    if (error) {
      toast.error(error);
      return;
    }
    toast.success(`Status → ${newStatus}`);
    router.refresh();
  }

  return (
    <select
      value={currentStatus}
      onChange={handleChange}
      disabled={loading}
      className={cn(
        "text-xs font-body font-medium capitalize rounded-full px-2 py-0.5 border cursor-pointer appearance-none pr-5 disabled:opacity-50",
        statusStyles[currentStatus] ??
          "bg-gray-100 text-gray-700 border-gray-300",
      )}
    >
      {statuses.map((s) => (
        <option key={s} value={s}>
          {s}
        </option>
      ))}
    </select>
  );
}
