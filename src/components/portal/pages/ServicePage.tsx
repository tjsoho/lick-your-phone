"use client";

import { Check, AlertCircle } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { PageData, useProposal } from "../ProposalContext";
import { cn } from "@/lib/utils";
import ContentBlockRenderer from "./ContentBlockRenderer";

function formatCents(cents: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function listFromTarget(
  targetCents: number,
  discountPct: number | null,
): number {
  if (discountPct == null || discountPct === 0) return targetCents;
  return Math.round(targetCents / (1 - discountPct));
}

interface ServicePageProps {
  service: ServiceWithTiersWithInclusionsWithObligationsWithDisclaimers;
  page: PageData;
}

export default function ServicePage({ service, page }: ServicePageProps) {
  const {
    proposal,
    isSelected,
    selectedTierId,
    toggleService,
    selectTier,
    deselectService,
    selections,
    serviceMap,
    pages,
    currentPage,
  } = useProposal();

  const selected = isSelected(service.id);
  const currentTierId = selectedTierId(service.id);
  const hasTiers = service.service_tiers.length > 0;
  const isInKind = service.billing === "in_kind";

  const hasOtherSelected = selections.some((sel) => {
    const svc = serviceMap[sel.serviceId];
    return svc && !svc.requires_other_service && sel.serviceId !== service.id;
  });
  const isDisabled =
    proposal.status === "signed" ||
    (service.requires_other_service && !hasOtherSelected);

  const displayTarget = service.target_price_cents;
  const displayList = listFromTarget(displayTarget, service.discount_pct);
  const hasDiscount = service.discount_pct != null && service.discount_pct > 0;
  const periodLabel =
    service.price_display_period === "week" ? " per week" : " per month";
  const savingsCents = displayList - displayTarget;

  console.log(page);

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      {/* Header */}
      <div className="shrink-0 px-8 pt-10 pb-6 md:px-16 lg:px-24 text-center">
        <p className="font-heading text-sm text-lyp-white/50 uppercase tracking-[0.3em] mb-2">
          Media Menu
        </p>
        <h1 className="font-heading text-3xl md:text-5xl text-lyp-white uppercase tracking-tight">
          {service.name}
        </h1>
        {service.term && (
          <p className="font-body text-sm text-lyp-white/50 mt-2">
            {service.term}
          </p>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 px-8 pb-8 md:px-16 lg:px-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* Left: inclusions */}
          <div className="space-y-8">
            {service.inclusions.length > 0 && (
              <div>
                <h3 className="font-heading text-lg text-lyp-cherry mb-5 uppercase tracking-wider">
                  What&apos;s Included
                </h3>
                <ul className="space-y-3">
                  {service.inclusions
                    .sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0))
                    .map((inc) => (
                      <li key={inc.id} className="flex items-start gap-3">
                        <Check className="mt-0.5 h-5 w-5 shrink-0 text-lyp-cherry" />
                        <span className="font-body text-sm text-lyp-white">
                          {inc.text}
                        </span>
                      </li>
                    ))}
                </ul>
              </div>
            )}

            {service.client_obligations.length > 0 && (
              <div>
                <h3 className="font-heading text-lg text-lyp-white/60 mb-4 uppercase tracking-wider">
                  Your Commitments
                </h3>
                <ul className="space-y-3">
                  {service.client_obligations
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

            {service.disclaimers.length > 0 && (
              <div className="border-t border-lyp-white/10 pt-4">
                {service.disclaimers
                  .sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0))
                  .map((d) => (
                    <p
                      key={d.id}
                      className="font-body text-xs text-lyp-white/40 italic mt-2"
                    >
                      {d.text}
                    </p>
                  ))}
              </div>
            )}

            <ContentBlockRenderer blocks={page.contentBlocks} />
          </div>

          {/* Right: pricing + selection */}
          <div className="flex flex-col items-center lg:items-end gap-8">
            <div className="w-full max-w-sm rounded-xl border border-lyp-white/10 bg-lyp-white/5 p-8 text-center">
              <h3 className="font-heading text-lg text-lyp-white mb-2">
                Investment
              </h3>

              {hasDiscount && (
                <p className="font-body text-sm text-lyp-gold mb-1">
                  {Math.round((service.discount_pct ?? 0) * 100)}% off when you
                  sign within 24hrs
                </p>
              )}

              {isInKind ? (
                <p className="font-heading text-3xl text-lyp-cherry mt-4">
                  Complimentary
                </p>
              ) : hasTiers ? (
                <div className="space-y-3 mt-4">
                  {service.service_tiers
                    .sort((a, b) => a.sequence - b.sequence)
                    .map((tier) => {
                      const tierList = listFromTarget(
                        tier.target_price_cents,
                        service.discount_pct,
                      );
                      const tierSelected = currentTierId === tier.id;
                      const tierSaving = tierList - tier.target_price_cents;
                      return (
                        <button
                          key={tier.id}
                          disabled={isDisabled}
                          onClick={() => {
                            if (tierSelected) deselectService(service.id);
                            else selectTier(service.id, tier.id);
                          }}
                          className={cn(
                            "w-full rounded-lg border px-5 py-4 text-center transition-all",
                            tierSelected
                              ? "border-lyp-cherry bg-lyp-cherry/15"
                              : "border-lyp-white/10 hover:border-lyp-white/20",
                            isDisabled && "opacity-40 cursor-not-allowed",
                          )}
                        >
                          <p className="font-heading text-base text-lyp-white mb-1">
                            {tier.name}
                          </p>
                          {hasDiscount && (
                            <p className="font-body text-sm text-lyp-white/40 line-through">
                              {formatCents(tierList)} + GST
                            </p>
                          )}
                          <p className="font-heading text-xl text-lyp-white">
                            {formatCents(tier.target_price_cents)} + GST
                            {periodLabel}
                          </p>
                          {hasDiscount && tierSaving > 0 && (
                            <p className="font-body text-xs text-lyp-cherry mt-1">
                              Saving {formatCents(tierSaving)} + GST
                              {periodLabel}
                            </p>
                          )}
                        </button>
                      );
                    })}
                </div>
              ) : (
                <div className="mt-4">
                  {hasDiscount && (
                    <p className="font-body text-lg text-lyp-white/40 line-through">
                      {formatCents(displayList)} + GST
                    </p>
                  )}
                  <p className="font-heading text-3xl text-lyp-white">
                    {formatCents(displayTarget)} + GST
                    <span className="font-body text-base text-lyp-white/50">
                      {periodLabel}
                    </span>
                  </p>
                  {hasDiscount && savingsCents > 0 && (
                    <p className="font-body text-xs text-lyp-cherry mt-2">
                      Saving {formatCents(savingsCents)} + GST{periodLabel}
                    </p>
                  )}
                </div>
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
                    if (!isDisabled) toggleService(service.id);
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

            {isDisabled && (
              <p className="font-body text-xs text-lyp-white/40 max-w-xs text-center">
                {proposal.status === "signed"
                  ? "Proposal has already been signed. Services can no longer be changed."
                  : "This service requires at least one other service to be selected first."}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
