import Link from "next/link";
import { getProposals } from "@/server-actions/proposals";
import { formatCents, formatDate } from "@/lib/format";
import { getAppUrl } from "@/lib/app-url";
import { cn } from "@/lib/utils";
import {
  Check,
  Clock,
  AlertCircle,
  Pencil,
  Copy,
  ClipboardList,
  LayoutList,
  Plus,
} from "lucide-react";
import ProposalStatusSelect from "@/components/admin/ProposalStatusSelect";
import SendProposalButton from "@/components/admin/SendProposalButton";
import PortalLinkCell from "@/components/admin/PortalLinkCell";

const EASE = "ease-brand";

/* -------------------------------------------------------------------------
   FITTING THE TABLE ON A LAPTOP.

   Nine columns ran ~1450px wide, so on a 1440 screen (1120px of content once
   the sidebar and page padding are taken) the Actions column — the Onboarding
   button included — fell off the right edge with nothing to tell you it was
   there. Three things fix it, together:

   1. Low-value columns are folded into their neighbours rather than dropped:
      the venue sits under the client name, the payment badge under the status
      pill, and the proposal's own workspace is an icon in Actions instead of
      a column of truncated UUIDs.
   2. The remaining cells are capped and truncate, so one long venue name or a
      long portal URL cannot push everything else sideways.
   3. Actions is stuck to the right edge of the scroller, so on anything
      narrower than it needs it stays on screen while the rest scrolls under
      it. No action can ever become unreachable.
   ------------------------------------------------------------------------- */

const thClasses =
  "whitespace-nowrap px-3.5 py-3 text-left font-body text-[9px] font-medium uppercase tracking-[0.2em] text-[#A89898]";

/** The Actions column rides the right edge, so it needs its own ground. */
const stickyActions =
  "sticky right-0 z-10 bg-lyp-white shadow-[-14px_0_18px_-14px_rgba(61,11,17,0.22)]";

function PaymentBadge({ status }: { status?: string }) {
  if (!status) return null;
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
    return <span className="text-[11.5px] text-[#8A7A7A]">{status}</span>;
  const Icon = entry.icon;
  return (
    <span
      className={cn(
        "flex items-center gap-1.5 font-body text-[11.5px] font-medium",
        entry.color,
      )}
    >
      <Icon strokeWidth={1.75} className="h-3 w-3 flex-shrink-0" />
      {entry.label}
    </span>
  );
}

export default async function ProposalsPage() {
  const [{ data: proposals, error }, appUrl] = await Promise.all([
    getProposals(),
    getAppUrl(),
  ]);

  const iconAction = `flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-[#EFE6E6] bg-lyp-white text-[#A89898] transition-all duration-500 ${EASE} hover:border-lyp-cherry/25 hover:text-lyp-cherry active:scale-95`;

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
                <th className={thClasses}>Status</th>
                <th className={thClasses}>Total</th>
                {/* The date is the first thing to go when space runs out. */}
                <th className={cn(thClasses, "hidden xl:table-cell")}>
                  Created
                </th>
                <th className={thClasses}>Proposal Link</th>
                <th className={cn(thClasses, stickyActions)}>Actions</th>
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
                      className={`group border-b border-[#F7F1F1] transition-colors duration-500 last:border-0 ${EASE} hover:bg-[#FBF8F8]`}
                    >
                      {/* Client, with the venue it belongs to underneath —
                          one column instead of two. */}
                      <td className="px-3.5 py-3">
                        <div className="max-w-[160px]">
                          <Link
                            href={`/admin/clients/${proposal.clients?.id}`}
                            className={`block truncate font-medium text-lyp-black transition-colors duration-500 ${EASE} hover:text-lyp-cherry`}
                          >
                            {proposal.clients?.name ?? "—"}
                          </Link>
                          {proposal.venues?.name && (
                            <span className="mt-0.5 block truncate font-body text-[11px] text-[#A89898]">
                              {proposal.venues.name}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status, with the payment state reading as a footnote
                          to it rather than as a column of its own. */}
                      <td className="whitespace-nowrap px-3.5 py-3">
                        <ProposalStatusSelect
                          proposalId={proposal.id}
                          currentStatus={proposal.status}
                        />
                        {paymentStatus && (
                          <span className="mt-1.5 block">
                            <PaymentBadge status={paymentStatus} />
                          </span>
                        )}
                      </td>

                      <td className="whitespace-nowrap px-3.5 py-3 font-medium tabular-nums text-lyp-black">
                        {proposal.total_snapshot_cents != null
                          ? formatCents(proposal.total_snapshot_cents)
                          : "—"}
                      </td>

                      <td className="hidden whitespace-nowrap px-3.5 py-3 tabular-nums text-[#A89898] xl:table-cell">
                        {formatDate(proposal.created_at)}
                      </td>

                      {/* Capped so a long host never widens the table; the
                          link itself truncates inside it. */}
                      <td className="px-3.5 py-3">
                        <div className="w-[160px] max-w-full">
                          <PortalLinkCell url={portalUrl} />
                        </div>
                      </td>

                      <td
                        className={cn(
                          "whitespace-nowrap px-3.5 py-3 transition-colors duration-500",
                          EASE,
                          stickyActions,
                          "group-hover:bg-[#FBF8F8]",
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <SendProposalButton
                            proposalId={proposal.id}
                            status={proposal.status}
                          />

                          <Link
                            href={`/admin/proposals/${proposal.id}`}
                            title={`Open proposal workspace (${proposal.id})`}
                            aria-label="Open proposal workspace"
                            className={iconAction}
                          >
                            <LayoutList
                              strokeWidth={1.5}
                              className="h-3.5 w-3.5"
                            />
                          </Link>

                          {/* The one labelled button in the row — onboarding
                              answers are what the team comes here to open, so
                              it never reduces to a bare icon. */}
                          {intakeCount > 0 && (
                            <Link
                              href={`/admin/proposals/${proposal.id}/intake`}
                              className={`inline-flex items-center gap-1.5 rounded-full border border-lyp-cherry/25 bg-lyp-cherry/[0.06] px-3 py-1.5 font-body text-[12px] font-semibold text-lyp-cherry transition-all duration-500 ${EASE} hover:bg-lyp-cherry/[0.12] active:scale-[0.985]`}
                              title="View onboarding answers"
                            >
                              <ClipboardList
                                strokeWidth={1.5}
                                className="h-3.5 w-3.5"
                              />
                              Onboarding
                            </Link>
                          )}
                          {proposal.status === "draft" && (
                            <Link
                              href={`/admin/proposals/${proposal.id}/edit`}
                              className={iconAction}
                              title="Edit draft"
                              aria-label="Edit draft"
                            >
                              <Pencil strokeWidth={1.5} className="h-3.5 w-3.5" />
                            </Link>
                          )}
                          {proposal.status !== "superseded" && (
                            <Link
                              href={`/admin/proposals/${proposal.id}/edit?mode=supersede`}
                              className={iconAction}
                              title="Create superseding proposal"
                              aria-label="Create superseding proposal"
                            >
                              <Copy strokeWidth={1.5} className="h-3.5 w-3.5" />
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="px-8 py-12 text-center">
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
