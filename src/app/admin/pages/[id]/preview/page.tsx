import { notFound } from "next/navigation";
import { createClient } from "@/utils/server";
import { mapPages, mapServices } from "@/app/portal/[token]/mappers";
import PagePreviewSurface from "@/components/admin/PagePreviewSurface";
import type { ProposalData } from "@/components/portal/ProposalContext";
import {
  getAgreementSettings,
  getTermsClauses,
} from "@/server-actions/agreement-settings";
import { resolveTermsTarget } from "@/lib/terms";

export const dynamic = "force-dynamic";

/** Stand-in values for the parts a real proposal supplies. */
const SAMPLE_PROPOSAL: ProposalData = {
  id: "preview",
  token: "preview",
  status: "draft",
  discountExpiresAt: null,
  discountTimerActive: false,
  signedAt: null,
  clientName: "Sample Venue",
  contactName: "Sample Contact",
  venueName: "Sample Venue",
};

type OverrideRow = {
  page_id: string;
  visible: boolean | null;
  discount_pct: number | null;
};

/**
 * One proposal's real context for the preview, so the deck overview's
 * thumbnails read like the client's own slides.
 *
 * Returns nulls if anything is missing, which drops the preview back to the
 * sample stand-ins rather than failing.
 */
async function loadProposalContext(
  supabase: Awaited<ReturnType<typeof createClient>>,
  proposalId: string,
) {
  const [{ data: row }, { data: overridesRaw }, { data: pageRows }] =
    await Promise.all([
      supabase
        .from("proposals")
        .select(
          `id, token, status, signed_at, discount_expires_at, discount_timer_active,
           client:clients!client_id ( name, contact_name ),
           venue:venues!venue_id ( name )`,
        )
        .eq("id", proposalId)
        .maybeSingle(),
      supabase
        .from("proposal_page_settings")
        .select("page_id, visible, discount_pct")
        .eq("proposal_id", proposalId),
      supabase.from("pages").select("id, service_id"),
    ]);

  if (!row) return null;

  const client = row.client as unknown as {
    name: string;
    contact_name: string | null;
  } | null;
  const venue = row.venue as unknown as { name: string } | null;

  // A discount set on the proposal's page wins over the service's standing one.
  const serviceByPage = new Map(
    ((pageRows ?? []) as Array<{ id: string; service_id: string | null }>).map(
      (p) => [p.id, p.service_id],
    ),
  );
  const discountOverrides: Record<string, number> = {};
  for (const override of (overridesRaw ?? []) as OverrideRow[]) {
    const serviceId = serviceByPage.get(override.page_id);
    if (serviceId && override.discount_pct != null) {
      discountOverrides[serviceId] = override.discount_pct;
    }
  }

  const proposal: ProposalData = {
    id: row.id,
    token: row.token,
    status: row.status,
    discountExpiresAt: row.discount_expires_at,
    discountTimerActive: row.discount_timer_active ?? false,
    signedAt: row.signed_at ?? null,
    clientName: client?.name ?? "Client",
    // The person. `contact_name` is legacy: older records carry them there.
    contactName: client?.contact_name ?? client?.name ?? null,
    venueName: venue?.name ?? "Venue",
  };

  return { proposal, discountOverrides };
}

/**
 * The client-facing slide on its own, for the editor's live preview frame and
 * the proposal deck overview's thumbnails.
 *
 * Service pages need the full service catalogue and a proposal in context to
 * render their pricing, so this loads the same data the portal does. Without
 * `?proposalId=` it stands in a sample proposal for the client-specific
 * parts; with one, it renders that proposal's own names and discounts.
 */
export default async function PagePreviewRoute({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ proposalId?: string }>;
}) {
  const { id } = await params;
  const { proposalId } = await searchParams;
  const supabase = await createClient();

  const [
    { data: pageRaw },
    { data: servicesRaw },
    agreementSettings,
    termsClauses,
    proposalContext,
  ] = await Promise.all([
    supabase
      .from("pages")
      .select(
        `id, type, slug, title, sequence, service_id, featured_image, image_position, copy,
         content_blocks ( id, type, content, sequence )`,
      )
      .eq("id", id)
      .single(),
    supabase
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
      .order("sequence", { ascending: true }),
    getAgreementSettings(),
    getTermsClauses(),
    proposalId ? loadProposalContext(supabase, proposalId) : null,
  ]);

  if (!pageRaw) return notFound();

  const [page] = mapPages([pageRaw]);
  const services = mapServices(servicesRaw ?? []);

  return (
    <PagePreviewSurface
      proposal={proposalContext?.proposal ?? SAMPLE_PROPOSAL}
      page={page}
      services={services}
      discountOverrides={proposalContext?.discountOverrides}
      agreement={{
        termsClauses,
        postSignatureText: agreementSettings.postSignatureText,
        // So the preview shows the same full-terms wording the client will get.
        termsKind: resolveTermsTarget({
          termsDocumentUrl: agreementSettings.termsDocumentUrl,
          termsDocumentName: agreementSettings.termsDocumentName,
          termsUrl: agreementSettings.termsUrl,
          clauseCount: termsClauses.length,
        }).kind,
        portalCopy: agreementSettings.portalCopy,
      }}
    />
  );
}
