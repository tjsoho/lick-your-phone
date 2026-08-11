import Link from "next/link";
import { notFound } from "next/navigation";
import React from "react";
import { getProposal } from "@/server-actions/proposals";
import { formatCents, formatDate, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { createAdminClient, createClient } from "@/utils/server";
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

const statusStyles: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  sent: "bg-blue-100 text-blue-700",
  signed: "bg-green-100 text-green-700",
  superseded: "bg-red-100 text-red-700",
};

const paymentStatusMap: Record<
  string,
  { icon: typeof Check; color: string; label: string }
> = {
  details_captured: { icon: Check, color: "text-green-600", label: "Captured" },
  scheduled: { icon: Clock, color: "text-blue-600", label: "Scheduled" },
  pending: { icon: Clock, color: "text-amber-600", label: "Pending" },
  settled: { icon: Check, color: "text-green-600", label: "Settled" },
  dishonoured: {
    icon: AlertCircle,
    color: "text-red-600",
    label: "Dishonoured",
  },
  failed: { icon: AlertCircle, color: "text-red-600", label: "Failed" },
};

const eventDetails: Record<
  string,
  {
    title: string;
    color: string;
    icon: React.ComponentType<{ className?: string }>;
    getDescription: (metadata: AuditMetadata) => string;
  }
> = {
  PROPOSAL_SENT: {
    title: "Proposal Sent",
    color: "bg-blue-50 text-blue-700 border-blue-200",
    icon: Send,
    getDescription: (meta) =>
      `Sent to ${meta?.clientEmail || meta?.clientName || "Client"}`,
  },
  PROPOSAL_SIGNED: {
    title: "Proposal Signed",
    color: "bg-green-50 text-green-700 border-green-200",
    icon: FileSignature,
    getDescription: (meta) =>
      `Signed by ${meta?.signerEmail || meta?.clientName || "Client"}. Total: ${
        meta?.totalAmount ? formatCents(meta.totalAmount) : "—"
      }`,
  },
  INTAKE_COMPLETED: {
    title: "Intake Completed",
    color: "bg-indigo-50 text-indigo-700 border-indigo-200",
    icon: ClipboardCheck,
    getDescription: (meta) =>
      `${meta?.isEdit ? "Updated" : "Submitted"} by ${
        meta?.clientName || "Client"
      }${meta?.assets?.length ? ` with ${meta.assets.length} assets` : ""}`,
  },
  PAYMENT_CAPTURED: {
    title: "Payment Details Captured",
    color: "bg-amber-50 text-amber-700 border-amber-200",
    icon: CreditCard,
    getDescription: (meta) =>
      `Payment details captured for ${meta?.clientName || "Client"}.`,
  },
  PAYMENT_SUCCEEDED: {
    title: "Payment Succeeded",
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: DollarSign,
    getDescription: (meta) =>
      `Payment of ${meta?.amount ? formatCents(meta.amount) : "—"} succeeded.`,
  },
  PAYMENT_FAILED: {
    title: "Payment Failed",
    color: "bg-rose-50 text-rose-700 border-rose-200",
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
  if (!status) return <span className="text-gray-400 text-xs">—</span>;
  const entry = map[status];
  if (!entry)
    return <span className="text-gray-500 text-xs capitalize">{status}</span>;
  const Icon = entry.icon;
  return (
    <span
      className={cn("flex items-center gap-1 text-xs font-medium", entry.color)}
    >
      <Icon className="h-3 w-3" />
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
    <div className="max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/admin/proposals"
          className="text-sm text-gray-500 hover:text-lyp-cherry flex items-center gap-1 mb-3"
        >
          <ArrowLeft className="h-3 w-3" /> Back to proposals
        </Link>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-heading font-bold text-lyp-black">
              {proposal.clients?.name ?? "Proposal"}
            </h1>
            <span
              className={cn(
                "inline-block px-2 py-0.5 rounded-full text-xs font-body font-medium capitalize",
                statusStyles[proposal.status] ?? "bg-gray-100 text-gray-700",
              )}
            >
              {proposal.status}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {proposal.status === "draft" && (
              <Link
                href={`/admin/proposals/${id}/edit`}
                className="flex items-center gap-1 text-sm text-gray-600 hover:text-lyp-cherry border border-gray-200 rounded-md px-3 py-1.5"
              >
                <Pencil className="h-3.5 w-3.5" /> Edit
              </Link>
            )}
            {proposal.status !== "superseded" && (
              <Link
                href={`/admin/proposals/${id}/edit?mode=supersede`}
                className="flex items-center gap-1 text-sm text-gray-600 hover:text-blue-600 border border-gray-200 rounded-md px-3 py-1.5"
              >
                <Copy className="h-3.5 w-3.5" /> Supersede
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Info grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <InfoCard label="Client" value={proposal.clients?.name} />
        <InfoCard label="Venue" value={proposal.venues?.name} />
        <InfoCard
          label="Total"
          value={
            proposal.total_snapshot_cents != null
              ? formatCents(proposal.total_snapshot_cents)
              : "—"
          }
        />
        <InfoCard label="Created" value={formatDate(proposal.created_at)} />
        {proposal.signed_at && (
          <InfoCard label="Signed" value={formatDate(proposal.signed_at)} />
        )}
        {proposal.signer_email && (
          <InfoCard label="Signer" value={proposal.signer_email} />
        )}
      </div>

      {/* Line items */}
      <Section title="Line Items">
        {lineItems.length === 0 ? (
          <p className="text-sm text-gray-400">No line items.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="py-2 font-semibold">Service</th>
                <th className="py-2 font-semibold">Billing</th>
                <th className="py-2 font-semibold text-right">Price</th>
                <th className="py-2 font-semibold">Term</th>
                <th className="py-2 font-semibold text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map((li) => (
                <tr key={li.id} className="border-b border-gray-100">
                  <td className="py-2">
                    {li.services?.name}{" "}
                    {li.service_tiers?.name && `(${li.service_tiers.name})`}
                  </td>
                  <td className="py-2 capitalize">{li.billing ?? "—"}</td>
                  <td className="py-2">
                    {li.billing_cycle_snapshot_months} Months
                  </td>
                  <td className="py-2 text-right">
                    {formatCents(li.price_snapshot_cents)}
                  </td>
                  <td className="py-2 text-right">
                    {formatCents(
                      li.price_snapshot_cents *
                        (li.billing_cycle_snapshot_months || 1),
                    )}
                  </td>
                </tr>
              ))}
              <tr>
                <td colSpan={4} className="py-2 font-semibold text-right">
                  Total
                </td>
                <td className="py-2 text-right font-semibold">
                  {formatCents(proposal.total_snapshot_cents ?? 0)}
                </td>
              </tr>
            </tbody>
          </table>
        )}
      </Section>

      {/* Payments */}
      <Section title="Payments">
        {payments.length === 0 ? (
          <p className="text-sm text-gray-400">No payments recorded.</p>
        ) : (
          payments.map((payment) => (
            <div
              key={payment.id}
              className="border border-gray-200 rounded-lg p-4 mb-4 last:mb-0"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <CreditCard className="h-4 w-4 text-gray-400" />
                  <span className="text-sm font-medium">
                    {payment.card_brand ?? "Card"} ••••{" "}
                    {payment.card_last_four ?? "????"}
                  </span>
                  {payment.card_expiry && (
                    <span className="text-xs text-gray-400">
                      Exp {payment.card_expiry}
                    </span>
                  )}
                </div>
                <StatusBadge status={payment.status} map={paymentStatusMap} />
              </div>

              {/* Payment schedules */}
              <h3 className="text-xs font-semibold text-gray-500 mt-2 mb-1">
                Payment Schedule
              </h3>
              {payment.payment_schedules &&
              payment.payment_schedules.length > 0 ? (
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 text-gray-500">
                      <th className="py-1.5 font-medium">Date</th>
                      <th className="py-1.5 font-medium">Description</th>
                      <th className="py-1.5 font-medium">Amount</th>
                      <th className="py-1.5 font-medium">Pinch ID</th>
                      <th className="py-1.5 font-medium text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payment.payment_schedules.map((sched) => (
                      <tr key={sched.id} className="border-b border-gray-50">
                        <td className="py-1.5">
                          {formatDate(sched.scheduled_date)}
                        </td>
                        <td className="py-1.5">{sched.description || "—"}</td>
                        <td className="py-1.5">
                          {formatCents(sched.amount_cents)}
                        </td>
                        <td className="py-1.5 text-gray-400 font-mono">
                          {sched.pinch_payment_id
                            ? sched.pinch_payment_id.slice(0, 12) + "…"
                            : "—"}
                        </td>
                        <td className="py-1.5 text-right">
                          <StatusBadge
                            status={sched.status}
                            map={paymentStatusMap}
                          />
                        </td>
                      </tr>
                    ))}

                    <tr>
                      <td colSpan={2} className="py-1.5 font-semibold">
                        Total
                      </td>
                      <td className="py-1.5 font-semibold">
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
              ) : (
                <p className="text-xs text-gray-400">No scheduled payments.</p>
              )}
            </div>
          ))
        )}
      </Section>

      {/* Notes */}
      <Section title="Internal Notes">
        <ProposalInternalNotes proposalId={id} initialNotes={notes} />
      </Section>

      {/* Activity Timeline */}
      <Section title="Activity Timeline">
        {events.length === 0 ? (
          <p className="text-sm text-gray-400">No activity recorded yet.</p>
        ) : (
          <div className="relative border-l border-gray-200 ml-4 pl-6 space-y-6">
            {events.map((event) => {
              const meta = (event.metadata || {}) as AuditMetadata;
              const config = eventDetails[event.action] || {
                title: event.action.replace(/_/g, " "),
                color: "bg-gray-50 text-gray-600 border-gray-200",
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
                      "absolute -left-[35px] top-0.5 flex h-6 w-6 items-center justify-center rounded-full border bg-white shadow-sm",
                      config.color,
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </span>

                  {/* Timeline content */}
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold text-gray-900 capitalize">
                        {config.title}
                      </h4>
                      <span className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold bg-gray-100 px-1.5 py-0.5 rounded">
                        {event.actor_type}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {config.getDescription(meta)}
                    </p>
                    <p className="text-xs text-gray-400 mt-1 font-mono">
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

function InfoCard({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg px-4 py-3">
      <p className="text-xs text-gray-500 font-medium mb-1">{label}</p>
      <p className="text-sm font-body text-lyp-black">{value ?? "—"}</p>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-8">
      <h2 className="text-lg font-heading font-semibold text-lyp-black mb-3">
        {title}
      </h2>
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        {children}
      </div>
    </div>
  );
}
