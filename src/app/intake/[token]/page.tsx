import { createClient } from "@/utils/server";
import IntakePage from "@/components/portal/pages/IntakePage";
import { ProposalProvider } from "@/components/portal/ProposalContext";
import type { ProposalData } from "@/components/portal/ProposalContext";
import { getIntakeQuestions } from "@/server-actions/intake";
import { getServices } from "@/server-actions/services";
import { getProposalLineItems } from "@/server-actions/proposals";
import PortalBackground from "@/components/portal/PortalBackground";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ token: string }>;
}

export default async function IntakeRoutePage({ params }: Props) {
  const { token } = await params;
  const supabase = await createClient();

  // 1. Validate token
  const { data: proposal, error: proposalError } = await supabase
    .from("proposals")
    .select(
      `
      id,
      token,
      status,
      discount_expires_at,
      client:clients!client_id ( id, name ),
      venue:venues!venue_id ( id, name, state_id )
    `,
    )
    .eq("token", token)
    .single();

  // Guard: only accessible if payment details captured
  const { data: payments } = await supabase
    .from("payments")
    .select("status")
    .eq("proposal_id", proposal?.id ?? "");

  const paymentCaptured = (payments ?? []).some(
    (p) => p.status === "details_captured",
  );

  if (proposalError || !proposal || !paymentCaptured) {
    console.error(
      "Error loading proposal:",
      proposalError,
      proposal,
      paymentCaptured,
    );
    return (
      <div className="flex h-dvh flex-col items-center justify-center bg-lyp-black px-6 text-center">
        <h1 className="font-heading text-4xl text-lyp-cherry mb-4">
          Link Not Found
        </h1>
        <p className="font-body text-lyp-white/60 max-w-sm">
          This intake link is invalid or has expired. Please contact your
          account manager for an updated link.
        </p>
      </div>
    );
  }

  const clientObj = proposal.client as unknown as {
    id: string;
    name: string;
  } | null;
  const venueObj = proposal.venue as unknown as {
    id: string;
    name: string;
    state_id: string;
  } | null;

  const proposalData: ProposalData = {
    id: proposal.id,
    token: proposal.token,
    status: proposal.status,
    discountExpiresAt: proposal.discount_expires_at,
    clientName: clientObj?.name ?? "Client",
    venueName: venueObj?.name ?? "Venue",
  };

  const { data: signedSelections } = await getProposalLineItems(proposal.id);

  const selections = (signedSelections ?? []).map((s) => ({
    serviceId: s.service_id,
    tierId: s.service_tier_id,
  }));

  // 3. Fetch services (needed for condition evaluation)
  const { data: services, error: servicesError } =
    await getServices<ServiceWithTiersWithInclusionsWithObligationsWithDisclaimers>(
      `id, slug, name, billing, term, target_price_cents,
       discount_pct, discount_window_hours, price_display_period,
       requires_other_service, sequence, billing_cycle_months,
       service_tiers ( id, slug, name, target_price_cents, sequence, billing_cycle_months ),
       service_inclusions ( id, text, sequence ),
       service_client_obligations ( id, text, sequence ),
       service_disclaimers ( id, text, sequence )`,
    );

  if (servicesError || !services || services.length === 0) {
    console.error("Error loading services:", servicesError);
    return (
      <div className="flex h-dvh flex-col items-center justify-center bg-lyp-black px-6 text-center">
        <h1 className="font-heading text-4xl text-lyp-cherry mb-4">
          Error Loading Services
        </h1>
        <p className="font-body text-lyp-white/60 max-w-sm">
          There was an error loading the services for this proposal. Please
          contact your account manager for assistance.
        </p>
      </div>
    );
  }

  // 4. Fetch intake questions with conditions
  const { data: intakeQuestions } = await getIntakeQuestions();
  // 5. Fetch providers
  let providersQuery = supabase
    .from("providers")
    .select(
      "id, name, type, description, portfolio_url, price_cents, image_url, provider_states!inner(state_id, code, name)",
    )
    .order("name");

  if (venueObj?.state_id) {
    providersQuery = providersQuery.eq(
      "provider_states.state_id",
      venueObj.state_id,
    );
  }

  const { data: providersRaw } = await providersQuery;

  const intakeProviders: Provider[] = (providersRaw ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    type: p.type,
    description: p.description,
    portfolio_url: p.portfolio_url,
    price_cents: p.price_cents ?? 0,
    image_url: p.image_url,
    provider_states: p.provider_states.map((ps) => ({
      states: {
        id: ps.state_id,
        code: ps.code,
        name: ps.name,
      },
    })),
  }));

  // 6. Fetch existing intake responses
  const { data: responsesRaw } = await supabase
    .from("intake_responses")
    .select("question_id, value")
    .eq("proposal_id", proposal.id);

  const intakeResponses: Record<string, unknown> = {};
  for (const r of responsesRaw ?? []) {
    intakeResponses[r.question_id] = r.value;
  }

  // ponytail: ProposalProvider used here to give IntakePage access to selections for condition eval.
  // If intake grows, extract a lighter context.
  return (
    <div className="relative h-dvh bg-[#050203]">
      <PortalBackground />
      <div className="relative z-10 h-full">
      <ProposalProvider
        proposal={proposalData}
        pages={[]}
        services={services}
        initialSelections={selections}
      >
        <IntakePage
          questions={intakeQuestions}
          providers={intakeProviders}
          existingResponses={intakeResponses}
        />
      </ProposalProvider>
      </div>
    </div>
  );
}
