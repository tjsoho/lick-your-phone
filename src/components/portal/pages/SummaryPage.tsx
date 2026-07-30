"use client"

import { Check } from "lucide-react"
import { useProposal } from "../ProposalContext"

function formatCents(cents: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

function listFromTarget(targetCents: number, discountPct: number | null): number {
  if (discountPct == null || discountPct === 0) return targetCents
  return Math.round(targetCents / (1 - discountPct))
}

export default function SummaryPage() {
  const {
    selections,
    serviceMap,
    totalListCents,
    totalTargetCents,
    totalDiscountCents,
    pages,
    setCurrentPage,
  } = useProposal()

  const selectedServices = selections
    .map((sel) => {
      const svc = serviceMap[sel.serviceId]
      if (!svc) return null

      let targetCents: number
      let tierName: string | null = null

      if (sel.tierId) {
        const tier = svc.tiers.find((t) => t.id === sel.tierId)
        targetCents = tier ? tier.targetPriceCents : svc.targetPriceCents
        tierName = tier?.name ?? null
      } else {
        targetCents = svc.targetPriceCents
      }

      // For weekly-displayed, show weekly price but note it
      const isWeekly = svc.priceDisplayPeriod === "week"
      const displayTarget = targetCents
      const monthlyTarget = isWeekly ? Math.round(targetCents * 52 / 12) : targetCents
      const listCents = listFromTarget(monthlyTarget, svc.discountPct)
      const hasDiscount = svc.discountPct != null && svc.discountPct > 0

      return {
        id: svc.id,
        name: svc.name,
        tierName,
        billing: svc.billing,
        isWeekly,
        displayTarget,
        monthlyTarget,
        listCents,
        hasDiscount,
        discountPct: svc.discountPct,
      }
    })
    .filter(Boolean)

  // Find signature page index
  const signatureIdx = pages.findIndex((p) => p.slug === "signature")

  return (
    <div className="flex h-full flex-col px-6 py-10 md:px-16 lg:px-24">
      <h1 className="font-heading text-3xl md:text-5xl text-lyp-white mb-2">
        Your Proposal Summary
      </h1>
      <p className="font-body text-sm text-lyp-white/50 mb-8">
        Here&apos;s everything you&apos;ve selected.
      </p>

      <div className="flex-1 overflow-y-auto">
        {selectedServices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <p className="font-body text-lyp-white/40 text-lg">
              No services selected yet.
            </p>
            <p className="font-body text-lyp-white/30 text-sm mt-2">
              Browse the pages to add services to your proposal.
            </p>
          </div>
        ) : (
          <div className="space-y-4 mb-8">
            {selectedServices.map((item) => {
              if (!item) return null
              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-lg border border-lyp-white/10 bg-lyp-white/5 px-5 py-4"
                >
                  <div className="flex items-center gap-3">
                    <Check className="h-5 w-5 text-lyp-cherry shrink-0" />
                    <div>
                      <p className="font-body text-sm text-lyp-white">
                        {item.name}
                        {item.tierName && (
                          <span className="text-lyp-white/50 ml-2">
                            ({item.tierName})
                          </span>
                        )}
                      </p>
                      {item.billing === "recurring_monthly" && (
                        <p className="font-body text-xs text-lyp-white/40">
                          {item.isWeekly
                            ? `${formatCents(item.displayTarget)}/week (${formatCents(item.monthlyTarget)}/month)`
                            : "Monthly"}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    {item.billing === "in_kind" ? (
                      <span className="font-body text-sm text-lyp-cherry">
                        Complimentary
                      </span>
                    ) : (
                      <>
                        {item.hasDiscount && (
                          <span className="font-body text-xs text-lyp-white/30 line-through mr-2">
                            {formatCents(item.listCents)}
                          </span>
                        )}
                        <span className="font-heading text-lg text-lyp-white">
                          {formatCents(item.monthlyTarget)}
                        </span>
                        {item.billing === "recurring_monthly" && (
                          <span className="font-body text-xs text-lyp-white/40 ml-1">
                            /mo
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Totals */}
        {selectedServices.length > 0 && (
          <div className="border-t border-lyp-white/10 pt-6 space-y-3">
            {totalDiscountCents > 0 && (
              <>
                <div className="flex justify-between">
                  <span className="font-body text-sm text-lyp-white/50">
                    List price
                  </span>
                  <span className="font-body text-sm text-lyp-white/40 line-through">
                    {formatCents(totalListCents)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-body text-sm text-lyp-cherry">
                    Your savings
                  </span>
                  <span className="font-body text-sm text-lyp-cherry">
                    -{formatCents(totalDiscountCents)}
                  </span>
                </div>
              </>
            )}
            <div className="flex justify-between items-baseline pt-2">
              <span className="font-heading text-xl text-lyp-white">
                Total
              </span>
              <span className="font-heading text-3xl text-lyp-white">
                {formatCents(totalTargetCents)}
                <span className="font-body text-sm text-lyp-white/40 ml-1">
                  + GST
                </span>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* CTA */}
      {selectedServices.length > 0 && signatureIdx >= 0 && (
        <button
          onClick={() => setCurrentPage(signatureIdx)}
          className="mt-6 w-full rounded-lg bg-lyp-cherry px-6 py-4 font-heading text-lg text-lyp-white transition-colors hover:bg-lyp-deep-red"
        >
          Proceed to Signature
        </button>
      )}
    </div>
  )
}
