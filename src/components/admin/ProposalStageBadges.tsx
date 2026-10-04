import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------
   WHERE A PROPOSAL HAS GOT TO.

   The old cell showed one pill — whatever `status` happened to say — so a
   client who signed and then finished onboarding lost the fact that they'd
   signed at all: `intake_complete` simply overwrote `signed`. The agency reads
   these three moments as a progression, and wants to see every one that has
   happened:

       signed  →  payment details  →  onboarding complete

   Colour carries the same meaning the agency gives it on a call: amber is
   "they've committed but we're not done", green is the finish line. The
   payment step sits between the two in the slate the admin already uses for
   work that's in motion. The lifecycle states that aren't stages of their own
   — draft, sent, superseded — keep their existing tones and lead the row.
   ------------------------------------------------------------------------- */

/** The database kept both spellings when the enum was renamed. */
const INTAKE_DONE = new Set(["intake_complete", "intake_completed"]);

/** Reaching any of these means the client handed over their payment details. */
const PAYMENT_REACHED = new Set([
  "details_captured",
  "scheduled",
  "settled",
  "pending",
]);

const PAYMENT_BROKEN = new Set(["failed", "dishonoured"]);

export type ProposalStageInput = {
  status: string | null;
  signedAt: string | null;
  paymentStatus: string | null;
};

/** Signed is read from `signed_at` first: a later status change can't erase it. */
export function hasSigned({ status, signedAt }: ProposalStageInput): boolean {
  return Boolean(signedAt) || status === "signed" || INTAKE_DONE.has(status ?? "");
}

export function hasPaymentDetails({ paymentStatus }: ProposalStageInput): boolean {
  return PAYMENT_REACHED.has(paymentStatus ?? "");
}

export function hasOnboarded({ status }: ProposalStageInput): boolean {
  return INTAKE_DONE.has(status ?? "");
}

/** The one-word state used by the status filter, ignoring the stage badges. */
export function lifecycleOf({ status, signedAt }: ProposalStageInput): string {
  if (status === "superseded") return "superseded";
  if (INTAKE_DONE.has(status ?? "")) return "intake_complete";
  if (status === "signed" || signedAt) return "signed";
  return status ?? "draft";
}

const badge =
  "inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 font-body text-[10px] font-medium uppercase tracking-[0.14em] ring-1";

/** Muted, tonal pills — saturated Tailwind defaults read cheap next to the brand. */
const TONE = {
  draft: "bg-[#F2EDED] text-[#8A7A7A] ring-[#E6DBDB]",
  sent: "bg-[#EDF1F7] text-[#5B7394] ring-[#DCE4EF]",
  slate: "bg-[#EDF1F7] text-[#5B7394] ring-[#DCE4EF]",
  amber: "bg-[#FBF3E3] text-[#9A7B2E] ring-[#F0E4C9]",
  green: "bg-[#E9F2EC] text-[#4A7A5C] ring-[#D6E6DC]",
  cherry: "bg-lyp-cherry/[0.07] text-lyp-cherry ring-lyp-cherry/15",
} as const;

/** What the payment pill says, so a dishonour never hides behind "captured". */
const PAYMENT_LABEL: Record<string, string> = {
  details_captured: "Payment details",
  pending: "Payment pending",
  scheduled: "Payments scheduled",
  settled: "Payment settled",
  failed: "Payment failed",
  dishonoured: "Payment dishonoured",
};

export default function ProposalStageBadges(props: ProposalStageInput) {
  const { status, paymentStatus } = props;
  const signed = hasSigned(props);
  const paid = hasPaymentDetails(props);
  const broken = PAYMENT_BROKEN.has(paymentStatus ?? "");
  const onboarded = hasOnboarded(props);

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {/* Drafts and sends have no stage of their own, so they speak for the
          row. Superseded leads even when stages follow it, because it's the
          first thing you need to know about the row. */}
      {status === "draft" && (
        <span className={cn(badge, TONE.draft)} title="Not sent to the client yet">
          Draft
        </span>
      )}
      {status === "sent" && !signed && (
        <span
          className={cn(badge, TONE.sent)}
          title="Sent to the client, waiting on a signature"
        >
          Sent
        </span>
      )}
      {status === "superseded" && (
        <span
          className={cn(badge, TONE.cherry)}
          title="Replaced by a newer proposal — kept for the record"
        >
          Superseded
        </span>
      )}

      {signed && (
        <span
          className={cn(badge, TONE.amber)}
          title="The client has signed the contract"
        >
          Signed
        </span>
      )}
      {(paid || broken) && (
        <span
          className={cn(badge, broken ? TONE.cherry : TONE.slate)}
          title={
            broken
              ? "The client's payment did not go through"
              : "The client has given us their payment details"
          }
        >
          {PAYMENT_LABEL[paymentStatus ?? ""] ?? paymentStatus}
        </span>
      )}
      {onboarded && (
        <span
          className={cn(badge, TONE.green)}
          title="The client has finished the onboarding form"
        >
          Onboarding complete
        </span>
      )}
    </div>
  );
}
