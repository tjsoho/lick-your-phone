"use client"

import { useProposal, type PageData } from "../ProposalContext"
import { useIntake } from "../IntakeContext"
import PaymentPage from "./PaymentPage"
import SignaturePage from "./SignaturePage"
import IntakePage from "./IntakePage"

function IntakeFormWrapper() {
  const { intakeQuestions, intakeProviders, intakeResponses } = useIntake()
  return (
    <IntakePage
      questions={intakeQuestions}
      providers={intakeProviders}
      existingResponses={intakeResponses}
    />
  )
}

interface ContentPageProps {
  page: PageData
}

export default function ContentPage({ page }: ContentPageProps) {
  const { proposal } = useProposal()
  const slug = page.slug

  if (slug === "cover") {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6 text-center">
        <div className="mb-10">
          <h1 className="font-heading text-6xl md:text-8xl text-lyp-white tracking-tight uppercase">
            Lick<span className="text-lyp-cherry">Your</span>Phone
          </h1>
          <div className="mt-3 h-1 w-32 mx-auto bg-lyp-cherry rounded-full" />
        </div>
        <p className="font-body text-sm text-lyp-white/60 mb-3 tracking-[0.3em] uppercase">
          Proposal prepared for
        </p>
        <h2 className="font-heading text-4xl md:text-5xl text-lyp-white mb-2">
          {proposal.clientName}
        </h2>
        <p className="font-body text-xl text-lyp-white/50">
          {proposal.venueName}
        </p>
      </div>
    )
  }

  if (slug === "signature") return <SignaturePage />
  if (slug === "payment") return <PaymentPage />
  if (slug === "intake") return <IntakeFormWrapper />
  if (slug === "summary") return null

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="flex-1 px-8 py-12 md:px-16 lg:px-24">
        {page.title && (
          <h1 className="font-heading text-4xl md:text-6xl text-lyp-white mb-10 uppercase tracking-tight">
            {page.title}
          </h1>
        )}
        {page.contentBlocks.length > 0 ? (
          <div className="space-y-5 max-w-4xl">
            {page.contentBlocks
              .sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0))
              .map((block) => {
                if (block.type === "heading") {
                  return (
                    <h2
                      key={block.id}
                      className="font-heading text-2xl md:text-3xl text-lyp-white uppercase tracking-wide"
                    >
                      {String(block.content ?? "")}
                    </h2>
                  )
                }
                if (block.type === "paragraph") {
                  return (
                    <p
                      key={block.id}
                      className="font-body text-base text-lyp-white/85 leading-relaxed"
                    >
                      {String(block.content ?? "")}
                    </p>
                  )
                }
                if (block.type === "list" && Array.isArray(block.content)) {
                  return (
                    <ul key={block.id} className="space-y-2 pl-1">
                      {(block.content as string[]).map((item, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-3 font-body text-base text-lyp-white/85"
                        >
                          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-lyp-cherry" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  )
                }
                return (
                  <div
                    key={block.id}
                    className="font-body text-base text-lyp-white/60"
                  >
                    {JSON.stringify(block.content)}
                  </div>
                )
              })}
          </div>
        ) : (
          <p className="font-body text-lyp-white/30 text-lg">
            Content for this page is coming soon.
          </p>
        )}
      </div>
    </div>
  )
}
