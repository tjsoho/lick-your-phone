import Link from "next/link";
import { notFound } from "next/navigation";
import React from "react";
import { getProposal } from "@/server-actions/proposals";
import { formatCents, formatDate, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { createAdminClient } from "@/utils/server";
import {
  ArrowLeft,
  Check,
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
  Receipt,
} from "lucide-react";
import ProposalInternalNotes from "@/components/admin/ProposalInternalNotes";

interface ProposalLineItem {
  id: string;
  price_snapshot_cents: number;
  billing_cycle_snapshot_months: number;
  billing: string | null;
  term: string | null;
  services: {
    name: string;
  } | null;
  service_tiers: {
    name: string;
  } | null;
}

interface PaymentSchedule {
  id: string;
  scheduled_date: string;
  description: string | null;
  amount_cents: number;
  pinch_payment_id: string | null;
  status: string;
}

interface Payment {
  id: string;
  card_brand: string | null;
  card_last_four: string | null;
  card_expiry: string | null;
  status: string;
  payment_schedules?: PaymentSchedule[];
}

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

const thClasses =
  "whitespace-nowrap px-4 py-3 text-left font-body text-[9px] font-medium uppercase tracking-[0.2em] text-[#A89898]";

/** Muted, tonal pills — saturated Tailwind defaults read cheap next to the brand. */
const statusStyles: Record<string, string> = {
  draft: "bg-[#F2EDED] text-[#8A7A7A]",
  sent: "bg-[#EDF1F7] text-[#5B7394]",
  intake_complete: "bg-[#FBF3E3] text-[#9A7B2E]",
  signed: "bg-[#E9F2EC] text-[#4A7A5C]",
  superseded: "bg-lyp-cherry/[0.07] text-lyp-cherry",
};

const paymentStatusMap: Record<
  string,
  { icon: typeof Check; color: string; label: string }
> = {
  details_captured: {
    icon: Check,
    color: "text-[#4A7A5C]",
    label: "Captured",
  },
  scheduled: { icon: Clock, color: "text-[#5B7394]", label: "Scheduled" },
  pending: { icon: Clock, color: "text-[#9A7B2E]", label: "Pending" },
  settled: { icon: Check, color: "text-[#4A7A5C]", label: "Settled" },
  dishonoured: {
    icon: AlertCircle,
    color: "text-lyp-cherry",
    label: "Dishonoured",
  },
  failed: { icon: AlertCircle, color: "text-lyp-cherry", label: "Failed" },
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
    title: "Intake Completed",
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

function StatusBadge({
  status,
  map,
}: {
  status?: string;
  map: typeof paymentStatusMap;
}) {
  if (!status)
    return <span className="font-body text-[12px] text-[#C3B5B5]">—</span>;
  const entry = map[status];
  if (!entry)
    return (
      <span className="font-body text-[12px] capitalize text-[#8A7A7A]">
        {status}
      </span>
    );
  const Icon = entry.icon;
  return (
    <span
      className={cn(
        "flex items-center gap-1.5 font-body text-[12px] font-medium",
        entry.color,
      )}
    >
      <Icon strokeWidth={1.75} className="h-3 w-3" />
      {entry.label}
    </span>
  );
}

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

  const lineItems = (proposal.proposal_line_items ??
    []) as unknown as ProposalLineItem[];
  const payments = (proposal.payments ?? []) as unknown as Payment[];
  const notes = (proposal.internal_notes ?? []) as unknown as InternalNote[];

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
                  statusStyles[proposal.status] ?? "bg-[#F2EDED] text-[#8A7A7A]",
                )}
              >
                {String(proposal.status ?? "—").replace(/_/g, " ")}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
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

      {/* ─────────────── Line items ─────────────── */}
      <Section title="Line Items" delay="140ms" flush>
        {lineItems.length === 0 ? (
          <EmptyRow icon={Receipt} message="No line items." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-body text-[12.5px]">
              <thead>
                <tr className="border-b border-[#F1E8E8]">
                  <th className={thClasses}>Service</th>
                  <th className={thClasses}>Billing</th>
                  <th className={thClasses}>Term</th>
                  <th className={cn(thClasses, "text-right")}>Price</th>
                  <th className={cn(thClasses, "text-right")}>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((li) => (
                  <tr
                    key={li.id}
                    className={`border-b border-[#F7F1F1] transition-colors duration-500 ${EASE} hover:bg-[#FBF8F8]`}
                  >
                    <td className="px-4 py-3 font-medium text-lyp-black">
                      {li.services?.name}{" "}
                      {li.service_tiers?.name && `(${li.service_tiers.name})`}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 capitalize text-[#8A7A7A]">
                      {li.billing ?? "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 tabular-nums text-[#8A7A7A]">
                      {li.billing_cycle_snapshot_months} Months
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-lyp-black">
                      {formatCents(li.price_snapshot_cents)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-lyp-black">
                      {formatCents(
                        li.price_snapshot_cents *
                          (li.billing_cycle_snapshot_months || 1),
                      )}
                    </td>
                  </tr>
                ))}
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-3 text-right font-body text-[10px] font-medium uppercase tracking-[0.22em] text-[#A89898]"
                  >
                    Total
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right font-heading text-[15px] font-bold tabular-nums tracking-[-0.02em] text-lyp-black">
                    {formatCents(proposal.total_snapshot_cents ?? 0)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* ─────────────── Payments ─────────────── */}
      <Section title="Payments" delay="200ms">
        {payments.length === 0 ? (
          <EmptyRow icon={CreditCard} message="No payments recorded." />
        ) : (
          <div className="space-y-4">
            {payments.map((payment) => (
              <div
                key={payment.id}
                className="rounded-2xl border border-[#EFE6E6] bg-[#FCFAFA] p-4 sm:p-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-lyp-cherry/[0.06] ring-1 ring-lyp-cherry/10">
                      <CreditCard
                        strokeWidth={1.25}
                        className="h-3.5 w-3.5 text-lyp-cherry"
                      />
                    </span>
                    <span className="font-body text-[13px] font-medium text-lyp-black">
                      {payment.card_brand ?? "Card"} ••••{" "}
                      <span className="tabular-nums">
                        {payment.card_last_four ?? "????"}
                      </span>
                    </span>
                    {payment.card_expiry && (
                      <span className="font-body text-[11px] tabular-nums text-[#A89898]">
                        Exp {payment.card_expiry}
                      </span>
                    )}
                  </div>
                  <StatusBadge status={payment.status} map={paymentStatusMap} />
                </div>

                <h3 className="mt-5 font-body text-[10px] font-medium uppercase tracking-[0.22em] text-[#A89898]">
                  Payment Schedule
                </h3>

                {payment.payment_schedules &&
                payment.payment_schedules.length > 0 ? (
                  <div className="mt-2 overflow-x-auto">
                    <table className="w-full text-left font-body text-[12px]">
                      <thead>
                        <tr className="border-b border-[#F1E8E8]">
                          <th className={thClasses}>Date</th>
                          <th className={thClasses}>Description</th>
                          <th className={cn(thClasses, "text-right")}>
                            Amount
                          </th>
                          <th className={thClasses}>Pinch ID</th>
                          <th className={cn(thClasses, "text-right")}>
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {payment.payment_schedules.map((sched) => (
                          <tr
                            key={sched.id}
                            className="border-b border-[#F7F1F1] last:border-0"
                          >
                            <td className="whitespace-nowrap px-4 py-2.5 tabular-nums text-lyp-black">
                              {formatDate(sched.scheduled_date)}
                            </td>
                            <td className="px-4 py-2.5 text-[#8A7A7A]">
                              {sched.description || "—"}
                            </td>
                            <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums text-lyp-black">
                              {formatCents(sched.amount_cents)}
                            </td>
                            <td className="whitespace-nowrap px-4 py-2.5 font-mono text-[11px] text-[#C3B5B5]">
                              {sched.pinch_payment_id
                                ? sched.pinch_payment_id.slice(0, 12) + "…"
                                : "—"}
                            </td>
                            <td className="px-4 py-2.5">
                              <span className="flex justify-end">
                                <StatusBadge
                                  status={sched.status}
                                  map={paymentStatusMap}
                                />
                              </span>
                            </td>
                          </tr>
                        ))}

                        <tr>
                          <td
                            colSpan={2}
                            className="px-4 py-2.5 font-body text-[10px] font-medium uppercase tracking-[0.22em] text-[#A89898]"
                          >
                            Total
                          </td>
                          <td className="whitespace-nowrap px-4 py-2.5 text-right font-body text-[13px] font-semibold tabular-nums text-lyp-black">
                            {formatCents(
                              payment.payment_schedules.reduce(
                                (sum, sched) => sum + sched.amount_cents,
                                0,
                              ),
                            )}
                          </td>
                          <td colSpan={2}></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="mt-2 font-body text-[12px] text-[#A89898]">
                    No scheduled payments.
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* ─────────────── Notes ─────────────── */}
      <Section title="Internal Notes" delay="240ms">
        <ProposalInternalNotes proposalId={id} initialNotes={notes} />
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
  flush = false,
}: {
  title: string;
  children: React.ReactNode;
  delay: string;
  flush?: boolean;
}) {
  return (
    <section className="animate-rise mb-8" style={{ animationDelay: delay }}>
      <h2 className="font-heading text-[16px] font-bold tracking-[-0.02em] text-lyp-black">
        {title}
      </h2>
      <div
        className={cn(
          "mt-3.5 overflow-hidden rounded-2xl border border-[#EFE6E6] bg-lyp-white",
          !flush && "p-5",
        )}
      >
        {children}
      </div>
    </section>
  );
}
