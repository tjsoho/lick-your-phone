"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { updateProposal } from "@/server-actions/proposals";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

const EASE = "ease-brand";

const statuses = [
  "draft",
  "sent",
  "signed",
  "superseded",
  "intake_complete",
] as const;

/** Muted, tonal pills — saturated Tailwind defaults read cheap next to the brand. */
const statusStyles: Record<string, string> = {
  draft: "bg-[#F2EDED] text-[#8A7A7A] ring-[#E6DBDB]",
  sent: "bg-[#EDF1F7] text-[#5B7394] ring-[#DCE4EF]",
  signed: "bg-[#E9F2EC] text-[#4A7A5C] ring-[#D6E6DC]",
  superseded: "bg-lyp-cherry/[0.07] text-lyp-cherry ring-lyp-cherry/15",
  intake_complete: "bg-[#FBF3E3] text-[#9A7B2E] ring-[#F0E4C9]",
};

export default function ProposalStatusSelect({
  proposalId,
  currentStatus,
  disabled = true,
}: {
  proposalId: string;
  currentStatus: string;
  disabled?: boolean;
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

  const tone =
    statusStyles[currentStatus] ?? "bg-[#F2EDED] text-[#8A7A7A] ring-[#E6DBDB]";

  return (
    <span className="relative inline-flex items-center">
      <select
        aria-label="Proposal status"
        value={currentStatus}
        onChange={handleChange}
        disabled={loading || disabled}
        className={cn(
          "cursor-pointer appearance-none rounded-full py-1 pl-2.5 pr-7 font-body text-[10px] font-medium uppercase tracking-[0.14em] outline-none ring-1 transition-all duration-500",
          EASE,
          "focus-visible:ring-2 focus-visible:ring-lyp-cherry/40",
          "disabled:cursor-default disabled:opacity-70",
          tone,
        )}
      >
        {statuses.map((s) => (
          <option key={s} value={s}>
            {s.replace(/_/g, " ")}
          </option>
        ))}
      </select>
      <ChevronDown
        strokeWidth={1.75}
        aria-hidden="true"
        className="pointer-events-none absolute right-2 h-3 w-3 text-[#A89898]"
      />
    </span>
  );
}
