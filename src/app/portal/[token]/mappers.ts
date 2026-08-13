import type {
  PageData,
  ContentBlock,
} from "@/components/portal/ProposalContext";

const bySeq = <T extends { sequence: number | null }>(a: T, b: T) =>
  (a.sequence ?? 0) - (b.sequence ?? 0);

// ponytail: cast Supabase join results; replace when codegen types land
const cast = <T>(v: unknown): T[] => (v as T[]) ?? [];

/* eslint-disable @typescript-eslint/no-explicit-any */

export function mapPages(raw: any[]): PageData[] {
  return raw.map((p) => ({
    id: p.id,
    type: p.type as PageData["type"],
    slug: p.slug,
    title: p.title,
    featuredImage: p.featured_image,
    imagePosition: p.image_position as PageData["imagePosition"],
    sequence: p.sequence,
    serviceId: p.service_id,
    contentBlocks: cast<ContentBlock>(p.content_blocks).sort(bySeq),
  }));
}

export function mapServices(
  raw: any[],
): ServiceWithTiersWithInclusionsWithObligationsWithDisclaimers[] {
  return raw.map((s) => ({
    id: s.id,
    slug: s.slug,
    name: s.name,
    billing: s.billing as Service["billing"],
    term: s.term,
    target_price_cents: s.target_price_cents,
    discount_pct: s.discount_pct,
    discount_window_hours: s.discount_window_hours,
    price_display_period: s.price_display_period,
    requires_other_service: s.requires_other_service ?? false,
    sequence: s.sequence,
    service_tiers: cast<ServiceTier>(s.service_tiers)
      .map(
        (t): ServiceTier => ({
          id: t.id,
          slug: t.slug,
          name: t.name,
          target_price_cents: t.target_price_cents,
          sequence: t.sequence,
          billing_cycle_months: t.billing_cycle_months,
          service_id: s.id,
        }),
      )
      .sort(bySeq),
    inclusions: cast<ServiceInclusion>(s.service_inclusions).sort(bySeq),
    client_obligations: cast<ServiceObligation>(
      s.service_client_obligations,
    ).sort(bySeq),
    disclaimers: cast<ServiceDisclaimer>(s.service_disclaimers).sort(bySeq),
    billing_cycle_months: s.billing_cycle_months,
  }));
}
