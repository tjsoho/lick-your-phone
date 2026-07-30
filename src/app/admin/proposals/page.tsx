import Link from "next/link";
import { getProposals } from "@/server-actions/proposals";
import { formatCents, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Check, Clock, AlertCircle, CreditCard } from "lucide-react";

const statusStyles: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  sent: "bg-blue-100 text-blue-700",
  signed: "bg-green-100 text-green-700",
  superseded: "bg-red-100 text-red-700",
};

function PaymentBadge({ status }: { status?: string }) {
  if (!status) return <span className="text-gray-400 text-xs">—</span>;
  const map: Record<string, { icon: typeof Check; color: string; label: string }> = {
    details_captured: { icon: Check, color: "text-green-600", label: "Captured" },
    scheduled: { icon: Clock, color: "text-blue-600", label: "Scheduled" },
    pending: { icon: Clock, color: "text-amber-600", label: "Pending" },
    settled: { icon: Check, color: "text-green-600", label: "Settled" },
    dishonoured: { icon: AlertCircle, color: "text-red-600", label: "Dishonoured" },
    failed: { icon: AlertCircle, color: "text-red-600", label: "Failed" },
  };
  const entry = map[status];
  if (!entry) return <span className="text-gray-400 text-xs">{status}</span>;
  const Icon = entry.icon;
  return (
    <span className={cn("flex items-center gap-1 text-xs font-medium", entry.color)}>
      <Icon className="h-3 w-3" />
      {entry.label}
    </span>
  );
}

export default async function ProposalsPage() {
  const { data: proposals, error } = await getProposals();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-heading font-bold text-lyp-black">
          Proposals
        </h1>
        <Link
          href="/admin/proposals/new"
          className="bg-lyp-cherry text-white px-4 py-2 rounded-md font-body text-sm hover:opacity-90 transition-colors"
        >
          New Proposal
        </Link>
      </div>

      {error && (
        <p className="text-red-600 mb-4">Failed to load proposals: {error}</p>
      )}

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 font-heading text-sm font-semibold text-lyp-black">
                  Client
                </th>
                <th className="px-4 py-3 font-heading text-sm font-semibold text-lyp-black">
                  Venue
                </th>
                <th className="px-4 py-3 font-heading text-sm font-semibold text-lyp-black">
                  Status
                </th>
                <th className="px-4 py-3 font-heading text-sm font-semibold text-lyp-black">
                  <span className="flex items-center gap-1">
                    <CreditCard className="h-3.5 w-3.5" />
                    Payment
                  </span>
                </th>
                <th className="px-4 py-3 font-heading text-sm font-semibold text-lyp-black">
                  Intake
                </th>
                <th className="px-4 py-3 font-heading text-sm font-semibold text-lyp-black">
                  Total
                </th>
                <th className="px-4 py-3 font-heading text-sm font-semibold text-lyp-black">
                  Created
                </th>
              </tr>
            </thead>
            <tbody>
              {proposals && proposals.length > 0 ? (
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                proposals.map((proposal: any) => {
                  const paymentStatus = proposal.payments?.[0]?.status;
                  const intakeCount = proposal.intake_responses?.length ?? 0;

                  return (
                    <tr
                      key={proposal.id}
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/clients/${proposal.clients?.id}`}
                          className="text-lyp-cherry font-body text-sm hover:underline"
                        >
                          {proposal.clients?.name ?? "—"}
                        </Link>
                      </td>
                      <td className="px-4 py-3 font-body text-sm text-gray-700">
                        {proposal.venues?.name ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-block px-2 py-0.5 rounded-full text-xs font-body font-medium capitalize",
                            statusStyles[proposal.status] ?? "bg-gray-100 text-gray-700"
                          )}
                        >
                          {proposal.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <PaymentBadge status={paymentStatus} />
                      </td>
                      <td className="px-4 py-3">
                        {intakeCount > 0 ? (
                          <span className="flex items-center gap-1 text-xs font-medium text-green-600">
                            <Check className="h-3 w-3" />
                            Done
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-body text-sm text-gray-700">
                        {proposal.total_snapshot_cents != null
                          ? formatCents(proposal.total_snapshot_cents)
                          : "—"}
                      </td>
                      <td className="px-4 py-3 font-body text-sm text-gray-700">
                        {formatDate(proposal.created_at)}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center font-body text-sm text-gray-500"
                  >
                    No proposals yet. Create your first proposal to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
