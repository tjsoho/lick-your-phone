import Link from "next/link";
import { notFound } from "next/navigation";
import React from "react";
import { getProposal } from "@/server-actions/proposals";
import {
  formatCents,
  formatDate,
  formatDateTime,
  formatStatus,
} from "@/lib/format";
import { cn } from "@/lib/utils";
import { createAdminClient } from "@/utils/server";
import { getAppUrl } from "@/lib/app-url";
import {
  ArrowLeft,
  Eye,
  Clock,
  AlertCircle,
  CreditCard,
  FilePlus2,
  Send,
  FileSignature,
  ClipboardCheck,
  DollarSign,
  Activity,
} from "lucide-react";
import ProposalInternalNotes from "@/components/admin/ProposalInternalNotes";
import ProposalDeckOverview from "@/components/admin/ProposalDeckOverview";
import ProposalDiscountTimer from "@/components/admin/ProposalDiscountTimer";
import SendProposalButton from "@/components/admin/SendProposalButton";
import ProposalPortalLink from "@/components/admin/ProposalPortalLink";
import { getProposalPresentation } from "@/server-actions/proposal-presentation";
import { getProposalReview } from "@/server-actions/proposal-review";

interface InternalNote {
  id: string;
  content: string;
  created_at: string;
}

interface AuditMetadata {
  clientEmail?: string;
  clientName?: string;
  signerEmail?: string;
  totalAmount?: number;
  isEdit?: boolean;
  amount?: number;
  assets?: string[];
  [key: string]: unknown;
}

const EASE = "ease-brand";

/**
 * "Superseded" sent the agency to a dictionary, so the pill says what actually
 * happened. The database keeps the enum value; only the label changes.
 */
const statusLabels: Record<string, string> = {
  superseded: "replaced",
};

/** Muted, tonal pills — saturated Tailwind defaults read cheap next to the brand. */
const statusStyles: Record<string, string> = {
  draft: "bg-[#F2EDED] text-[#8A7A7A]",
  sent: "bg-[#EDF1F7] text-[#5B7394]",
  intake_complete: "bg-[#FBF3E3] text-[#9A7B2E]",
  signed: "bg-[#E9F2EC] text-[#4A7A5C]",
  superseded: "bg-lyp-cherry/[0.07] text-lyp-cherry",
};

const eventDetails: Record<
  string,
  {
    title: string;
    color: string;
    icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
    getDescription: (metadata: AuditMetadata) => string;
  }
> = {
  PROPOSAL_SENT: {
    title: "Proposal Sent",
    color: "border-[#E2E8F1] bg-[#EDF1F7] text-[#5B7394]",
    icon: Send,
    getDescription: (meta) =>
      `Sent to ${meta?.clientEmail || meta?.clientName || "Client"}`,
  },
  PROPOSAL_SIGNED: {
    title: "Proposal Signed",
    color: "border-[#DCE9E1] bg-[#E9F2EC] text-[#4A7A5C]",
    icon: FileSignature,
    getDescription: (meta) =>
      `Signed by ${meta?.signerEmail || meta?.clientName || "Client"}. Total: ${
        meta?.totalAmount ? formatCents(meta.totalAmount) : "—"
      }`,
  },
  INTAKE_COMPLETED: {
    title: "Onboarding Completed",
    color: "border-[#E4E2F0] bg-[#F0EEF8] text-[#6B6394]",
    icon: ClipboardCheck,
    getDescription: (meta) =>
      `${meta?.isEdit ? "Updated" : "Submitted"} by ${
        meta?.clientName || "Client"
      }${meta?.assets?.length ? ` with ${meta.assets.length} assets` : ""}`,
  },
  PAYMENT_CAPTURED: {
    title: "Payment Details Captured",
    color: "border-[#F0E4C9] bg-[#FBF3E3] text-[#9A7B2E]",
    icon: CreditCard,
    getDescription: (meta) =>
      `Payment details captured for ${meta?.clientName || "Client"}.`,
  },
  PAYMENT_SUCCEEDED: {
    title: "Payment Succeeded",
    color: "border-[#DCE9E1] bg-[#E9F2EC] text-[#4A7A5C]",
    icon: DollarSign,
    getDescription: (meta) =>
      `Payment of ${meta?.amount ? formatCents(meta.amount) : "—"} succeeded.`,
  },
  PAYMENT_FAILED: {
    title: "Payment Failed",
    color: "border-lyp-cherry/15 bg-lyp-cherry/[0.06] text-lyp-cherry",
    icon: AlertCircle,
    getDescription: (meta) =>
      `Payment of ${meta?.amount ? formatCents(meta.amount) : "—"} failed.`,
  },
};

export default async function ProposalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { data: proposal, error } = await getProposal(id);

  if (error || !proposal) return notFound();

  const supabase = await createAdminClient();
  const { data: auditEvents } = await supabase
    .from("audit_events")
    .select("*")
    .eq("entity_id", id)
    .eq("entity_type", "proposal")
    .order("created_at", { ascending: false });

  const events = auditEvents || [];

  const notes = (proposal.internal_notes ?? []) as unknown as InternalNote[];

  const { data: presentationPages } = await getProposalPresentation(id);
  const { data: review } = await getProposalReview(id);

  // Versions started at 1 and only legacy rows are missing a number.
  const version = Number(proposal.version) || 1;

  // Notes are captured after signing, so the review section stays shut until then.
  const isOnboardingComplete = proposal.status === "intake_complete";
  const isSigned = proposal.status === "signed" || isOnboardingComplete;

  // A draft goes out for the first time; a sent proposal can have its link
  // emailed again. Signed and superseded ones have nowhere left to go.
  const isDraft = proposal.status === "draft";
  const canSend = isDraft || proposal.status === "sent";

  const portalUrl = proposal.token
    ? `${await getAppUrl()}/portal/${proposal.token}`
    : null;

  return (
    <div className="mx-auto max-w-[64rem]">
      {/* ─────────────── Header ─────────────── */}
      <header className="animate-rise mb-6">
        <Link
          href="/admin/proposals"
          className={`group inline-flex items-center gap-1.5 font-body text-[12px] font-semibold tracking-wide text-[#8A7A7A] transition-colors duration-500 ${EASE} hover:text-lyp-cherry`}
        >
          <ArrowLeft
            strokeWidth={1.5}
            className={`h-3.5 w-3.5 transition-transform duration-500 ${EASE} group-hover:-translate-x-0.5`}
          />
          Back to proposals
        </Link>

        <div className="mt-4 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="h-px w-7 bg-lyp-cherry/30" />
              <span className="font-body text-[10px] font-medium uppercase tracking-[0.32em] text-lyp-cherry/70">
                Proposal
              </span>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <h1 className="font-heading text-[28px] font-bold leading-[1.05] tracking-[-0.03em] text-lyp-black">
                {proposal.clients?.name ?? "Proposal"}
              </h1>
              <span
                className={cn(
                  "inline-block rounded-full px-2.5 py-1 font-body text-[10px] font-medium uppercase tracking-[0.14em]",
                  statusStyles[proposal.status] ??
                    "bg-[#F2EDED] text-[#8A7A7A]",
                )}
              >
                {statusLabels[proposal.status] ??
                  formatStatus(proposal.status)}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {portalUrl && (
              <a
                href={portalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`group inline-flex items-center gap-3 rounded-full border border-lyp-cherry/25 bg-lyp-cherry/[0.06] py-1.5 pl-5 pr-1.5 font-body text-[13px] font-semibold tracking-wide text-lyp-cherry transition-all duration-500 ${EASE} hover:bg-lyp-cherry/[0.12] active:scale-[0.985]`}
                title="Open the client-facing proposal in a new tab"
              >
                View Proposal
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full bg-lyp-white transition-transform duration-500 ${EASE} group-hover:scale-105`}
                >
                  <Eye strokeWidth={1.5} className="h-3.5 w-3.5" />
                </span>
              </a>
            )}
            {/* No "Edit" button: this page *is* the editing surface. Everything
                a proposal can change — which pages show, the discounts, the
                timer — is below, in one scroll. */}
            {/* Was "Supersede", which the agency had to look up — and it
                carried a copy icon, which read as "copy the client link".
                Both are now plain. */}
            {proposal.status !== "superseded" && (
              <Link
                href={`/admin/proposals/${id}/edit?mode=supersede`}
                title="Close this proposal off and start the next version of it"
                className={`group inline-flex items-center gap-3 rounded-full border border-[#EFE6E6] bg-lyp-white py-1.5 pl-5 pr-1.5 font-body text-[13px] font-semibold tracking-wide text-lyp-black transition-all duration-500 ${EASE} hover:border-lyp-cherry/25 hover:text-lyp-cherry active:scale-[0.985]`}
              >
                Create new version
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full bg-[#F7F1F1] transition-transform duration-500 ${EASE} group-hover:scale-105`}
                >
                  <FilePlus2 strokeWidth={1.5} className="h-3.5 w-3.5" />
                </span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* ─────────────── Summary ─────────────── */}
      <dl
        className="animate-rise mb-8 grid grid-cols-2 gap-3 md:grid-cols-4"
        style={{ animationDelay: "80ms" }}
      >
        <InfoCard label="Client" value={proposal.clients?.name} />
        <InfoCard label="Venue" value={proposal.venues?.name} />
        <InfoCard
          label="Total"
          numeric
          value={
            proposal.total_snapshot_cents != null
              ? formatCents(proposal.total_snapshot_cents)
              : "—"
          }
        />
        <InfoCard
          label="Created"
          numeric
          value={formatDate(proposal.created_at)}
        />
        {version > 1 && (
          <InfoCard
            label="Version"
            numeric
            value={`v${version} — replaces v${version - 1}`}
          />
        )}
        {proposal.signed_at && (
          <InfoCard
            label="Signed"
            numeric
            value={formatDate(proposal.signed_at)}
          />
        )}
        {proposal.signer_email && (
          <InfoCard label="Signer" value={proposal.signer_email} />
        )}
      </dl>

      {/* ─────────────── Deck overview ─────────────── */}
      <Section title="Deck Overview" delay="140ms">
        <ProposalDeckOverview
          proposalId={id}
          initialPages={presentationPages ?? []}
          timerActive={proposal.discount_timer_active ?? false}
          timerStartsAt={proposal.discount_starts_at}
          timerExpiresAt={proposal.discount_expires_at}
          pricesLocked={isSigned || proposal.status === "superseded"}
        />
      </Section>

      {/* ─────────────── Ready to Send ─────────────── */}
      {/* A deliberate last stage rather than a loose switch and a button: the
          deck is settled above, so this says what the client gets, what it
          comes to, offers their link to open or paste, and sends it. */}
      <Section title="Ready to Send" delay="200ms">
        <p className="font-body text-[13px] leading-relaxed text-[#8A7A7A]">
          {canSend
            ? "Everything above is settled. This is the last look before the client sees it — check what they get and what it comes to, open their view if you want to read it as they will, set the discount window, then send."
            : "Nothing left to send from here — this is a record of what went out."}
        </p>

        {review && (
          <>
            <dl className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
              <ReviewTile
                label="Pages they see"
                value={String(review.shownPages)}
                hint={
                  review.hiddenPages > 0
                    ? `${review.hiddenPages} hidden for this client`
                    : "the standard deck, nothing hidden"
                }
              />
              <ReviewTile
                label="Services offered"
                value={String(review.lines.length)}
                hint={
                  review.lines.length === 0
                    ? "no priced services in this deck"
                    : review.lines.some((line) => line.hasChoice)
                      ? "some have tiers the client picks from"
                      : "one price each"
                }
              />
              <ReviewTile
                label="One-off total"
                value={
                  review.oneOffCents > 0
                    ? formatCents(review.oneOffCents)
                    : "—"
                }
                hint="if they take everything"
              />
              <ReviewTile
                label="Monthly total"
                value={
                  review.monthlyCents > 0
                    ? `${formatCents(review.monthlyCents)}/mo`
                    : "—"
                }
                hint="if they take everything"
              />
            </dl>

            {/* Said once, plainly, rather than left to be inferred from the
                timer below: these numbers are either the discounted ones or
                they are not. */}
            <p className="mt-3 font-body text-[12px] leading-relaxed text-[#8A7A7A]">
              {review.discountLive
                ? "These are the discounted prices — the offer is running now."
                : review.startsAt &&
                    new Date(review.startsAt).getTime() > Date.now()
                  ? `These are full prices. The discount is scheduled and opens ${formatDateTime(review.startsAt)}.`
                  : "These are full prices — no discount is reaching the client. Set the window below."}
            </p>

            {review.lines.length > 0 && (
              <ul className="mt-4 divide-y divide-[#F7F1F1] rounded-2xl border border-[#EFE6E6] bg-[#FCFAFA] px-4">
                {review.lines.map((line) => (
                  <li
                    key={line.serviceId}
                    className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2.5"
                  >
                    <span className="font-body text-[13px] text-lyp-black">
                      {line.name}
                      {line.discountPct != null && (
                        <span className="ml-2 rounded-full bg-lyp-cherry/[0.08] px-2 py-0.5 font-body text-[9px] font-medium uppercase tracking-[0.16em] text-lyp-cherry">
                          {Math.round(line.discountPct * 100)}% off
                        </span>
                      )}
                    </span>
                    <span className="font-body text-[13px] tabular-nums text-[#8A7A7A]">
                      {line.hasChoice ? "from " : ""}
                      {formatCents(line.fromCents)}
                      {line.billing === "recurring_monthly" ? "/mo" : ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        <div className="mt-5 border-t border-[#F1E8E8] pt-5">
          <ProposalDiscountTimer
            proposalId={id}
            initialActive={proposal.discount_timer_active ?? false}
            initialStartsAt={proposal.discount_starts_at}
            initialExpiresAt={proposal.discount_expires_at}
            locked={isSigned || proposal.status === "superseded"}
            variant="step"
          />
        </div>

        {portalUrl && (
          <div className="mt-5 border-t border-[#F1E8E8] pt-5">
            <ProposalPortalLink url={portalUrl} />
          </div>
        )}

        <div className="mt-5 border-t border-[#F1E8E8] pt-5">
          {canSend ? (
            <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
              <div className="min-w-0 flex-1">
                <p className="font-heading text-[15px] font-bold tracking-[-0.01em] text-lyp-black">
                  {isDraft ? "Send to the client" : "Send the link again"}
                </p>
                <p className="mt-0.5 font-body text-[12.5px] leading-relaxed text-[#8A7A7A]">
                  {isDraft
                    ? "Emails the client their link and marks this proposal as sent. Everything above is live the moment they open it."
                    : "The client already has this link. Sending again emails the same one — they always see the deck and discount as set above."}
                </p>
              </div>
              <SendProposalButton
                proposalId={id}
                status={proposal.status}
                variant="pill"
              />
            </div>
          ) : (
            <p className="font-body text-[12.5px] leading-relaxed text-[#8A7A7A]">
              {proposal.status === "superseded"
                ? "This proposal has been replaced by a newer version. Send that one instead."
                : "Signed — there is nothing left to send. Finish up in Post-Signature Review below."}
            </p>
          )}
        </div>
      </Section>

      {/* ─────────────── Post-Signature Review ─────────────── */}
      <Section title="Post-Signature Review" delay="240ms">
        {!isSigned ? (
          <div className="space-y-5">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#F7F1F1]">
                <Clock strokeWidth={1.25} className="h-4 w-4 text-[#A89898]" />
              </span>
              <p className="font-body text-[13px] leading-relaxed text-[#8A7A7A]">
                Opens once the client signs. Sales confirms the onboarding form
                here and adds the internal notes the team needs.
              </p>
            </div>

            {/* Superseding carries notes over, so show them rather than
                hiding the team's own words until the client signs again. */}
            {notes.length > 0 && (
              <div className="rounded-2xl border border-[#EFE6E6] bg-[#FCFAFA] px-4 py-3.5">
                <p className="mb-2.5 font-body text-[10px] font-medium uppercase tracking-[0.22em] text-[#A89898]">
                  Notes carried over
                </p>
                <ul className="space-y-2.5">
                  {notes.map((note) => (
                    <li
                      key={note.id}
                      className="border-l-2 border-[#EFE6E6] pl-3 font-body text-[13px] leading-relaxed text-[#8A7A7A]"
                    >
                      {note.content}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Onboarding form check */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#EFE6E6] bg-[#FCFAFA] px-4 py-3.5">
              <div className="flex items-start gap-3">
                <span
                  className={cn(
                    "mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full",
                    isOnboardingComplete
                      ? "bg-lyp-cherry/[0.08]"
                      : "bg-[#F7F1F1]",
                  )}
                >
                  <ClipboardCheck
                    strokeWidth={1.25}
                    className={cn(
                      "h-4 w-4",
                      isOnboardingComplete
                        ? "text-lyp-cherry"
                        : "text-[#A89898]",
                    )}
                  />
                </span>
                <div>
                  <p className="font-body text-[13px] font-semibold text-lyp-black">
                    Onboarding form
                  </p>
                  <p className="mt-0.5 font-body text-[12px] text-[#8A7A7A]">
                    {isOnboardingComplete
                      ? "Submitted by the client — check it has everything the team needs."
                      : "Not submitted yet. Chase the client before briefing the team."}
                  </p>
                </div>
              </div>
              <Link
                href={`/admin/proposals/${id}/intake`}
                className={`inline-flex flex-shrink-0 items-center gap-2 rounded-full border border-[#EFE6E6] bg-lyp-white px-4 py-2 font-body text-[12.5px] font-semibold tracking-wide text-lyp-black transition-all duration-500 ${EASE} hover:border-lyp-cherry/25 hover:text-lyp-cherry active:scale-[0.985]`}
              >
                Review form
              </Link>
            </div>

            {/* Internal notes */}
            <div>
              <p className="mb-1 font-body text-[10px] font-medium uppercase tracking-[0.22em] text-[#A89898]">
                Internal Notes
              </p>
              <p className="mb-3.5 font-body text-[12px] text-[#8A7A7A]">
                What the delivery team needs to know. These feed the ClickUp
                brief.
              </p>
              <ProposalInternalNotes proposalId={id} initialNotes={notes} />
            </div>
          </div>
        )}
      </Section>

      {/* ─────────────── Activity Timeline ─────────────── */}
      <Section title="Activity Timeline" delay="280ms">
        {events.length === 0 ? (
          <EmptyRow icon={Activity} message="No activity recorded yet." />
        ) : (
          <div className="relative ml-4 space-y-6 border-l border-[#F1E8E8] pl-6">
            {events.map((event) => {
              const meta = (event.metadata || {}) as AuditMetadata;
              const config = eventDetails[event.action] || {
                title: event.action.replace(/_/g, " "),
                color: "border-[#EFE6E6] bg-[#F7F1F1] text-[#8A7A7A]",
                icon: Activity,
                getDescription: (m: AuditMetadata) =>
                  m && Object.keys(m).length > 0
                    ? JSON.stringify(m)
                    : "No details available.",
              };
              const Icon = config.icon;
              return (
                <div key={event.id} className="relative">
                  {/* Timeline dot */}
                  <span
                    className={cn(
                      "absolute -left-[37px] top-0.5 flex h-6 w-6 items-center justify-center rounded-full border",
                      config.color,
                    )}
                  >
                    <Icon strokeWidth={1.5} className="h-3.5 w-3.5" />
                  </span>

                  {/* Timeline content */}
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-heading text-[14px] font-bold capitalize tracking-[-0.01em] text-lyp-black">
                        {config.title}
                      </h4>
                      <span className="rounded-full bg-[#F7F1F1] px-2 py-0.5 font-body text-[9px] font-medium uppercase tracking-[0.18em] text-[#A89898]">
                        {event.actor_type}
                      </span>
                    </div>
                    <p className="mt-1 font-body text-[13px] leading-relaxed text-[#8A7A7A]">
                      {config.getDescription(meta)}
                    </p>
                    <p className="mt-1.5 font-body text-[11px] tabular-nums text-[#C3B5B5]">
                      {formatDateTime(event.created_at)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Section>
    </div>
  );
}

function InfoCard({
  label,
  value,
  numeric = false,
}: {
  label: string;
  value?: string | null;
  numeric?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border border-[#EFE6E6] bg-lyp-white px-4 py-3.5 transition-all duration-500 ${EASE} hover:shadow-[0_12px_28px_-16px_rgba(61,11,17,0.25)]`}
    >
      <dt className="font-body text-[10px] font-medium uppercase tracking-[0.22em] text-[#A89898]">
        {label}
      </dt>
      <dd
        className={cn(
          "mt-1.5 break-words font-body text-[14px] text-lyp-black",
          numeric && "tabular-nums",
        )}
      >
        {value ?? "—"}
      </dd>
    </div>
  );
}

/** A single number in the review stage, with the sentence that qualifies it. */
function ReviewTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-2xl border border-[#EFE6E6] bg-[#FCFAFA] px-4 py-3.5">
      <dt className="font-body text-[10px] font-medium uppercase tracking-[0.22em] text-[#A89898]">
        {label}
      </dt>
      <dd className="mt-1.5 font-heading text-[18px] font-bold tabular-nums tracking-[-0.02em] text-lyp-black">
        {value}
      </dd>
      <p className="mt-1 font-body text-[11px] leading-relaxed text-[#A89898]">
        {hint}
      </p>
    </div>
  );
}

function EmptyRow({
  icon: Icon,
  message,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  message: string;
}) {
  return (
    <div className="px-6 py-10 text-center">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-lyp-cherry/[0.05] ring-1 ring-lyp-cherry/10">
        <Icon strokeWidth={1} className="h-5 w-5 text-lyp-cherry/60" />
      </span>
      <p className="mt-4 font-body text-[13px] text-[#8A7A7A]">{message}</p>
    </div>
  );
}

function Section({
  title,
  children,
  delay,
}: {
  title: string;
  children: React.ReactNode;
  delay: string;
}) {
  return (
    <section className="animate-rise mb-8" style={{ animationDelay: delay }}>
      <h2 className="font-heading text-[16px] font-bold tracking-[-0.02em] text-lyp-black">
        {title}
      </h2>
      <div className="mt-3.5 overflow-hidden rounded-2xl border border-[#EFE6E6] bg-lyp-white p-5">
        {children}
      </div>
    </section>
  );
}
