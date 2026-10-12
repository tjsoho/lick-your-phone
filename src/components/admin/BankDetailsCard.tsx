"use client";

import { Eye, EyeOff, Landmark, Loader2 } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { revealBankDetails } from "@/server-actions/payment";

const EASE = "ease-brand";

/**
 * THE ACCOUNT ON FILE, SHOWN ONLY WHEN ASKED.
 *
 * Accounting needs the whole BSB and account number to set a debit up; nobody
 * else needs them at all, and certainly not by accident while scrolling past.
 * So the card shows the account name and the last three digits, which is
 * enough to recognise which account it is, and the rest costs a deliberate
 * click. That click decrypts on the server and writes a line to the timeline
 * naming who looked.
 */
export default function BankDetailsCard({
  proposalId,
  accountName,
  lastThree,
  authorisedAt,
}: {
  proposalId: string;
  accountName: string | null;
  lastThree: string | null;
  /** When the client agreed to the debit. Null for a pre-existing card row. */
  authorisedAt: string | null;
}) {
  const [revealed, setRevealed] = useState<{
    bsb: string;
    accountNumber: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleReveal() {
    if (revealed) {
      setRevealed(null);
      return;
    }
    setLoading(true);
    const { data, error } = await revealBankDetails(proposalId);
    setLoading(false);
    if (error || !data) {
      toast.error(error ?? "Could not read the account.");
      return;
    }
    setRevealed({ bsb: data.bsb, accountNumber: data.accountNumber });
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#EFE6E6] bg-[#FCFAFA] px-4 py-3.5">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-lyp-cherry/[0.08]">
          <Landmark strokeWidth={1.25} className="h-4 w-4 text-lyp-cherry" />
        </span>
        <div className="min-w-0">
          <p className="font-body text-[13px] font-semibold text-lyp-black">
            Bank account on file
          </p>
          <p className="mt-0.5 font-body text-[12px] tabular-nums text-[#6B5A5A]">
            {accountName || "Account"}
            {" · "}
            {revealed
              ? `BSB ${revealed.bsb} · ${revealed.accountNumber}`
              : `ending ${lastThree ?? "???"}`}
          </p>
          <p className="mt-0.5 font-body text-[11px] text-[#867474]">
            {authorisedAt
              ? `The client authorised the debit on ${new Date(authorisedAt).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}.`
              : "Held for accounting. Nothing is debited from here."}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={handleReveal}
        disabled={loading}
        title={
          revealed
            ? "Hide the account number again"
            : "Show the full BSB and account number — your name and the time are recorded on the timeline"
        }
        className={`inline-flex flex-shrink-0 items-center gap-2 rounded-full border border-[#EFE6E6] bg-lyp-white px-4 py-1.5 font-body text-[12px] font-semibold text-[#6B5A5A] transition-all duration-500 ${EASE} hover:border-lyp-cherry/25 hover:text-lyp-cherry active:scale-[0.985] disabled:opacity-40`}
      >
        {loading ? (
          <Loader2 strokeWidth={1.5} className="h-3.5 w-3.5 animate-spin" />
        ) : revealed ? (
          <EyeOff strokeWidth={1.5} className="h-3.5 w-3.5" />
        ) : (
          <Eye strokeWidth={1.5} className="h-3.5 w-3.5" />
        )}
        {revealed ? "Hide" : "Show full account"}
      </button>
    </div>
  );
}
