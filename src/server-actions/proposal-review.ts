"use server";

import { createClient } from "@/utils/server";
import { payableCents } from "@/lib/pricing";
import {
  monthlyFromWeekly,
  servicePeriod,
  weeklyFromMonthly,
  type PricePeriod,
} from "@/lib/selection-pricing";

/** One service the client will be offered, priced as the portal will show it. */
export type ReviewLine = {
  serviceId: string;
  name: string;
  billing: string | null;
  /**
   * The cadence this line is quoted in, which is the portal's own: by the
   * week for a subscription unless the agency quotes it monthly, neither for
   * a single payment, and nothing at all for one given away.
   */
  period: PricePeriod;
  /** The lowest price the client can take this at, in its own cadence. */
  fromCents: number;
  /** The same money as a week and as a month. Zero on a line that is neither. */
  weeklyCents: number;
  monthlyCents: number;
  /** True when tiers mean the client picks their own price from this one. */
  hasChoice: boolean;
  /** The discount reaching the client on this service, as a fraction. */
  discountPct: number | null;
};

export type ProposalReview = {
  /** Pages the client will actually page through. */
  shownPages: number;
  hiddenPages: number;
  lines: ReviewLine[];
  /** Totals if the client takes everything at its lowest price. */
  oneOffCents: number;
  /**
   * Every subscription added up as a week, and the same money as a month.
   *
   * Summed in each cadence from the per-line figure in that cadence rather
   * than converted from the other, so the monthly total adds up to exactly
   * what the monthly services say they cost. The old single `monthlyCents`
   * added a weekly price straight into a monthly total and called the result
   * monthly, which was wrong by a factor of four on three of the services.
   */
  weeklyCents: number;
  monthlyCents: number;
  /** Whether any of the above is discounted right now. */
  discountLive: boolean;
  /** Set when the discount is switched on but hasn't begun yet. */
  startsAt: string | null;
  expiresAt: string | null;
};

type PageRow = {
  id: string;
  visible: boolean | null;
  service_id: string | null;
};

type ServiceRow = {
  id: string;
  name: string;
  billing: string | null;
  price_display_period: string | null;
  target_price_cents: number;
  discount_pct: number | null;
  service_tiers: { target_price_cents: number }[];
};

/**
 * What the proposal amounts to, for the review stage before it goes out.
 *
 * Deliberately the deck's own view rather than the signed line items: before
 * signing nobody has chosen anything, so the honest number is what the client
 * would pay taking every service in their deck at its lowest price. Prices
 * follow the discount window exactly as the portal will.
 */
export async function getProposalReview(
  proposalId: string,
): Promise<{ data: ProposalReview | null; error: string | null }> {
  try {
    const supabase = await createClient();

    const { data: proposal, error: proposalError } = await supabase
      .from("proposals")
      .select(
        "discount_timer_active, discount_starts_at, discount_expires_at",
      )
      .eq("id", proposalId)
      .single();

    if (proposalError) throw proposalError;

    const [pagesRes, overridesRes, servicesRes] = await Promise.all([
      supabase
        .from("pages")
        .select("id, visible, service_id")
        .order("sequence", { ascending: true }),
      supabase
        .from("proposal_page_settings")
        .select("page_id, visible, discount_pct, complimentary")
        .eq("proposal_id", proposalId),
      supabase
        .from("services")
        .select(
          "id, name, billing, price_display_period, target_price_cents, discount_pct, service_tiers(target_price_cents)",
        ),
    ]);

    if (pagesRes.error) throw pagesRes.error;
    if (overridesRes.error) throw overridesRes.error;
    if (servicesRes.error) throw servicesRes.error;

    const overrides = new Map(
      (
        (overridesRes.data ?? []) as {
          page_id: string;
          visible: boolean | null;
          discount_pct: number | null;
          complimentary: boolean | null;
        }[]
      ).map((o) => [o.page_id, o]),
    );
    const services = new Map(
      ((servicesRes.data ?? []) as ServiceRow[]).map((s) => [s.id, s]),
    );

    const now = Date.now();
    const start = proposal.discount_starts_at
      ? new Date(proposal.discount_starts_at).getTime()
      : null;
    const end = proposal.discount_expires_at
      ? new Date(proposal.discount_expires_at).getTime()
      : null;
    const discountLive =
      (proposal.discount_timer_active ?? false) &&
      end != null &&
      !Number.isNaN(end) &&
      now <= end &&
      (start == null || Number.isNaN(start) || now >= start);

    let shownPages = 0;
    let hiddenPages = 0;
    const lines: ReviewLine[] = [];

    for (const page of (pagesRes.data ?? []) as PageRow[]) {
      const override = overrides.get(page.id);
      const visible = override?.visible ?? page.visible ?? true;
      if (!visible) {
        hiddenPages += 1;
        continue;
      }
      shownPages += 1;

      const service = page.service_id ? services.get(page.service_id) : null;
      if (!service) continue;

      const standing = service.discount_pct;
      const effective = override?.discount_pct ?? standing;
      const tiers = service.service_tiers ?? [];
      const targets =
        tiers.length > 0
          ? tiers.map((t) => t.target_price_cents)
          : [service.target_price_cents];

      const fromCents = Math.min(
        ...targets.map((targetCents) =>
          payableCents({
            targetCents,
            standingPct: standing,
            effectivePct: effective,
            discountLive,
          }),
        ),
      );

      // Given away on this proposal is not a discount and not a price: it
      // costs nothing, so it is quoted as nothing and counted in no total.
      const period: PricePeriod = override?.complimentary
        ? "in_kind"
        : servicePeriod(service);
      const quoted = period === "in_kind" ? 0 : fromCents;
      const recurring = period === "week" || period === "month";

      lines.push({
        serviceId: service.id,
        name: service.name,
        billing: service.billing,
        period,
        fromCents: quoted,
        weeklyCents: !recurring
          ? 0
          : period === "week"
            ? quoted
            : weeklyFromMonthly(quoted),
        monthlyCents: !recurring
          ? 0
          : period === "week"
            ? monthlyFromWeekly(quoted)
            : quoted,
        hasChoice: tiers.length > 1,
        discountPct:
          period === "in_kind" ? null : discountLive ? effective : null,
      });
    }

    const sumOf = (key: "weeklyCents" | "monthlyCents") =>
      lines.reduce((total, line) => total + line[key], 0);

    return {
      data: {
        shownPages,
        hiddenPages,
        lines,
        oneOffCents: lines
          .filter((line) => line.period === "one_off")
          .reduce((total, line) => total + line.fromCents, 0),
        weeklyCents: sumOf("weeklyCents"),
        monthlyCents: sumOf("monthlyCents"),
        discountLive,
        startsAt: proposal.discount_starts_at,
        expiresAt: proposal.discount_expires_at,
      },
      error: null,
    };
  } catch (error) {
    return { data: null, error: (error as Error).message };
  }
}
