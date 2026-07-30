import { createClient } from "@/utils/server"
import ProposalCarousel from "@/components/portal/ProposalCarousel"
import { IntakeProvider } from "@/components/portal/IntakeContext"
import type {
  ProposalData,
  PageData,
  Service,
  ContentBlock,
} from "@/components/portal/ProposalContext"
import type { IntakeQuestion, Provider } from "@/server-actions/intake"

export const dynamic = "force-dynamic"

interface Props {
  params: Promise<{ token: string }>
}

export default async function PortalPage({ params }: Props) {
  const { token } = await params
  const supabase = await createClient()

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
    .single()

  if (proposalError || !proposal) {
    return (
      <div className="flex h-dvh flex-col items-center justify-center bg-lyp-black px-6 text-center">
        <h1 className="font-heading text-4xl text-lyp-cherry mb-4">
          Link Not Found
        </h1>
        <p className="font-body text-lyp-white/60 max-w-sm">
          This proposal link is invalid or has expired. Please contact your
          account manager for an updated link.
        </p>
      </div>
    )
  }

  if (proposal.status === "superseded") {
    return (
      <div className="flex h-dvh flex-col items-center justify-center bg-lyp-black px-6 text-center">
        <h1 className="font-heading text-4xl text-lyp-cherry mb-4">
          Proposal Replaced
        </h1>
        <p className="font-body text-lyp-white/60 max-w-sm">
          This proposal has been superseded by a newer version. Please check
          your email for the latest link or contact your account manager.
        </p>
      </div>
    )
  }

  // 2. Fetch pages ordered by sequence
  const { data: pagesRaw } = await supabase
    .from("pages")
    .select(
      `
      id,
      type,
      slug,
      title,
      sequence,
      service_id,
      content_blocks ( id, type, content, sequence )
    `,
    )
    .eq("visible", true)
    .order("sequence", { ascending: true })

  // 3. Fetch all services with related data
  const { data: servicesRaw } = await supabase
    .from("services")
    .select(
      `
      id,
      slug,
      name,
      billing,
      term,
      target_price_cents,
      discount_pct,
      discount_window_hours,
      price_display_period,
      requires_other_service,
      sequence,
      service_tiers ( id, slug, name, target_price_cents, sequence ),
      service_inclusions ( id, text, sequence ),
      service_client_obligations ( id, text, sequence ),
      service_disclaimers ( id, text, sequence )
    `,
    )
    .order("sequence", { ascending: true })

  // 4. Shape data for client components
  const clientObj = proposal.client as unknown as { id: string; name: string } | null
  const venueObj = proposal.venue as unknown as { id: string; name: string } | null

  const proposalData: ProposalData = {
    id: proposal.id,
    token: proposal.token,
    status: proposal.status,
    discountExpiresAt: proposal.discount_expires_at,
    clientName: clientObj?.name ?? "Client",
    venueName: venueObj?.name ?? "Venue",
  }

  const pages: PageData[] = (pagesRaw ?? []).map((p) => ({
    id: p.id,
    type: p.type as "service" | "content" | null,
    slug: p.slug,
    title: p.title,
    sequence: p.sequence,
    serviceId: p.service_id,
    contentBlocks: ((p.content_blocks as unknown as ContentBlock[]) ?? []).sort(
      (a, b) => (a.sequence ?? 0) - (b.sequence ?? 0),
    ),
  }))

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
    tiers: (
      (s.service_tiers as unknown as Array<{
        id: string
        slug: string
        name: string
        target_price_cents: number
        sequence: number
      }>) ?? []
    )
      .map((t) => ({
        id: t.id,
        slug: t.slug,
        name: t.name,
        targetPriceCents: t.target_price_cents,
        sequence: t.sequence,
      }))
      .sort((a, b) => a.sequence - b.sequence),
    inclusions: (
      (s.service_inclusions as unknown as Array<{
        id: string
        text: string
        sequence: number | null
      }>) ?? []
    ).sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0)),
    clientObligations: (
      (s.service_client_obligations as unknown as Array<{
        id: string
        text: string
        sequence: number | null
      }>) ?? []
    ).sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0)),
    disclaimers: (
      (s.service_disclaimers as unknown as Array<{
        id: string
        text: string
        sequence: number | null
      }>) ?? []
    ).sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0)),
  }))

  // 5. Fetch intake questions with conditions
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
    .order("sequence", { ascending: true })

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
        id: string
        condition_type: string
        condition_service_id: string | null
        condition_state_id: string | null
        condition_question_id: string | null
        condition_value: string | null
      }>) ?? []
    ).map((c) => ({
      id: c.id,
      conditionType: c.condition_type,
      conditionServiceId: c.condition_service_id,
      conditionStateId: c.condition_state_id,
      conditionQuestionId: c.condition_question_id,
      conditionValue: c.condition_value,
    })),
  }))

  // 6. Fetch all providers
  const { data: providersRaw } = await supabase
    .from("providers")
    .select(
      `
      id,
      name,
      type,
      description,
      portfolio_url,
      price_cents,
      image_url
    `,
    )
    .order("name")

  const intakeProviders: Provider[] = (providersRaw ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    type: p.type,
    description: p.description,
    portfolioUrl: p.portfolio_url,
    priceCents: p.price_cents ?? 0,
    imageUrl: p.image_url,
  }))

  // 7. Fetch existing intake responses for this proposal
  const { data: responsesRaw } = await supabase
    .from("intake_responses")
    .select("question_id, value")
    .eq("proposal_id", proposal.id)

  const intakeResponses: Record<string, unknown> = {}
  for (const r of responsesRaw ?? []) {
    intakeResponses[r.question_id] = r.value
  }

  return (
    <IntakeProvider
      questions={intakeQuestions}
      providers={intakeProviders}
      responses={intakeResponses}
    >
      <ProposalCarousel
        proposal={proposalData}
        pages={pages}
        services={services}
      />
    </IntakeProvider>
  )
}
