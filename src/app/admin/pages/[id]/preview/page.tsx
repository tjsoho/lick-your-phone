import { notFound } from "next/navigation";
import { createClient } from "@/utils/server";
import { mapPages, mapServices } from "@/app/portal/[token]/mappers";
import PagePreviewSurface from "@/components/admin/PagePreviewSurface";
import type { ProposalData } from "@/components/portal/ProposalContext";
import {
  getAgreementSettings,
  getTermsClauses,
} from "@/server-actions/agreement-settings";

export const dynamic = "force-dynamic";

/**
 * The client-facing slide on its own, for the editor's live preview frame.
 *
 * Service pages need the full service catalogue and a proposal in context to
 * render their pricing, so this loads the same data the portal does and
 * stands in a sample proposal for the client-specific parts.
 */
export default async function PagePreviewRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [
    { data: pageRaw },
    { data: servicesRaw },
    agreementSettings,
    termsClauses,
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
  ]);

  if (!pageRaw) return notFound();

  const [page] = mapPages([pageRaw]);
  const services = mapServices(servicesRaw ?? []);

  // Stand-in values for the parts a real proposal supplies.
  const proposal: ProposalData = {
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

  return (
    <PagePreviewSurface
      proposal={proposal}
      page={page}
      services={services}
      agreement={{
        termsClauses,
        postSignatureText: agreementSettings.postSignatureText,
        portalCopy: agreementSettings.portalCopy,
      }}
    />
  );
}
