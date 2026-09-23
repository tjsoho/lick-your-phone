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
  Pencil,
  Copy,
  Send,
  FileSignature,
  ClipboardCheck,
  DollarSign,
  Activity,
} from "lucide-react";
import ProposalInternalNotes from "@/components/admin/ProposalInternalNotes";
import ProposalDeckOverview from "@/components/admin/ProposalDeckOverview";
import ProposalDiscountTimer from "@/components/admin/ProposalDiscountTimer";
import { getProposalPresentation } from "@/server-actions/proposal-presentation";

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

  // Notes are captured after signing, so the review section stays shut until then.
  const isOnboardingComplete = proposal.status === "intake_complete";
  const isSigned = proposal.status === "signed" || isOnboardingComplete;

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
                {formatStatus(proposal.status)}
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
            {proposal.status === "draft" && (
              <Link
                href={`/admin/proposals/${id}/edit`}
                className={`group inline-flex items-center gap-3 rounded-full border border-[#EFE6E6] bg-lyp-white py-1.5 pl-5 pr-1.5 font-body text-[13px] font-semibold tracking-wide text-lyp-black transition-all duration-500 ${EASE} hover:border-lyp-cherry/25 hover:text-lyp-cherry active:scale-[0.985]`}
              >
                Edit
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full bg-[#F7F1F1] transition-transform duration-500 ${EASE} group-hover:scale-105`}
                >
                  <Pencil strokeWidth={1.5} className="h-3.5 w-3.5" />
                </span>
              </Link>
            )}
            {proposal.status !== "superseded" && (
              <Link
                href={`/admin/proposals/${id}/edit?mode=supersede`}
                className={`group inline-flex items-center gap-3 rounded-full border border-[#EFE6E6] bg-lyp-white py-1.5 pl-5 pr-1.5 font-body text-[13px] font-semibold tracking-wide text-lyp-black transition-all duration-500 ${EASE} hover:border-lyp-cherry/25 hover:text-lyp-cherry active:scale-[0.985]`}
              >
                Supersede
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full bg-[#F7F1F1] transition-transform duration-500 ${EASE} group-hover:scale-105`}
                >
                  <Copy strokeWidth={1.5} className="h-3.5 w-3.5" />
                </span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* ─────────────── Discount timer ─────────────── */}
      <ProposalDiscountTimer
        proposalId={id}
        initialActive={proposal.discount_timer_active ?? false}
        initialExpiresAt={proposal.discount_expires_at}
        locked={isSigned || proposal.status === "superseded"}
      />

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
        />
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
