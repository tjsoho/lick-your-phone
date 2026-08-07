import Link from "next/link";
import { notFound } from "next/navigation";
import { getProposal } from "@/server-actions/proposals";
import { formatCents, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Check,
  Clock,
  AlertCircle,
  CreditCard,
  Pencil,
  Copy,
} from "lucide-react";

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lineItems: any[] = proposal.proposal_line_items ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payments: any[] = proposal.payments ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const notes: any[] = proposal.internal_notes ?? [];

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
                <th className="py-2 font-semibold">Term</th>
                <th className="py-2 font-semibold text-right">Price</th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map((li: any) => (
                <tr key={li.id} className="border-b border-gray-100">
                  <td className="py-2">{li.services?.name ?? "—"}</td>
                  <td className="py-2 capitalize">{li.billing ?? "—"}</td>
                  <td className="py-2">{li.term ?? "—"}</td>
                  <td className="py-2 text-right">
                    {formatCents(li.price_snapshot_cents)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      {/* Payments */}
      <Section title="Payments">
        {payments.length === 0 ? (
          <p className="text-sm text-gray-400">No payments recorded.</p>
        ) : (
          payments.map((payment: any) => (
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
              {payment.payment_schedules?.length > 0 ? (
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 text-gray-500">
                      <th className="py-1.5 font-medium">Date</th>
                      <th className="py-1.5 font-medium">Amount</th>
                      <th className="py-1.5 font-medium">Pinch ID</th>
                      <th className="py-1.5 font-medium text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payment.payment_schedules.map((sched: any) => (
                      <tr key={sched.id} className="border-b border-gray-50">
                        <td className="py-1.5">
                          {formatDate(sched.scheduled_date)}
                        </td>
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
      {notes.length > 0 && (
        <Section title="Internal Notes">
          <div className="space-y-2">
            {notes.map((note: any) => (
              <div
                key={note.id}
                className="text-sm text-gray-700 border-l-2 border-gray-200 pl-3"
              >
                <p>{note.content}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {formatDate(note.created_at)}
                </p>
              </div>
            ))}
          </div>
        </Section>
      )}
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
