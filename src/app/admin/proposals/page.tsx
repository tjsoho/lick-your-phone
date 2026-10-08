import Link from "next/link";
import { createClient } from "@/utils/server";
import { getProposals } from "@/server-actions/proposals";
import { getAppUrl } from "@/lib/app-url";
import { AlertCircle, Plus } from "lucide-react";
import ProposalsTable, {
  type ProposalRow,
} from "@/components/admin/ProposalsTable";

const EASE = "ease-brand";

/* -------------------------------------------------------------------------
   WHAT THIS PAGE WORKS OUT BEFORE THE TABLE SEES IT.

   The table is a client component — search and filtering happen in the
   browser, instantly, on rows that arrived with the page — so everything that
   needs the database is settled here and handed over as plain data.

   TWO MONEY FIGURES, AND WHICH IS WHICH.

   `proposal_line_items.price_snapshot_cents` is already normalised to a month
   at signing time (`signature.ts` runs a weekly price through × 52 ÷ 12, the
   same arithmetic the portal's SummaryPage does), so:

     monthly       = Σ price_snapshot_cents  where billing = recurring_monthly
     contract      = Σ price_snapshot_cents × billing_cycle_snapshot_months
                     for recurring items, + price_snapshot_cents for one-offs

   In-kind items are worth nothing in either figure, exactly as the signing
   action and the contract PDF treat them.

   `proposals.total_snapshot_cents` turns out to already BE the contract
   figure, not a monthly one — signature.ts multiplies each recurring line by
   its term before summing. It is the number on the signed contract, so it
   wins where it exists and the line-item sum is only the fallback. (Checked
   against live data: the two agree to the cent on every signed proposal.)
   The monthly figure has no snapshot of its own, so it always comes from the
   line items, and reads "—" on a proposal nobody has signed yet.
   ------------------------------------------------------------------------- */

type LineItem = {
  proposal_id: string;
  price_snapshot_cents: number | null;
  billing: string | null;
  billing_cycle_snapshot_months: number | null;
};

export default async function ProposalsPage() {
  const supabase = await createClient();

  const [{ data: proposals, error }, appUrl] = await Promise.all([
    getProposals(),
    getAppUrl(),
  ]);

  // Pulled separately rather than widened into getProposals(), which the
  // proposal workspace shares.
  const { data: lineItems } = await supabase
    .from("proposal_line_items")
    .select(
      "proposal_id, price_snapshot_cents, billing, billing_cycle_snapshot_months",
    );

  const totals = new Map<string, { monthly: number; contract: number }>();
  for (const item of (lineItems ?? []) as LineItem[]) {
    const price = item.price_snapshot_cents ?? 0;
    const entry = totals.get(item.proposal_id) ?? { monthly: 0, contract: 0 };
    if (item.billing === "recurring_monthly") {
      entry.monthly += price;
      entry.contract += price * (item.billing_cycle_snapshot_months || 1);
    } else if (item.billing === "one_off") {
      entry.contract += price;
    }
    totals.set(item.proposal_id, entry);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw: any[] = proposals ?? [];

  /* A chain's newest member is the one no other row supersedes. `status =
     'superseded'` is the signal that already works on today's data; the
     supersedes_id lookup is what will catch a replaced proposal whose status
     nobody thought to change once the supersede flow starts writing it. */
  const replacedIds = new Set(
    raw.map((p) => p.supersedes_id).filter(Boolean) as string[],
  );

  const rows: ProposalRow[] = raw.map((proposal) => {
    const totalsFor = totals.get(proposal.id);
    return {
      id: proposal.id,
      clientId: proposal.clients?.id ?? null,
      clientName: proposal.clients?.name ?? null,
      venueName: proposal.venues?.name ?? null,
      status: proposal.status ?? null,
      signedAt: proposal.signed_at ?? null,
      paymentStatus: proposal.payments?.[0]?.status ?? null,
      intakeCount: proposal.intake_responses?.length ?? 0,
      createdAt: proposal.created_at,
      firstViewedAt: proposal.first_viewed_at ?? null,
      lastViewedAt: proposal.last_viewed_at ?? null,
      furthestPage: proposal.furthest_page ?? null,
      // Defaults to 1 so today's un-backfilled rows all read "v1".
      version: proposal.version ?? 1,
      superseded:
        proposal.status === "superseded" || replacedIds.has(proposal.id),
      portalUrl: proposal.token ? `${appUrl}/portal/${proposal.token}` : null,
      monthlyCents: totalsFor?.monthly || null,
      contractCents:
        proposal.total_snapshot_cents ?? (totalsFor?.contract || null),
    };
  });

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
          title="Start a new proposal for a client"
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

      <ProposalsTable rows={rows} />
    </div>
  );
}
