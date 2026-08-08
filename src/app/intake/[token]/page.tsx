import { createClient } from "@/utils/server";
import IntakePage from "@/components/portal/pages/IntakePage";
import { ProposalProvider } from "@/components/portal/ProposalContext";
import type {
  ProposalData,
  PageData,
  Service,
} from "@/components/portal/ProposalContext";
import type { IntakeQuestion, Provider } from "@/server-actions/intake";

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
      venue:venues!venue_id ( id, name )
    `,
    )
    .eq("token", token)
    .single();

  if (proposalError || !proposal) {
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
  } | null;

  const proposalData: ProposalData = {
    id: proposal.id,
    token: proposal.token,
    status: proposal.status,
    discountExpiresAt: proposal.discount_expires_at,
    clientName: clientObj?.name ?? "Client",
    venueName: venueObj?.name ?? "Venue",
  };

  // 2. Fetch signed selections to know which services the client picked
  const { data: signedSelections } = await supabase
    .from("proposal_selections")
    .select("service_id, tier_id")
    .eq("proposal_id", proposal.id);

  const selections = (signedSelections ?? []).map((s) => ({
    serviceId: s.service_id,
    tierId: s.tier_id,
  }));

  // 3. Fetch services (needed for condition evaluation)
  const { data: servicesRaw } = await supabase
    .from("services")
    .select(
      "id, slug, name, billing, billing_cycle_months, term, target_price_cents, discount_pct, discount_window_hours, price_display_period, requires_other_service, sequence",
    )
    .order("sequence", { ascending: true });

  const services: Service[] = (servicesRaw ?? []).map((s) => ({
    id: s.id,
    slug: s.slug,
    name: s.name,
    billing: s.billing as "one_off" | "recurring_monthly" | "in_kind",
    term: s.term,
    targetPriceCents: s.target_price_cents,
    discountPct: s.discount_pct,
    discountWindowHours: s.discount_window_hours,
    priceDisplayPeriod: s.price_display_period,
    requiresOtherService: s.requires_other_service ?? false,
    sequence: s.sequence,
    tiers: [],
    inclusions: [],
    clientObligations: [],
    disclaimers: [],
    billingCycleMonths: s.billing_cycle_months ?? 1,
  }));

  // 4. Fetch intake questions with conditions
  const { data: intakeRaw } = await supabase
    .from("intake_questions")
    .select(
      `
      id,
      page_number,
      section,
      field_label,
      field_type,
      options,
      required,
      sequence,
      config,
      intake_conditions!intake_conditions_question_id_intake_questions_id_fk (
        id,
        condition_type,
        condition_service_id,
        condition_state_id,
        condition_question_id,
        condition_value
      )
    `,
    )
    .order("page_number", { ascending: true })
    .order("sequence", { ascending: true });

  const intakeQuestions: IntakeQuestion[] = (intakeRaw ?? []).map((q) => ({
    id: q.id,
    pageNumber: q.page_number,
    section: q.section,
    fieldLabel: q.field_label,
    fieldType: q.field_type ?? "text",
    options: q.options,
    required: q.required ?? false,
    sequence: q.sequence,
    config: q.config,
    conditions: (
      (q.intake_conditions as unknown as Array<{
        id: string;
        condition_type: string;
        condition_service_id: string | null;
        condition_state_id: string | null;
        condition_question_id: string | null;
        condition_value: string | null;
      }>) ?? []
    ).map((c) => ({
      id: c.id,
      conditionType: c.condition_type,
      conditionServiceId: c.condition_service_id,
      conditionStateId: c.condition_state_id,
      conditionQuestionId: c.condition_question_id,
      conditionValue: c.condition_value,
    })),
  }));

  // 5. Fetch providers
  const { data: providersRaw } = await supabase
    .from("providers")
    .select(
      "id, name, type, description, portfolio_url, price_cents, image_url",
    )
    .order("name");

  const intakeProviders: Provider[] = (providersRaw ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    type: p.type,
    description: p.description,
    portfolioUrl: p.portfolio_url,
    priceCents: p.price_cents ?? 0,
    imageUrl: p.image_url,
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
    <div className="h-dvh portal-bg">
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
  );
}
