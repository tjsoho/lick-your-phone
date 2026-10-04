"use server";

import { createClient } from "@/utils/server";
import { payableCents } from "@/lib/pricing";

/** One service the client will be offered, priced as the portal will show it. */
export type ReviewLine = {
  serviceId: string;
  name: string;
  billing: string | null;
  /** The lowest price the client can take this at, in cents. */
  fromCents: number;
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
        .select("page_id, visible, discount_pct")
        .eq("proposal_id", proposalId),
      supabase
        .from("services")
        .select(
          "id, name, billing, target_price_cents, discount_pct, service_tiers(target_price_cents)",
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

      lines.push({
        serviceId: service.id,
        name: service.name,
        billing: service.billing,
        fromCents,
        hasChoice: tiers.length > 1,
        discountPct: discountLive ? effective : null,
      });
    }

    const sum = (billing: string) =>
      lines
        .filter((l) => l.billing === billing)
        .reduce((total, l) => total + l.fromCents, 0);

    return {
      data: {
        shownPages,
        hiddenPages,
        lines,
        oneOffCents: sum("one_off"),
        monthlyCents: sum("recurring_monthly"),
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
