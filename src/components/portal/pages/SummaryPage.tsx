"use client"

import { useState } from "react"
import { Check, ChevronDown, X } from "lucide-react"
import { useProposal } from "../ProposalContext"
import { cn } from "@/lib/utils"

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
    deselectService,
  } = useProposal()

  const [expandedId, setExpandedId] = useState<string | null>(null)

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
        inclusions: svc.inclusions ?? [],
        clientObligations: svc.clientObligations ?? [],
      }
    })
    .filter(Boolean)

  const signatureIdx = pages.findIndex((p) => p.slug === "signature")
  const hasDiscount = totalDiscountCents > 0

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      {/* Price banner at top */}
      {selectedServices.length > 0 && (
        <div className="shrink-0 border-b border-lyp-white/10 bg-lyp-white/5 px-8 py-5 md:px-16 lg:px-24">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-heading text-sm text-lyp-white/50 uppercase tracking-[0.2em] mb-1">
                Your Investment
              </p>
              {hasDiscount && (
                <p className="font-body text-xs text-lyp-cherry">
                  You save {formatCents(totalDiscountCents)} + GST
                </p>
              )}
            </div>
            <div className="text-right">
              {hasDiscount && (
                <span className="font-body text-sm text-lyp-white/30 line-through mr-3">
                  {formatCents(totalListCents)}
                </span>
              )}
              <span className="font-heading text-3xl md:text-4xl text-lyp-white">
                {formatCents(totalTargetCents)}
              </span>
              <span className="font-body text-sm text-lyp-white/40 ml-1">
                + GST /mo
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 px-8 py-8 md:px-16 lg:px-24">
        <h1 className="font-heading text-3xl md:text-5xl text-lyp-white mb-2 uppercase tracking-tight">
          Your Proposal Summary
        </h1>
        <p className="font-body text-sm text-lyp-white/50 mb-8">
          Here&apos;s everything you&apos;ve selected. Tap a service to see details.
        </p>

        {selectedServices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <p className="font-body text-lyp-white/40 text-lg">
              No services selected yet.
            </p>
            <p className="font-body text-lyp-white/30 text-sm mt-2">
              Browse the pages to add services to your proposal.
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-w-3xl">
            {selectedServices.map((item) => {
              if (!item) return null
              const isOpen = expandedId === item.id
              return (
                <div
                  key={item.id}
                  className="rounded-lg border border-lyp-white/10 bg-lyp-white/5 overflow-hidden"
                >
                  {/* Collapsed row — always visible */}
                  <button
                    type="button"
                    onClick={() => setExpandedId(isOpen ? null : item.id)}
                    className="w-full flex items-center justify-between px-5 py-4 text-left transition-colors hover:bg-lyp-white/5"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Check className="h-4 w-4 text-lyp-cherry shrink-0" />
                      <span className="font-heading text-sm text-lyp-white uppercase tracking-wide truncate">
                        {item.name}
                      </span>
                      {item.tierName && (
                        <span className="font-body text-xs text-lyp-white/40 shrink-0">
                          ({item.tierName})
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-4">
                      {item.billing === "in_kind" ? (
                        <span className="font-body text-sm text-lyp-cherry">
                          Complimentary
                        </span>
                      ) : (
                        <span className="font-heading text-base text-lyp-white">
                          {item.hasDiscount && (
                            <span className="font-body text-xs text-lyp-white/30 line-through mr-2">
                              {formatCents(item.listCents)}
                            </span>
                          )}
                          {formatCents(item.monthlyTarget)}
                          <span className="font-body text-xs text-lyp-white/40 ml-0.5">
                            {item.billing === "recurring_monthly" ? "/mo" : ""}
                          </span>
                        </span>
                      )}
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 text-lyp-white/40 transition-transform duration-200",
                          isOpen && "rotate-180"
                        )}
                      />
                    </div>
                  </button>

                  {/* Expanded details */}
                  {isOpen && (
                    <div className="border-t border-lyp-white/10 px-5 py-4 space-y-4">
                      {item.isWeekly && (
                        <p className="font-body text-xs text-lyp-white/40">
                          {formatCents(item.displayTarget)}/week ({formatCents(item.monthlyTarget)}/month)
                        </p>
                      )}

                      {item.inclusions.length > 0 && (
                        <div>
                          <p className="font-heading text-xs text-lyp-cherry uppercase tracking-wider mb-2">
                            What&apos;s Included
                          </p>
                          <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1.5">
                            {item.inclusions
                              .sort((a: { sequence?: number | null }, b: { sequence?: number | null }) =>
                                (a.sequence ?? 0) - (b.sequence ?? 0)
                              )
                              .map((inc: { id: string; text: string }) => (
                                <li key={inc.id} className="flex items-start gap-2">
                                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-lyp-cherry/60" />
                                  <span className="font-body text-xs text-lyp-white/70">
                                    {inc.text}
                                  </span>
                                </li>
                              ))}
                          </ul>
                        </div>
                      )}

                      {item.clientObligations.length > 0 && (
                        <div>
                          <p className="font-heading text-xs text-lyp-white/40 uppercase tracking-wider mb-2">
                            Your Commitments
                          </p>
                          <ul className="space-y-1">
                            {item.clientObligations
                              .sort((a: { sequence?: number | null }, b: { sequence?: number | null }) =>
                                (a.sequence ?? 0) - (b.sequence ?? 0)
                              )
                              .map((ob: { id: string; text: string }) => (
                                <li key={ob.id} className="flex items-start gap-2">
                                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-lyp-white/30" />
                                  <span className="font-body text-xs text-lyp-white/50">
                                    {ob.text}
                                  </span>
                                </li>
                              ))}
                          </ul>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          deselectService(item.id)
                          setExpandedId(null)
                        }}
                        className="flex items-center gap-2 rounded-lg border border-lyp-white/15 px-4 py-2 font-body text-xs text-lyp-white/60 transition-colors hover:border-lyp-cherry/40 hover:text-lyp-cherry"
                      >
                        <X className="h-3.5 w-3.5" />
                        Remove from proposal
                      </button>
                    </div>
                  )}
                </div>
              )
            })}

            {/* Totals breakdown */}
            {hasDiscount && (
              <div className="pt-4 space-y-2 max-w-3xl">
                <div className="flex justify-between">
                  <span className="font-body text-xs text-lyp-white/40">List price</span>
                  <span className="font-body text-xs text-lyp-white/30 line-through">
                    {formatCents(totalListCents)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-body text-xs text-lyp-cherry">Your savings</span>
                  <span className="font-body text-xs text-lyp-cherry">
                    -{formatCents(totalDiscountCents)}
                  </span>
                </div>
              </div>
            )}

            {/* CTA */}
            {signatureIdx >= 0 && (
              <button
                onClick={() => setCurrentPage(signatureIdx)}
                className="w-full max-w-3xl rounded-lg bg-lyp-cherry px-6 py-4 font-heading text-lg text-lyp-white transition-colors hover:bg-lyp-deep-red mt-4"
              >
                Proceed to Signature
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
