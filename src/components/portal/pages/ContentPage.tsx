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

  // Cover page
  if (slug === "cover") {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6 text-center">
        <div className="mb-8">
          <h1 className="font-heading text-5xl md:text-7xl text-lyp-cherry tracking-tight">
            LickYourPhone
          </h1>
          <div className="mt-2 h-1 w-24 mx-auto bg-lyp-cherry rounded-full" />
        </div>
        <p className="font-body text-lg text-lyp-white/60 mb-2">
          Proposal prepared for
        </p>
        <h2 className="font-heading text-3xl md:text-4xl text-lyp-white mb-1">
          {proposal.clientName}
        </h2>
        <p className="font-body text-lg text-lyp-white/50">
          {proposal.venueName}
        </p>
      </div>
    )
  }

  // Signature page
  if (slug === "signature") {
    return <SignaturePage />
  }

  // Payment page
  if (slug === "payment") {
    return <PaymentPage />
  }

  // Intake form
  if (slug === "intake") {
    return <IntakeFormWrapper />
  }

  // Summary is handled by SummaryPage, but guard against it here too
  if (slug === "summary") {
    return null
  }

  // Generic content page
  return (
    <div className="flex h-full flex-col px-6 py-10 md:px-16 lg:px-24">
      {page.title && (
        <h1 className="font-heading text-3xl md:text-5xl text-lyp-white mb-8">
          {page.title}
        </h1>
      )}
      <div className="flex-1 overflow-y-auto">
        {page.contentBlocks.length > 0 ? (
          <div className="space-y-4">
            {page.contentBlocks
              .sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0))
              .map((block) => {
                if (block.type === "heading") {
                  return (
                    <h2
                      key={block.id}
                      className="font-heading text-2xl text-lyp-white"
                    >
                      {String(block.content ?? "")}
                    </h2>
                  )
                }
                if (block.type === "paragraph") {
                  return (
                    <p
                      key={block.id}
                      className="font-body text-sm text-lyp-white/80 leading-relaxed"
                    >
                      {String(block.content ?? "")}
                    </p>
                  )
                }
                if (block.type === "list" && Array.isArray(block.content)) {
                  return (
                    <ul key={block.id} className="list-disc list-inside space-y-1">
                      {(block.content as string[]).map((item, i) => (
                        <li
                          key={i}
                          className="font-body text-sm text-lyp-white/80"
                        >
                          {item}
                        </li>
                      ))}
                    </ul>
                  )
                }
                return (
                  <div
                    key={block.id}
                    className="font-body text-sm text-lyp-white/60"
                  >
                    {JSON.stringify(block.content)}
                  </div>
                )
              })}
          </div>
        ) : (
          <p className="font-body text-lyp-white/40">
            Content for this page is coming soon.
          </p>
        )}
      </div>
    </div>
  )
}
