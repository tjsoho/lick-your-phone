"use client"

import { Check, AlertCircle, Info } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { useProposal, type Service } from "../ProposalContext"
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

interface ServicePageProps {
  service: Service
}

export default function ServicePage({ service }: ServicePageProps) {
  const {
    isSelected,
    selectedTierId,
    toggleService,
    selectTier,
    deselectService,
    selections,
    serviceMap,
  } = useProposal()

  const selected = isSelected(service.id)
  const currentTierId = selectedTierId(service.id)
  const hasTiers = service.tiers.length > 0
  const isInKind = service.billing === "in_kind"

  // paid-partnership: requires at least one other non-requires service selected
  const hasOtherSelected = selections.some((sel) => {
    const svc = serviceMap[sel.serviceId]
    return svc && !svc.requiresOtherService && sel.serviceId !== service.id
  })
  const isDisabled = service.requiresOtherService && !hasOtherSelected

  const displayTarget = service.targetPriceCents
  const displayList = listFromTarget(displayTarget, service.discountPct)
  const hasDiscount = service.discountPct != null && service.discountPct > 0
  const periodLabel = service.priceDisplayPeriod === "week" ? "/week" : ""

  return (
    <div className="flex h-full flex-col px-6 py-10 md:px-16 lg:px-24">
      {/* Heading */}
      <h1 className="font-heading text-3xl md:text-5xl text-lyp-white mb-2">
        {service.name}
      </h1>
      {service.term && (
        <p className="font-body text-sm text-lyp-white/60 mb-8">{service.term}</p>
      )}

      {/* Content grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-8 overflow-y-auto pb-4">
        {/* Left: inclusions, obligations, disclaimers */}
        <div className="space-y-8">
          {/* Inclusions */}
          {service.inclusions.length > 0 && (
            <div>
              <h2 className="font-heading text-lg text-lyp-cherry mb-4">
                What&apos;s Included
              </h2>
              <ul className="space-y-3">
                {service.inclusions
                  .sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0))
                  .map((inc) => (
                    <li key={inc.id} className="flex items-start gap-3">
                      <Check className="mt-0.5 h-5 w-5 shrink-0 text-lyp-cherry" />
                      <span className="font-body text-sm text-lyp-white/90">
                        {inc.text}
                      </span>
                    </li>
                  ))}
              </ul>
            </div>
          )}

          {/* Client obligations */}
          {service.clientObligations.length > 0 && (
            <div>
              <h2 className="font-heading text-lg text-lyp-white/70 mb-4">
                Your Commitments
              </h2>
              <ul className="space-y-3">
                {service.clientObligations
                  .sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0))
                  .map((ob) => (
                    <li key={ob.id} className="flex items-start gap-3">
                      <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-lyp-white/40" />
                      <span className="font-body text-sm text-lyp-white/70">
                        {ob.text}
                      </span>
                    </li>
                  ))}
              </ul>
            </div>
          )}

          {/* Disclaimers */}
          {service.disclaimers.length > 0 && (
            <div>
              {service.disclaimers
                .sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0))
                .map((d) => (
                  <div key={d.id} className="flex items-start gap-3 mt-2">
                    <Info className="mt-0.5 h-4 w-4 shrink-0 text-lyp-white/30" />
                    <span className="font-body text-xs text-lyp-white/50 italic">
                      {d.text}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Right: pricing + selector */}
        <div className="flex flex-col items-start lg:items-end justify-start gap-6">
          {/* Price display */}
          <div className="text-right">
            {isInKind ? (
              <p className="font-heading text-2xl text-lyp-cherry">
                Complimentary
              </p>
            ) : hasTiers ? (
              <div className="space-y-2">
                {service.tiers
                  .sort((a, b) => a.sequence - b.sequence)
                  .map((tier) => {
                    const tierList = listFromTarget(tier.targetPriceCents, service.discountPct)
                    const tierSelected = currentTierId === tier.id
                    return (
                      <button
                        key={tier.id}
                        disabled={isDisabled}
                        onClick={() => {
                          if (tierSelected) {
                            deselectService(service.id)
                          } else {
                            selectTier(service.id, tier.id)
                          }
                        }}
                        className={cn(
                          "w-full flex items-center justify-between gap-4 rounded-lg border px-5 py-4 text-left transition-all",
                          tierSelected
                            ? "border-lyp-cherry bg-lyp-cherry/10"
                            : "border-lyp-white/10 bg-lyp-white/5 hover:border-lyp-white/20",
                          isDisabled && "opacity-40 cursor-not-allowed",
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              "h-4 w-4 rounded-full border-2 transition-colors",
                              tierSelected
                                ? "border-lyp-cherry bg-lyp-cherry"
                                : "border-lyp-white/30",
                            )}
                          />
                          <span className="font-body text-sm text-lyp-white">
                            {tier.name}
                          </span>
                        </div>
                        <div className="text-right">
                          {hasDiscount && (
                            <span className="font-body text-xs text-lyp-white/40 line-through mr-2">
                              {formatCents(tierList)}
                            </span>
                          )}
                          <span className="font-heading text-lg text-lyp-white">
                            {formatCents(tier.targetPriceCents)}
                          </span>
                          {periodLabel && (
                            <span className="font-body text-xs text-lyp-white/50 ml-1">
                              {periodLabel}
                            </span>
                          )}
                        </div>
                      </button>
                    )
                  })}
              </div>
            ) : (
              <>
                {hasDiscount && (
                  <p className="font-body text-lg text-lyp-white/40 line-through">
                    {formatCents(displayList)}
                    {periodLabel && <span className="text-sm ml-1">{periodLabel}</span>}
                  </p>
                )}
                <p className="font-heading text-3xl text-lyp-white">
                  {formatCents(displayTarget)}
                  {periodLabel && (
                    <span className="font-body text-base text-lyp-white/50 ml-1">
                      {periodLabel}
                    </span>
                  )}
                </p>
                {hasDiscount && (
                  <p className="font-body text-xs text-lyp-cherry mt-1">
                    Save {Math.round((service.discountPct ?? 0) * 100)}%
                  </p>
                )}
              </>
            )}
          </div>

          {/* Toggle for non-tiered services */}
          {!hasTiers && (
            <div
              className={cn(
                "flex items-center gap-4",
                isDisabled && "opacity-40",
              )}
            >
              <Switch
                checked={selected}
                onCheckedChange={() => {
                  if (!isDisabled) toggleService(service.id)
                }}
                disabled={isDisabled}
                className="data-[state=checked]:bg-lyp-cherry"
              />
              <span className="font-body text-sm text-lyp-white/70">
                {isInKind
                  ? "Paid in kind"
                  : selected
                    ? "Selected"
                    : "Add to proposal"}
              </span>
            </div>
          )}

          {/* Disabled hint */}
          {isDisabled && (
            <p className="font-body text-xs text-lyp-white/40 max-w-xs text-right">
              This service requires at least one other service to be selected first.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
