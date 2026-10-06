"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ClipboardList,
  FilePlus2,
  EyeOff,
  Pencil,
  SearchX,
} from "lucide-react";
import { formatCents, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import AdminSearchField from "./AdminSearchField";
import SendProposalButton from "./SendProposalButton";
import PortalLinkButton from "./PortalLinkButton";
import ProposalStageBadges, {
  hasOnboarded,
  hasPaymentDetails,
  hasSigned,
  lifecycleOf,
} from "./ProposalStageBadges";

const EASE = "ease-brand";

/* -------------------------------------------------------------------------
   FITTING THE TABLE ON A LAPTOP.

   Nine columns ran ~1450px wide, so on a 1440 screen (1120px of content once
   the sidebar and page padding are taken) the Actions column — the Onboarding
   button included — fell off the right edge with nothing to tell you it was
   there. Three things fix it, together:

   1. Low-value columns are folded into their neighbours rather than dropped:
      the venue sits under the client name, the payment badge under the status
      pill, and the proposal's own workspace is the pencil in Actions instead
      of a column of truncated UUIDs.
   2. The remaining cells are capped and truncate, so one long venue name or a
      long portal URL cannot push everything else sideways.
   3. Actions is stuck to the right edge of the scroller, so on anything
      narrower than it needs it stays on screen while the rest scrolls under
      it. No action can ever become unreachable.

   Version, Monthly and Contract total were added after the agency asked for
   them. Version is two characters wide and always earns its place; Monthly
   steps out below `lg` and Created below `xl`, in that order, because the
   whole-of-contract figure is the one sales reads first.
   ------------------------------------------------------------------------- */

const thBase =
  "whitespace-nowrap px-3.5 py-3 text-left font-body text-[9px] font-medium uppercase tracking-[0.2em] text-[#867474]";

/** The Actions column rides the right edge, so it needs its own ground. */
const stickyActions =
  "sticky right-0 z-10 bg-lyp-white shadow-[-14px_0_18px_-14px_rgba(61,11,17,0.22)]";

/**
 * A heading that admits it has more to say. The agency couldn't tell what the
 * columns meant, so every one that isn't self-evident carries its explanation
 * on hover, marked by the dotted underline so you know to look.
 */
function Th({
  children,
  hint,
  className,
}: {
  children: React.ReactNode;
  hint?: string;
  className?: string;
}) {
  return (
    <th scope="col" className={cn(thBase, className)}>
      {hint ? (
        <span
          title={hint}
          className="cursor-help border-b border-dotted border-[#BFADAD] pb-px"
        >
          {children}
        </span>
      ) : (
        children
      )}
    </th>
  );
}

export type ProposalRow = {
  id: string;
  clientId: string | null;
  clientName: string | null;
  venueName: string | null;
  status: string | null;
  signedAt: string | null;
  paymentStatus: string | null;
  intakeCount: number;
  createdAt: string;
  /**
   * When the client first and last opened the portal, and the furthest slide
   * they reached. The agency asked for this to know who is reading and who is
   * sitting on it: "sometimes people just open it and they don't really start
   * completing it… it makes us understand whether to chase."
   */
  firstViewedAt: string | null;
  lastViewedAt: string | null;
  furthestPage: number | null;
  version: number;
  /** True when this row is the older half of a supersede chain. */
  superseded: boolean;
  portalUrl: string | null;
  /** Recurring services only, per month. Null when nothing has been priced. */
  monthlyCents: number | null;
  /** Every month of every term, plus one-off fees. */
  contractCents: number | null;
};

/** The filter's buckets, in the order a proposal travels through them. */
const FILTERS = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "signed", label: "Signed" },
  { value: "payment", label: "Payment details" },
  { value: "intake_complete", label: "Onboarding complete" },
] as const;

type FilterValue = (typeof FILTERS)[number]["value"];

function matchesFilter(row: ProposalRow, filter: FilterValue): boolean {
  if (filter === "all") return true;
  // The three stage filters ask "has this happened", not "is this the latest
  // thing that happened" — the same rule the badges draw themselves by, so a
  // row you can see a Signed badge on is always in the Signed filter.
  if (filter === "signed") return hasSigned(row);
  if (filter === "payment") return hasPaymentDetails(row);
  if (filter === "intake_complete") return hasOnboarded(row);
  return lifecycleOf(row) === filter;
}

/**
 * Whether the client has opened it, and how far they read.
 *
 * Deliberately quiet when they have: the row the agency is hunting for is the
 * one that says nothing back.
 */
function OpenedCell({ row }: { row: ProposalRow }) {
  if (!row.firstViewedAt) {
    return (
      <span
        title="The client has not opened this proposal yet."
        className="font-body text-[12px] text-[#9C8C8C]"
      >
        Not yet
      </span>
    );
  }

  const reached =
    row.furthestPage != null ? `, reached slide ${row.furthestPage + 1}` : "";
  const last = row.lastViewedAt
    ? `, last opened ${formatDate(row.lastViewedAt)}`
    : "";

  return (
    <span
      title={`First opened ${formatDate(row.firstViewedAt)}${last}${reached}.`}
      className="font-body text-[12.5px] text-lyp-black underline decoration-dotted decoration-[#BFADAD] underline-offset-[3px]"
    >
      {formatDate(row.firstViewedAt)}
    </span>
  );
}

export default function ProposalsTable({ rows }: { rows: ProposalRow[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterValue>("all");
  const [showSuperseded, setShowSuperseded] = useState(false);

  const supersededCount = rows.filter((row) => row.superseded).length;

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (row.superseded && !showSuperseded) return false;
      if (!matchesFilter(row, filter)) return false;
      if (!needle) return true;
      // Everything you can read in the row is searchable, version included,
      // so a venue name or "v2" finds it.
      const haystack = [row.clientName, row.venueName, row.status]
        .filter((field): field is string => Boolean(field))
        .concat(`v${row.version}`)
        .join(" ")
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [rows, query, filter, showSuperseded]);

  /* ------------------------------------------------------------------
     THE ROW'S ICON BUTTONS.

     They were ghost outlines — a hairline border and a pale glyph on an
     almost-white row — and the agency could not see them: "the actions are
     not clearly visible enough". So each one now has a filled well, a border
     that actually draws, and a glyph dark enough and thick enough to read at
     a glance. The labelled Onboarding pill next to them is the yardstick:
     these are quieter than it, but unmistakably the same family of control.

     The 32px box and the 8px gap are unchanged, deliberately — the Actions
     column has to keep fitting on a 1440 screen, so the weight comes from
     fill, border and stroke rather than from size.
     ------------------------------------------------------------------ */
  const iconAction = `flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-[#D9C9C9] bg-[#EFE4E4] text-[#6B5A5A] outline-none transition-all duration-500 ${EASE} hover:border-lyp-cherry/35 hover:bg-lyp-cherry/[0.08] hover:text-lyp-cherry focus-visible:ring-2 focus-visible:ring-lyp-cherry/40 active:scale-95`;

  /** Glyphs inside `iconAction` — one size and weight for the whole cluster. */
  const iconGlyph = "h-4 w-4";

  return (
    <>
      {/* The toolbar: find it, narrow it, and decide whether history shows. */}
      <div
        className="animate-rise mb-4 flex flex-wrap items-center gap-3"
        style={{ animationDelay: "40ms" }}
      >
        <AdminSearchField
          value={query}
          onChange={setQuery}
          label="Search proposals"
          placeholder="Search client, venue or version…"
          className="w-full min-w-[220px] flex-1 sm:w-auto sm:max-w-[320px]"
        />

        <div className="flex flex-wrap items-center gap-1.5">
          {FILTERS.map((entry) => (
            <button
              key={entry.value}
              type="button"
              onClick={() => setFilter(entry.value)}
              aria-pressed={filter === entry.value}
              className={cn(
                "rounded-full border px-3 py-1.5 font-body text-[11.5px] font-medium transition-all duration-500 active:scale-[0.985]",
                EASE,
                filter === entry.value
                  ? "border-lyp-cherry/25 bg-lyp-cherry/[0.07] text-lyp-cherry"
                  : "border-[#E2D5D5] bg-lyp-white text-[#6B5A5A] hover:border-lyp-cherry/20 hover:text-lyp-cherry",
              )}
            >
              {entry.label}
            </button>
          ))}
        </div>

        {/* Superseded proposals are hidden, not deleted. This is how you get
            them back, and it says how many are waiting behind it. */}
        {supersededCount > 0 && (
          <button
            type="button"
            onClick={() => setShowSuperseded((on) => !on)}
            aria-pressed={showSuperseded}
            className={cn(
              "ml-auto inline-flex items-center gap-2 rounded-full border px-3 py-1.5 font-body text-[11.5px] font-medium transition-all duration-500 active:scale-[0.985]",
              EASE,
              showSuperseded
                ? "border-lyp-cherry/25 bg-lyp-cherry/[0.07] text-lyp-cherry"
                : "border-[#E2D5D5] bg-lyp-white text-[#6B5A5A] hover:border-lyp-cherry/20 hover:text-lyp-cherry",
            )}
            title={
              showSuperseded
                ? "Hide the proposals that have been replaced"
                : "Show the proposals that have been replaced by a newer one"
            }
          >
            <EyeOff strokeWidth={1.5} className="h-3.5 w-3.5" />
            {showSuperseded ? "Hide" : "Show"} replaced ({supersededCount})
          </button>
        )}
      </div>

      <div
        className="animate-rise overflow-hidden rounded-2xl border border-[#E2D5D5] bg-lyp-white"
        style={{ animationDelay: "80ms" }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left font-body text-[12.5px]">
            <thead>
              <tr className="border-b border-[#E6DADA]">
                <Th hint="The client, with the venue this proposal is for underneath.">
                  Client
                </Th>
                <Th hint="Which issue of this proposal it is. v1 is the original; a re-issued proposal becomes v2, v3 and so on.">
                  Ver
                </Th>
                <Th hint="Every step the client has reached: signed, then payment details, then onboarding complete. Badges add up — they don't replace each other.">
                  Stage
                </Th>
                <Th
                  className="hidden lg:table-cell"
                  hint="When the client first opened their proposal, and how far through the deck they got. Blank means they have not opened it yet."
                >
                  Opened
                </Th>
                <Th
                  hint="What the client pays each month. Recurring services only — one-off fees and in-kind items are not in this figure."
                  className="hidden lg:table-cell"
                >
                  Monthly
                </Th>
                <Th hint="The whole of the contract: every monthly service multiplied by its term, plus any one-off fees. In-kind items are excluded.">
                  Contract total
                </Th>
                {/* The date is the first thing to go when space runs out. */}
                {/* The first thing to go when the window is tight: nobody
                    came to this page to read a creation date. */}
                <Th className="hidden 2xl:table-cell">Created</Th>
                <th scope="col" className={cn(thBase, stickyActions)}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.length > 0 ? (
                visible.map((proposal) => (
                  <tr
                    key={proposal.id}
                    className={cn(
                      "group border-b border-[#EFE6E6] transition-colors duration-500 last:border-0",
                      EASE,
                      "hover:bg-[#F7F1F1]",
                      // A revealed superseded row reads as an archive entry,
                      // never as live pipeline.
                      proposal.superseded && "opacity-60",
                    )}
                  >
                    {/* Client, with the venue it belongs to underneath —
                        one column instead of two. */}
                    <td className="px-3.5 py-3">
                      <div className="max-w-[160px]">
                        <Link
                          href={`/admin/clients/${proposal.clientId}`}
                          className={`block truncate font-medium text-lyp-black transition-colors duration-500 ${EASE} hover:text-lyp-cherry`}
                        >
                          {proposal.clientName ?? "—"}
                        </Link>
                        {proposal.venueName && (
                          <span className="mt-0.5 block truncate font-body text-[11px] text-[#867474]">
                            {proposal.venueName}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="whitespace-nowrap px-3.5 py-3">
                      <span
                        className="font-body text-[11.5px] font-medium tabular-nums text-[#6B5A5A]"
                        title={
                          proposal.version > 1
                            ? `Issue ${proposal.version} — this proposal replaced an earlier one`
                            : "The original proposal"
                        }
                      >
                        v{proposal.version}
                      </span>
                    </td>

                    <td className="px-3.5 py-3">
                      <ProposalStageBadges
                        status={proposal.status}
                        signedAt={proposal.signedAt}
                        paymentStatus={proposal.paymentStatus}
                      />
                    </td>

                    <td className="hidden whitespace-nowrap px-3.5 py-3 tabular-nums lg:table-cell">
                      <OpenedCell row={proposal} />
                    </td>

                    <td className="hidden whitespace-nowrap px-3.5 py-3 tabular-nums text-[#6B5A5A] lg:table-cell">
                      {proposal.monthlyCents ? (
                        <>
                          {formatCents(proposal.monthlyCents)}
                          <span className="ml-1 text-[10.5px] text-[#9C8C8C]">
                            /mo
                          </span>
                        </>
                      ) : (
                        "—"
                      )}
                    </td>

                    <td className="whitespace-nowrap px-3.5 py-3 font-medium tabular-nums text-lyp-black">
                      {proposal.contractCents != null
                        ? formatCents(proposal.contractCents)
                        : "—"}
                    </td>

                    <td className="hidden whitespace-nowrap px-3.5 py-3 tabular-nums text-[#867474] 2xl:table-cell">
                      {formatDate(proposal.createdAt)}
                    </td>

                    <td
                      className={cn(
                        "whitespace-nowrap px-3.5 py-3 transition-colors duration-500",
                        EASE,
                        stickyActions,
                        "group-hover:bg-[#F7F1F1]",
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <SendProposalButton
                          proposalId={proposal.id}
                          status={proposal.status ?? "draft"}
                          className={iconAction}
                        />

                        <PortalLinkButton
                          url={proposal.portalUrl}
                          className={iconAction}
                        />

                        {/* One pencil, one destination. It used to sit
                            beside a separate workspace icon and open the
                            wizard at client-and-venue selection instead —
                            "we don't need to go back to the client selection
                            screen" — so the wizard link is gone and the
                            pencil inherits the workspace. */}
                        <Link
                          href={`/admin/proposals/${proposal.id}`}
                          title="Edit this proposal — opens the proposal workspace"
                          aria-label="Edit this proposal in the proposal workspace"
                          className={iconAction}
                        >
                          <Pencil strokeWidth={1.75} className={iconGlyph} />
                        </Link>

                        {/* The one labelled button in the row — onboarding
                            answers are what the team comes here to open, so
                            it never reduces to a bare icon. */}
                        {proposal.intakeCount > 0 && (
                          <Link
                            href={`/admin/proposals/${proposal.id}/intake`}
                            className={`inline-flex items-center gap-1.5 rounded-full border border-lyp-cherry/30 bg-lyp-cherry/[0.08] px-3 py-1.5 font-body text-[12px] font-semibold text-lyp-cherry outline-none transition-all duration-500 ${EASE} hover:bg-lyp-cherry/[0.14] focus-visible:ring-2 focus-visible:ring-lyp-cherry/40 active:scale-[0.985]`}
                            title="View onboarding answers"
                          >
                            {/* Stays 14px, unlike the bare icons: the pill
                                has a word next to it, and every pixel here
                                is a pixel the Actions column costs. */}
                            <ClipboardList
                              strokeWidth={1.75}
                              className="h-3.5 w-3.5"
                            />
                            Onboarding
                          </Link>
                        )}
                        {proposal.status !== "superseded" && (
                          <Link
                            href={`/admin/proposals/${proposal.id}/edit?mode=supersede`}
                            className={iconAction}
                            title="Create a new version of this proposal"
                            aria-label="Create a new version of this proposal"
                          >
                            <FilePlus2 strokeWidth={1.75} className={iconGlyph} />
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : rows.length > 0 ? (
                // There are proposals — just none that answer the question
                // being asked. Say so, and offer the way back.
                <tr>
                  <td colSpan={8} className="px-8 py-12 text-center">
                    <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-lyp-cherry/[0.05] ring-1 ring-lyp-cherry/10">
                      <SearchX
                        strokeWidth={1}
                        className="h-6 w-6 text-lyp-cherry/60"
                      />
                    </span>
                    <p className="mt-5 font-body text-[14px] text-[#6B5A5A]">
                      No proposals match that.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setQuery("");
                        setFilter("all");
                      }}
                      className={`mt-3 font-body text-[13px] font-semibold text-lyp-cherry transition-opacity duration-500 ${EASE} hover:opacity-70`}
                    >
                      Clear search and filters
                    </button>
                  </td>
                </tr>
              ) : (
                <tr>
                  <td colSpan={8} className="px-8 py-12 text-center">
                    <p className="font-body text-[14px] text-[#6B5A5A]">
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
    </>
  );
}
