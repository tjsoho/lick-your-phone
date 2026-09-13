/**
 * Pricing rules shared by the portal and the signing action, so what a client
 * is shown and what their contract records can't drift apart.
 *
 * Services store target_price_cents as the discounted price and discount_pct
 * as the standing discount, so the full price is derived from the two. A
 * client pays full price unless the proposal's discount timer is running.
 */

/** Signing a moment after the countdown ends still honours the price on screen. */
export const DISCOUNT_GRACE_MS = 2 * 60_000;

const validPct = (pct: number | null | undefined): pct is number =>
  pct != null && pct > 0 && pct < 1;

export function fullPriceCents(targetCents: number, standingPct: number | null) {
  return validPct(standingPct)
    ? Math.round(targetCents / (1 - standingPct))
    : targetCents;
}

export function discountedCents(fullCents: number, pct: number | null) {
  return validPct(pct) ? Math.round(fullCents * (1 - pct)) : fullCents;
}

/** What one service or tier actually costs, given whether the discount is on. */
export function payableCents({
  targetCents,
  standingPct,
  effectivePct,
  discountLive,
}: {
  targetCents: number;
  standingPct: number | null;
  /** The proposal's own discount where one is set, otherwise the standing one. */
  effectivePct: number | null;
  discountLive: boolean;
}) {
  const full = fullPriceCents(targetCents, standingPct);
  return discountLive ? discountedCents(full, effectivePct) : full;
}

/** The discount runs while the timer is switched on and its deadline hasn't passed at `at`. */
export function isDiscountLive({
  active,
  expiresAt,
  at,
}: {
  active: boolean;
  expiresAt: string | null;
  at: number;
}) {
  if (!active || !expiresAt) return false;
  const end = new Date(expiresAt).getTime();
  return !Number.isNaN(end) && at <= end;
}

type PricedService = {
  id: string;
  target_price_cents: number;
  discount_pct: number | null;
  service_tiers: { target_price_cents: number }[];
};

/**
 * Rewrites services into what the client should see: discounted prices with
 * their discount while the offer runs, full prices with no discount otherwise.
 * The slides keep reading discount_pct as "show a struck-through full price".
 */
export function priceServices<T extends PricedService>(
  services: T[],
  overrides: Record<string, number>,
  discountLive: boolean,
): T[] {
  return services.map((service) => {
    const standing = service.discount_pct;
    const effective = overrides[service.id] ?? standing;
    const apply = discountLive && validPct(effective);
    const price = (targetCents: number) =>
      payableCents({
        targetCents,
        standingPct: standing,
        effectivePct: effective,
        discountLive: apply,
      });

    return {
      ...service,
      target_price_cents: price(service.target_price_cents),
      discount_pct: apply ? effective : null,
      service_tiers: service.service_tiers.map((tier) => ({
        ...tier,
        target_price_cents: price(tier.target_price_cents),
      })),
    };
  });
}
