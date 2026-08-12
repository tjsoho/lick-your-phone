declare interface ServiceTier {
  id: string;
  service_id: string;
  slug: string;
  name: string;
  target_price_cents: number;
  sequence: number;
  billing_cycle_months: number;
}

declare interface Service {
  id: string;
  slug: string;
  name: string;
  billing: "one_off" | "recurring_monthly" | "in_kind";
  term: string | null;
  target_price_cents: number;
  discount_pct: number | null;
  discount_window_hours: number | null;
  price_display_period: string | null;
  requires_other_service: boolean;
  sequence: number;
  billing_cycle_months: number;
}

declare interface ServiceInclusion {
  id: string;
  text: string;
  sequence: number | null;
}

declare interface ServiceObligation {
  id: string;
  text: string;
  sequence: number | null;
}

declare interface ServiceDisclaimer {
  id: string;
  text: string;
  sequence: number | null;
}

declare interface ServiceWithTiers extends Service {
  service_tiers: ServiceTier[];
}

declare interface ServiceWithTiersWithInclusionsWithObligationsWithDisclaimers extends Service {
  service_tiers: ServiceTier[];
  inclusions: ServiceInclusion[];
  client_obligations: ServiceObligation[];
  disclaimers: ServiceDisclaimer[];
}
