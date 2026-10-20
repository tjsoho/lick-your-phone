/**
 * WHAT A SELECTED SERVICE COSTS, AND IN WHICH CADENCE — IN ONE PLACE.
 *
 * Four screens show the same basket: the price bar, the basket panel behind
 * it, the summary slide and the card beside the signature pad. They used to
 * work the sums out separately, in four near-identical copies, and the copies
 * agreed only by luck. They now all call `buildSelectionLines` and
 * `totalSelection`, so a figure cannot differ from one screen to the next.
 *
 * THE CADENCE RULE, settled with the agency in October 2026:
 *
 *   - A subscription is quoted BY THE WEEK. That is how the sales team sells
 *     it and how the client thinks about it.
 *   - Two subscriptions are quoted by the month instead — the videography
 *     subscription and community management. That is not hard coded here: a
 *     service's own `price_display_period` decides, and those two are the
 *     ones left on the monthly setting.
 *   - A single payment is NEITHER. It is a one-off, and saying "per month"
 *     against it is how a $2,495 photography shoot came to look like a
 *     $2,495-a-month commitment.
 *
 * Billing itself has not changed and is still monthly throughout, which is
 * why every line carries BOTH cadences. The weekly figure is what the client
 * is quoted; the monthly one is what leaves their account, and the totals
 * show it underneath so there is no surprise at the first invoice.
 *
 * Each cadence is summed from the per-line figure in that cadence rather than
 * converted from the other total, so the monthly line adds up to exactly what
 * the monthly services say they cost, to the cent.
 */

const WEEKS_PER_YEAR = 52;
const MONTHS_PER_YEAR = 12;

/** How a service's price is quoted to the client. */
export type PricePeriod = "week" | "month" | "one_off" | "in_kind";

export function weeklyFromMonthly(cents: number): number {
  return Math.round((cents * MONTHS_PER_YEAR) / WEEKS_PER_YEAR);
}

export function monthlyFromWeekly(cents: number): number {
  return Math.round((cents * WEEKS_PER_YEAR) / MONTHS_PER_YEAR);
}

export function servicePeriod(service: {
  billing: string | null;
  price_display_period?: string | null;
}): PricePeriod {
  if (service.billing === "in_kind") return "in_kind";
  if (service.billing === "one_off") return "one_off";
  return service.price_display_period === "week" ? "week" : "month";
}

/** The pre-discount price, derived from the discounted one it is shown beside. */
export function listFromTarget(
  targetCents: number,
  discountPct: number | null,
): number {
  if (discountPct == null || discountPct === 0) return targetCents;
  return Math.round(targetCents / (1 - discountPct));
}

type AnyService = ServiceWithTiersWithInclusionsWithObligationsWithDisclaimers;

export interface SelectionLine {
  id: string;
  name: string;
  tierId: string | null;
  tierName: string | null;
  tiers: ServiceTier[];
  billing: AnyService["billing"];
  /** The cadence this line is quoted in. */
  period: PricePeriod;
  /** The figure the client is quoted, in that cadence. */
  nativeCents: number;
  /** The same figure before the discount, in that cadence. */
  nativeListCents: number;
  /** The same money as a week — zero for a one-off, which is neither. */
  weeklyCents: number;
  weeklyListCents: number;
  /** The same money as a month, which is how it is actually billed. */
  monthlyCents: number;
  monthlyListCents: number;
  /** How many months the plan runs. 1 for anything that is not recurring. */
  billingCycleMonths: number;
  hasDiscount: boolean;
  discountPct: number | null;
  /** The service itself, for the screens that also show its inclusions. */
  service: AnyService;
}

/**
 * One line per selection, in the order they were selected. A selection whose
 * service is not part of this proposal drops out rather than throwing.
 */
export function buildSelectionLines(
  selections: { serviceId: string; tierId: string | null }[],
  serviceMap: Record<string, AnyService>,
): SelectionLine[] {
  return selections.flatMap((sel) => {
    const svc = serviceMap[sel.serviceId];
    if (!svc) return [];

    const tiers = [...(svc.service_tiers ?? [])].sort(
      (a, b) => a.sequence - b.sequence,
    );
    const tier = sel.tierId ? tiers.find((t) => t.id === sel.tierId) : undefined;

    const nativeCents = tier ? tier.target_price_cents : svc.target_price_cents;
    const nativeListCents = listFromTarget(nativeCents, svc.discount_pct);
    const period = servicePeriod(svc);
    const recurring = period === "week" || period === "month";

    const weeklyCents = !recurring
      ? 0
      : period === "week"
        ? nativeCents
        : weeklyFromMonthly(nativeCents);
    const weeklyListCents = !recurring
      ? 0
      : period === "week"
        ? nativeListCents
        : weeklyFromMonthly(nativeListCents);
    const monthlyCents = !recurring
      ? 0
      : period === "week"
        ? monthlyFromWeekly(nativeCents)
        : nativeCents;
    const monthlyListCents = !recurring
      ? 0
      : period === "week"
        ? monthlyFromWeekly(nativeListCents)
        : nativeListCents;

    return [
      {
        id: svc.id,
        name: svc.name,
        tierId: sel.tierId ?? null,
        tierName: tier?.name ?? null,
        tiers,
        billing: svc.billing,
        period,
        nativeCents,
        nativeListCents,
        weeklyCents,
        weeklyListCents,
        monthlyCents,
        monthlyListCents,
        billingCycleMonths:
          svc.billing === "recurring_monthly"
            ? (tier?.billing_cycle_months ?? svc.billing_cycle_months ?? 1)
            : 1,
        hasDiscount: svc.discount_pct != null && svc.discount_pct > 0,
        discountPct: svc.discount_pct,
        service: svc,
      },
    ];
  });
}

export interface SelectionTotals {
  /** Every subscription added up as a week. The headline figure. */
  weeklyCents: number;
  weeklyFullCents: number;
  weeklySavingsCents: number;
  /** The same subscriptions as a month, which is how they are billed. */
  monthlyCents: number;
  monthlyFullCents: number;
  monthlySavingsCents: number;
  /** Single payments, never folded into a recurring figure. */
  oneOffCents: number;
  oneOffFullCents: number;
  oneOffCount: number;
  recurringCount: number;
}

export function totalSelection(lines: SelectionLine[]): SelectionTotals {
  const totals: SelectionTotals = {
    weeklyCents: 0,
    weeklyFullCents: 0,
    weeklySavingsCents: 0,
    monthlyCents: 0,
    monthlyFullCents: 0,
    monthlySavingsCents: 0,
    oneOffCents: 0,
    oneOffFullCents: 0,
    oneOffCount: 0,
    recurringCount: 0,
  };

  for (const line of lines) {
    if (line.period === "one_off") {
      totals.oneOffCents += line.nativeCents;
      totals.oneOffFullCents += line.nativeListCents;
      totals.oneOffCount += 1;
    } else if (line.period === "week" || line.period === "month") {
      totals.weeklyCents += line.weeklyCents;
      totals.weeklyFullCents += line.weeklyListCents;
      totals.monthlyCents += line.monthlyCents;
      totals.monthlyFullCents += line.monthlyListCents;
      totals.recurringCount += 1;
    }
    // in_kind costs nothing and belongs in neither total.
  }

  totals.weeklySavingsCents = totals.weeklyFullCents - totals.weeklyCents;
  totals.monthlySavingsCents = totals.monthlyFullCents - totals.monthlyCents;
  return totals;
}
