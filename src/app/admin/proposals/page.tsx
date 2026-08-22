import Link from "next/link";
import { getProposals } from "@/server-actions/proposals";
import { formatCents, formatDate } from "@/lib/format";
import { getAppUrl } from "@/lib/app-url";
import { cn } from "@/lib/utils";
import {
  Check,
  Clock,
  AlertCircle,
  CreditCard,
  Pencil,
  Copy,
  Eye,
  Plus,
} from "lucide-react";
import ProposalStatusSelect from "@/components/admin/ProposalStatusSelect";
import SendProposalButton from "@/components/admin/SendProposalButton";
import PortalLinkCell from "@/components/admin/PortalLinkCell";

const EASE = "ease-brand";

const thClasses =
  "whitespace-nowrap px-5 py-3 text-left font-body text-[9px] font-medium uppercase tracking-[0.2em] text-[#A89898]";

function PaymentBadge({ status }: { status?: string }) {
  if (!status) return <span className="text-[13px] text-[#C3B5B5]">—</span>;
  const map: Record<
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
  const entry = map[status];
  if (!entry)
    return <span className="text-[12px] text-[#8A7A7A]">{status}</span>;
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

export default async function ProposalsPage() {
  const [{ data: proposals, error }, appUrl] = await Promise.all([
    getProposals(),
    getAppUrl(),
  ]);

  return (
    <div className="mx-auto max-w-[92rem]">
      <header className="animate-rise mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="h-px w-7 bg-lyp-cherry/30" />
            <span className="font-body text-[10px] font-medium uppercase tracking-[0.32em] text-lyp-cherry/70">
              Pipeline
            </span>
          </div>
          <h1 className="mt-3 font-heading text-[28px] font-bold leading-[1.05] tracking-[-0.03em] text-lyp-black">
            Proposals
          </h1>
        </div>

        <Link
          href="/admin/proposals/new"
          className={`group inline-flex items-center gap-3 rounded-full bg-lyp-cherry py-1.5 pl-6 pr-1.5 font-body text-[13px] font-semibold tracking-wide text-lyp-white shadow-[0_10px_30px_-10px_rgba(178,38,38,0.5)] transition-all duration-500 ${EASE} hover:bg-[#c22e2e] active:scale-[0.985]`}
        >
          New Proposal
          <span
            className={`flex h-8 w-8 items-center justify-center rounded-full bg-lyp-white/15 transition-transform duration-500 ${EASE} group-hover:scale-105`}
          >
            <Plus strokeWidth={1.5} className="h-4 w-4" />
          </span>
        </Link>
      </header>

      {error && (
        <div
          role="alert"
          className="mb-5 flex items-start gap-3 rounded-2xl border border-lyp-cherry/15 bg-lyp-cherry/[0.04] px-4 py-3.5"
        >
          <AlertCircle
            strokeWidth={1.25}
            className="mt-px h-4 w-4 flex-shrink-0 text-lyp-cherry"
          />
          <p className="font-body text-[13px] text-lyp-cherry">
            Failed to load proposals: {error}
          </p>
        </div>
      )}

      <div
        className="animate-rise overflow-hidden rounded-2xl border border-[#EFE6E6] bg-lyp-white"
        style={{ animationDelay: "80ms" }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left font-body text-[12.5px]">
            <thead>
              <tr className="border-b border-[#F1E8E8]">
                <th className={thClasses}>Client</th>
                <th className={thClasses}>Location</th>
                <th className={thClasses}>Status</th>
                <th className={thClasses}>
                  <span className="flex items-center gap-1.5">
                    <CreditCard strokeWidth={1.5} className="h-3 w-3" />
                    Payment
                  </span>
                </th>
                <th className={thClasses}>Total</th>
                <th className={thClasses}>Created</th>
                <th className={thClasses}>Proposal Link</th>
                <th className={thClasses}>Actions</th>
                <th className={cn(thClasses, "text-right")}>ID</th>
              </tr>
            </thead>
            <tbody>
              {proposals && proposals.length > 0 ? (
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                proposals.map((proposal: any) => {
                  const paymentStatus = proposal.payments?.[0]?.status;
                  const intakeCount = proposal.intake_responses?.length ?? 0;
                  const portalUrl = proposal.token
                    ? `${appUrl}/portal/${proposal.token}`
                    : null;

                  return (
                    <tr
                      key={proposal.id}
                      className={`border-b border-[#F7F1F1] transition-colors duration-500 last:border-0 ${EASE} hover:bg-[#FBF8F8]`}
                    >
                      <td className="whitespace-nowrap px-5 py-3">
                        <Link
                          href={`/admin/clients/${proposal.clients?.id}`}
                          className={`font-medium text-lyp-black transition-colors duration-500 ${EASE} hover:text-lyp-cherry`}
                        >
                          {proposal.clients?.name ?? "—"}
                        </Link>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-[#8A7A7A]">
                        {proposal.venues?.name ?? "—"}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3">
                        <ProposalStatusSelect
                          proposalId={proposal.id}
                          currentStatus={proposal.status}
                        />
                      </td>
                      <td className="whitespace-nowrap px-5 py-3">
                        <PaymentBadge status={paymentStatus} />
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 font-medium tabular-nums text-lyp-black">
                        {proposal.total_snapshot_cents != null
                          ? formatCents(proposal.total_snapshot_cents)
                          : "—"}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 tabular-nums text-[#A89898]">
                        {formatDate(proposal.created_at)}
                      </td>
                      <td className="px-5 py-3">
                        <PortalLinkCell url={portalUrl} />
                      </td>
                      <td className="whitespace-nowrap px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <SendProposalButton
                            proposalId={proposal.id}
                            status={proposal.status}
                          />

                          {intakeCount > 0 && (
                            <Link
                              href={`/admin/proposals/${proposal.id}/intake`}
                              className={`text-[#A89898] transition-colors duration-500 ${EASE} hover:text-lyp-cherry`}
                              title="View intake responses"
                            >
                              <Eye strokeWidth={1.5} className="h-4 w-4" />
                            </Link>
                          )}
                          {proposal.status === "draft" && (
                            <Link
                              href={`/admin/proposals/${proposal.id}/edit`}
                              className={`text-[#A89898] transition-colors duration-500 ${EASE} hover:text-lyp-cherry`}
                              title="Edit draft"
                            >
                              <Pencil strokeWidth={1.5} className="h-4 w-4" />
                            </Link>
                          )}
                          {proposal.status !== "superseded" && (
                            <Link
                              href={`/admin/proposals/${proposal.id}/edit?mode=supersede`}
                              className={`text-[#A89898] transition-colors duration-500 ${EASE} hover:text-lyp-cherry`}
                              title="Create superseding proposal"
                            >
                              <Copy strokeWidth={1.5} className="h-4 w-4" />
                            </Link>
                          )}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-right">
                        <Link
                          href={`/admin/proposals/${proposal.id}`}
                          title={proposal.id}
                          className={`font-mono text-[11px] text-[#C3B5B5] transition-colors duration-500 ${EASE} hover:text-lyp-cherry`}
                        >
                          {proposal.id ? `${proposal.id.slice(0, 8)}…` : "—"}
                        </Link>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="px-8 py-12 text-center">
                    <p className="font-body text-[14px] text-[#8A7A7A]">
                      No proposals yet.
                    </p>
                    <Link
                      href="/admin/proposals/new"
                      className={`mt-3 inline-block font-body text-[13px] font-semibold text-lyp-cherry transition-opacity duration-500 ${EASE} hover:opacity-70`}
                    >
                      Create your first proposal
                    </Link>
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
