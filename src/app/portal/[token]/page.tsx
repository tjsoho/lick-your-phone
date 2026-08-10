import { createClient } from "@/utils/server";
import ProposalCarousel from "@/components/portal/ProposalCarousel";
import type {
  ProposalData,
  PageData,
  Service,
  Selection,
} from "@/components/portal/ProposalContext";
import { mapPages, mapServices } from "./mappers";

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

  // 1. Validate token
  const { data: proposal, error: proposalError } = await supabase
    .from("proposals")
    .select(
      `
      id, token, status, discount_expires_at,
      client:clients!client_id ( id, name ),
      venue:venues!venue_id ( id, name ),
      payments(*),
      proposal_line_items(*)
    `,
    )
    .eq("token", token)
    .single();

  if (proposalError || !proposal) {
    return (
      <ErrorScreen
        title="Link Not Found"
        message="This proposal link is invalid or has expired. Please contact your account manager for an updated link."
      />
    );
  }

  if (proposal.status === "superseded") {
    return (
      <ErrorScreen
        title="Proposal Replaced"
        message="This proposal has been superseded by a newer version. Please check your email for the latest link or contact your account manager."
      />
    );
  }

  // 3. Fetch pages ordered by sequence
  const { data: pagesRaw } = await supabase
    .from("pages")
    .select(
      `id, type, slug, title, sequence, service_id,
       content_blocks ( id, type, content, sequence )`,
    )
    .eq("visible", true)
    .order("sequence", { ascending: true });

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
  } | null;
  const venueObj = proposal.venue as unknown as {
    id: string;
    name: string;
  } | null;

  const proposalData: ProposalData = {
    id: proposal.id,
    token: proposal.token,
    status: proposal.status,
    discountExpiresAt: proposal.discount_expires_at,
    clientName: clientObj?.name ?? "Client",
    venueName: venueObj?.name ?? "Venue",
  };

  const pages: PageData[] = mapPages(pagesRaw ?? []);
  const services: Service[] = mapServices(servicesRaw ?? []);

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
      pages={pages}
      services={services}
      savedSelections={savedSelections}
      paymentCaptured={paymentCaptured}
    />
  );
}
