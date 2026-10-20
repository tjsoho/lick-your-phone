import { createClient } from "@/utils/server";
import ProposalCarousel from "@/components/portal/ProposalCarousel";
import type {
  ProposalData,
  PageData,
} from "@/components/portal/ProposalContext";
import { mapPages, mapServices } from "./mappers";
import {
  getAgreementSettings,
  getTermsClauses,
} from "@/server-actions/agreement-settings";
import { resolveCopy, type CopyOverrides } from "@/lib/portal-copy";
import { resolveTermsTarget } from "@/lib/terms";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ token: string }>;
}

function ErrorScreen({ title, message }: { title: string; message: string }) {
  return (
    <div className="flex h-dvh flex-col items-center justify-center bg-lyp-black px-6 text-center">
      <h1 className="font-heading text-4xl text-lyp-cherry mb-4">{title}</h1>
      <p className="font-body text-lyp-white/60 max-w-sm">{message}</p>
    </div>
  );
}

export default async function PortalPage({ params }: Props) {
  const { token } = await params;
  const supabase = await createClient();

  // 1. Validate token. Agreement settings load alongside it, because even the
  //    broken-link screens use the workspace's wording.
  const [
    { data: proposal, error: proposalError },
    agreementSettings,
    termsClauses,
  ] = await Promise.all([
    supabase
      .from("proposals")
      .select(
        `
      id, token, status, signed_at, discount_expires_at, discount_starts_at,
      discount_timer_active,
      signer_email,
      furthest_page, last_page,
      client:clients!client_id ( id, name, contact_name, email, logo_url ),
      venue:venues!venue_id ( id, name, logo_url ),
      payments(*),
      proposal_line_items(*)
    `,
      )
      .eq("token", token)
      .single(),
    getAgreementSettings(),
    getTermsClauses(),
  ]);

  const { portalCopy } = agreementSettings;

  if (proposalError || !proposal) {
    return (
      <ErrorScreen
        title={resolveCopy("global", "linkNotFoundTitle", portalCopy)}
        message={resolveCopy("global", "linkNotFoundBody", portalCopy)}
      />
    );
  }

  if (proposal.status === "superseded") {
    return (
      <ErrorScreen
        title={resolveCopy("global", "linkReplacedTitle", portalCopy)}
        message={resolveCopy("global", "linkReplacedBody", portalCopy)}
      />
    );
  }

  // 3. Fetch pages ordered by sequence.
  //    Visibility is resolved below, because this proposal may override it.
  const { data: pagesRaw } = await supabase
    .from("pages")
    .select(
      `id, type, slug, title, sequence, service_id, visible, featured_image, image_position, copy,
       content_blocks ( id, type, content, sequence )`,
    )
    .order("sequence", { ascending: true });

  // 3b. Per-proposal tailoring: which sections show, and any discount override.
  const { data: overridesRaw } = await supabase
    .from("proposal_page_settings")
    .select("page_id, visible, discount_pct, complimentary")
    .eq("proposal_id", proposal.id);

  const overrides = new Map(
    ((overridesRaw ?? []) as Array<{
      page_id: string;
      visible: boolean | null;
      discount_pct: number | null;
      complimentary: boolean | null;
    }>).map((o) => [o.page_id, o]),
  );

  const visiblePagesRaw = ((pagesRaw ?? []) as Array<{
    id: string;
    visible?: boolean | null;
  }>).filter((page) => {
    const override = overrides.get(page.id)?.visible;
    return override ?? page.visible ?? true;
  });

  // 4. Fetch all services with related data
  const { data: servicesRaw } = await supabase
    .from("services")
    .select(
      `id, slug, name, billing, term, target_price_cents,
       discount_pct, discount_window_hours, price_display_period,
       requires_other_service, sequence, billing_cycle_months,
       service_tiers ( id, slug, name, target_price_cents, sequence, billing_cycle_months ),
       service_inclusions ( id, text, sequence ),
       service_client_obligations ( id, text, sequence ),
       service_disclaimers ( id, text, sequence )`,
    )
    .order("sequence", { ascending: true });

  // 5. Shape data
  const clientObj = proposal.client as unknown as {
    id: string;
    name: string;
    contact_name: string | null;
    email: string | null;
    logo_url: string | null;
  } | null;
  const venueObj = proposal.venue as unknown as {
    id: string;
    name: string;
    logo_url: string | null;
  } | null;

  const proposalData: ProposalData = {
    id: proposal.id,
    token: proposal.token,
    status: proposal.status,
    discountExpiresAt: proposal.discount_expires_at,
    discountStartsAt: proposal.discount_starts_at ?? null,
    discountTimerActive: proposal.discount_timer_active ?? false,
    signedAt: proposal.signed_at ?? null,
    clientName: clientObj?.name ?? "Client",
    // The person. `contact_name` is legacy: records made before the client
    // record became the person still carry them there.
    contactName: clientObj?.contact_name ?? clientObj?.name ?? null,
    // What the onboarding form fills its email questions with — the signer's
    // address once they have signed, the client record's until then.
    clientEmail:
      (proposal as { signer_email?: string | null }).signer_email ??
      clientObj?.email ??
      null,
    // The cover shows one of these in place of the LickYourPhone mark — the
    // venue's own logo first, the client's behind it. Both passed raw; the
    // precedence and the fallback to the cover's copy slot live in
    // `resolveCoverLogo`.
    // The slide they had reached last time, so a client who closes the tab
    // half way through comes back where they left off instead of at the cover.
    // Recorded by `api/portal/viewed` in this same index space.
    lastPage: (proposal as { last_page?: number | null }).last_page ?? null,
    furthestPage:
      (proposal as { furthest_page?: number | null }).furthest_page ?? null,
    clientLogoUrl: clientObj?.logo_url ?? null,
    venueLogoUrl: venueObj?.logo_url ?? null,
    venueName: venueObj?.name ?? "Venue",
  };

  const pages: PageData[] = mapPages(visiblePagesRaw);

  // Wording for the structural pages, keyed by slug. Taken from every page,
  // hidden ones included: payment and onboarding wording is still needed
  // when those steps aren't slides in this deck.
  const pageCopy: Record<string, CopyOverrides> = {};
  for (const page of (pagesRaw ?? []) as Array<{
    slug: string | null;
    copy: CopyOverrides | null;
  }>) {
    if (page.slug) pageCopy[page.slug] = page.copy ?? {};
  }

  // A discount set on the proposal wins over the service's standing one.
  // A service given away on this proposal is a separate switch entirely: it
  // owes nothing to the discount and nothing to the countdown.
  const discountByService = new Map<string, number>();
  const complimentaryServiceIds: string[] = [];
  for (const page of (pagesRaw ?? []) as Array<{
    id: string;
    service_id: string | null;
  }>) {
    if (!page.service_id) continue;
    const override = overrides.get(page.id);
    if (override?.discount_pct != null) {
      discountByService.set(page.service_id, override.discount_pct);
    }
    if (override?.complimentary) {
      complimentaryServiceIds.push(page.service_id);
    }
  }

  // Prices are resolved in the provider: full price unless the timer is running.
  const services = mapServices(servicesRaw ?? []);

  // Payment captured = any payment with status beyond "pending" creation
  const payments =
    (proposal.payments as unknown as Array<{ status: string }>) ?? [];
  const paymentCaptured = payments.some((p) => p.status === "details_captured");

  const savedSelections = (
    proposal.proposal_line_items as unknown as Array<{
      service_id: string;
      service_tier_id: string | null;
    }>
  ).map((item) => ({
    serviceId: item.service_id,
    tierId: item.service_tier_id,
  }));

  return (
    <ProposalCarousel
      proposal={proposalData}
      agreement={{
        termsClauses,
        postSignatureText: agreementSettings.postSignatureText,
        // Only the kind travels: the slide words its button from it, and the
        // address it points at resolves the same rule again on the way out.
        termsKind: resolveTermsTarget({
          termsDocumentUrl: agreementSettings.termsDocumentUrl,
          termsDocumentName: agreementSettings.termsDocumentName,
          termsUrl: agreementSettings.termsUrl,
          clauseCount: termsClauses.length,
        }).kind,
        portalCopy,
      }}
      pageCopy={pageCopy}
      pages={pages}
      services={services}
      savedSelections={savedSelections}
      paymentCaptured={paymentCaptured}
      discountOverrides={Object.fromEntries(discountByService)}
      complimentaryServiceIds={complimentaryServiceIds}
    />
  );
}
