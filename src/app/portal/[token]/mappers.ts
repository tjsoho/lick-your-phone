import type {
  PageData,
  Service,
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
    sequence: p.sequence,
    serviceId: p.service_id,
    contentBlocks: cast<ContentBlock>(p.content_blocks).sort(bySeq),
  }));
}

export function mapServices(raw: any[]): Service[] {
  return raw.map((s) => ({
    id: s.id,
    slug: s.slug,
    name: s.name,
    billing: s.billing as Service["billing"],
    term: s.term,
    targetPriceCents: s.target_price_cents,
    discountPct: s.discount_pct,
    discountWindowHours: s.discount_window_hours,
    priceDisplayPeriod: s.price_display_period,
    requiresOtherService: s.requires_other_service ?? false,
    sequence: s.sequence,
    tiers: cast<{
      id: string;
      slug: string;
      name: string;
      target_price_cents: number;
      sequence: number;
      billing_cycle_months: number;
    }>(s.service_tiers)
      .map((t) => ({
        id: t.id,
        slug: t.slug,
        name: t.name,
        targetPriceCents: t.target_price_cents,
        sequence: t.sequence,
        billingCycleMonths: t.billing_cycle_months,
      }))
      .sort(bySeq),
    inclusions: cast<{ id: string; text: string; sequence: number | null }>(
      s.service_inclusions,
    ).sort(bySeq),
    clientObligations: cast<{
      id: string;
      text: string;
      sequence: number | null;
    }>(s.service_client_obligations).sort(bySeq),
    disclaimers: cast<{ id: string; text: string; sequence: number | null }>(
      s.service_disclaimers,
    ).sort(bySeq),
    billingCycleMonths: s.billing_cycle_months,
  }));
}
