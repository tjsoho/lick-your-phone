"use client";

import { useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { useProposal } from "../ProposalContext";
import { cn } from "@/lib/utils";
import Reveal, { STEP, revealDelay } from "../Reveal";

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

export default function SummaryPage() {
  const {
    proposal,
    selections,
    serviceMap,
    pages,
    setCurrentPage,
    deselectService,
    paymentCaptured,
  } = useProposal();

  const [expandedId, setExpandedId] = useState<string | null>(null);

  const selectedServices = selections
    .map((sel) => {
      const svc = serviceMap[sel.serviceId];
      if (!svc) return null;

      let targetCents: number;
      let tierName: string | null = null;

      if (sel.tierId) {
        const tier = svc.service_tiers.find((t) => t.id === sel.tierId);
        targetCents = tier ? tier.target_price_cents : svc.target_price_cents;
        tierName = tier?.name ?? null;
      } else {
        targetCents = svc.target_price_cents;
      }

      const isWeekly = svc.price_display_period === "week";
      const displayTarget = targetCents;
      const monthlyTarget = isWeekly
        ? Math.round((targetCents * 52) / 12)
        : targetCents;
      const listCents = listFromTarget(monthlyTarget, svc.discount_pct);
      const hasDiscount = svc.discount_pct != null && svc.discount_pct > 0;

      let billingCycleMonths = 1;
      if (svc.billing === "recurring_monthly") {
        const tierCycle = sel.tierId
          ? svc.service_tiers.find((t) => t.id === sel.tierId)
              ?.billing_cycle_months
          : null;

        billingCycleMonths = tierCycle ?? svc.billing_cycle_months ?? 1;
      }

      const totalContractCents = monthlyTarget * billingCycleMonths;
      const totalListContractCents = listCents * billingCycleMonths;

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
        discountPct: svc.discount_pct,
        inclusions: svc.inclusions ?? [],
        clientObligations: svc.client_obligations ?? [],
        billingCycleMonths,
        totalContractCents,
        totalListContractCents,
      };
    })
    .filter(Boolean);

  const signatureIdx = pages.findIndex((p) => p.slug === "signature");
  const paymentIdx = pages.findIndex((p) => p.slug === "payment");

  const grandTotalContractValue = selectedServices.reduce(
    (sum, item) => sum + (item?.totalContractCents ?? 0),
    0,
  );
  const grandTotalListValue = selectedServices.reduce(
    (sum, item) => sum + (item?.totalListContractCents ?? 0),
    0,
  );
  const grandTotalDiscount = grandTotalListValue - grandTotalContractValue;

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="flex-1 px-8 py-8 md:px-16 lg:px-24">
        <Reveal
          as="h1"
          index={0}
          className="font-heading text-3xl md:text-5xl text-lyp-white mb-2 uppercase tracking-tight"
        >
          Your Proposal Summary
        </Reveal>
        <Reveal
          as="p"
          index={1}
          className="font-body text-sm text-lyp-white/50 mb-8"
        >
          Here&apos;s everything you&apos;ve selected. Tap a service to see
          details.
        </Reveal>

        {selectedServices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Reveal as="p" index={2} className="font-body text-lyp-white/40 text-lg">
              No services selected yet.
            </Reveal>
            <Reveal
              as="p"
              index={3}
              className="font-body text-lyp-white/30 text-sm mt-2"
            >
              Browse the pages to add services to your proposal.
            </Reveal>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8 items-start">
            {/* Left: expandable drawers */}
            <div className="space-y-2">
              {selectedServices.map((item, i) => {
                if (!item) return null;
                const isOpen = expandedId === item.id;
                return (
                  <Reveal
                    key={item.id}
                    delay={revealDelay(2) + i * STEP}
                    className="overflow-hidden"
                  >
                    {/* Collapsed row */}
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
                              {item.billing === "recurring_monthly"
                                ? "/mo"
                                : ""}
                            </span>
                          </span>
                        )}
                        <ChevronDown
                          className={cn(
                            "h-4 w-4 text-lyp-white/40 transition-transform duration-300 ease-brand motion-reduce:transition-none",
                            isOpen && "rotate-180",
                          )}
                        />
                      </div>
                    </button>

                    {/* Expanded details */}
                    {isOpen && (
                      // The drawer body mounts on expand, so its own reveal
                      // fires each time it is opened.
                      <div className="portal-reveal border-t border-lyp-white/10 px-5 py-4 space-y-4">
                        {item.isWeekly && (
                          <p className="font-body text-xs text-lyp-white/40">
                            {formatCents(item.displayTarget)}/week (
                            {formatCents(item.monthlyTarget)}/month)
                          </p>
                        )}

                        {item.inclusions.length > 0 && (
                          <div>
                            <p className="font-heading text-xs text-lyp-cherry uppercase tracking-wider mb-2">
                              What&apos;s Included
                            </p>
                            <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1.5">
                              {item.inclusions
                                .sort(
                                  (
                                    a: { sequence?: number | null },
                                    b: { sequence?: number | null },
                                  ) => (a.sequence ?? 0) - (b.sequence ?? 0),
                                )
                                .map((inc: { id: string; text: string }) => (
                                  <li
                                    key={inc.id}
                                    className="flex items-start gap-2"
                                  >
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
                                .sort(
                                  (
                                    a: { sequence?: number | null },
                                    b: { sequence?: number | null },
                                  ) => (a.sequence ?? 0) - (b.sequence ?? 0),
                                )
                                .map((ob: { id: string; text: string }) => (
                                  <li
                                    key={ob.id}
                                    className="flex items-start gap-2"
                                  >
                                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-lyp-white/30" />
                                    <span className="font-body text-xs text-lyp-white/50">
                                      {ob.text}
                                    </span>
                                  </li>
                                ))}
                            </ul>
                          </div>
                        )}

                        {!paymentCaptured && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              deselectService(item.id);
                              setExpandedId(null);
                            }}
                            className="flex items-center gap-2 rounded-lg border border-lyp-white/15 px-4 py-2 font-body text-xs text-lyp-white/60 transition-colors hover:border-lyp-cherry/40 hover:text-lyp-cherry"
                          >
                            <X className="h-3.5 w-3.5" />
                            Remove from proposal
                          </button>
                        )}
                      </div>
                    )}
                  </Reveal>
                );
              })}
            </div>

            {/* Right: pricing card */}
            <Reveal
              variant="right"
              delay={revealDelay(3)}
              className="lg:sticky lg:top-4 self-start"
            >
              <div className="rounded-xl border border-lyp-white/10 bg-lyp-white/5 p-6 space-y-4">
                <h3 className="font-heading text-lg text-lyp-white text-center mb-3">
                  Investment Summary
                </h3>

                <div className="space-y-3">
                  {selectedServices.map((item) => {
                    if (!item) return null;
                    return (
                      <div
                        key={item.id}
                        className="flex justify-between items-start"
                      >
                        <span className="font-body text-xs text-lyp-white/60 mr-2 mt-0.5">
                          {item.name}
                        </span>
                        <div className="flex flex-col items-end shrink-0">
                          <span className="font-body text-xs text-lyp-white/80">
                            {item.billing === "in_kind" ? (
                              "Free"
                            ) : (
                              <>
                                {formatCents(item.monthlyTarget)}
                                {item.billing === "recurring_monthly" && (
                                  <span className="text-lyp-white/50">/mo</span>
                                )}
                              </>
                            )}
                          </span>

                          {/* Tampilkan rincian durasi kontrak jika recurring */}
                          {item.billing === "recurring_monthly" &&
                            item.billingCycleMonths > 1 && (
                              <span className="font-body text-[10px] text-lyp-white/40 mt-0.5">
                                for {item.billingCycleMonths} months
                              </span>
                            )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="border-t border-lyp-white/10 pt-3 space-y-2">
                  {grandTotalDiscount > 0 && (
                    <>
                      <div className="flex justify-between">
                        <span className="font-body text-xs text-lyp-white/40">
                          Total List Price
                        </span>
                        <span className="font-body text-xs text-lyp-white/30 line-through">
                          {formatCents(grandTotalListValue)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-body text-xs text-lyp-cherry">
                          Your Savings
                        </span>
                        <span className="font-body text-xs text-lyp-cherry">
                          -{formatCents(grandTotalDiscount)}
                        </span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between items-baseline pt-1">
                    <span className="font-heading text-sm text-lyp-white">
                      Total Contract Value
                    </span>
                    <span className="font-heading text-2xl text-lyp-white">
                      {formatCents(grandTotalContractValue)}
                      <span className="font-body text-xs text-lyp-white/40 ml-1">
                        + GST
                      </span>
                    </span>
                  </div>
                </div>

                {paymentCaptured ? (
                  <div className="mt-2 flex flex-col items-center gap-2 rounded-lg border border-green-500/20 bg-green-500/10 px-5 py-4">
                    <span className="inline-flex items-center gap-2 font-body text-sm text-green-400">
                      <span className="h-2 w-2 rounded-full bg-green-400" />
                      Payment details captured
                    </span>
                    <p className="font-body text-xs text-lyp-white/50 text-center">
                      Your payment information is on file. No further action
                      needed.
                    </p>
                  </div>
                ) : proposal.status === "signed" ? (
                  <button
                    onClick={() => setCurrentPage(paymentIdx)}
                    className="w-full rounded-lg bg-lyp-cherry px-5 py-3.5 font-heading text-base text-lyp-white transition-[background-color,transform] duration-300 ease-brand hover:bg-lyp-deep-red active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100 mt-2"
                  >
                    Proceed to Payment
                  </button>
                ) : (
                  signatureIdx >= 0 && (
                    <button
                      onClick={() => setCurrentPage(signatureIdx)}
                      className="w-full rounded-lg bg-lyp-cherry px-5 py-3.5 font-heading text-base text-lyp-white transition-[background-color,transform] duration-300 ease-brand hover:bg-lyp-deep-red active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100 mt-2"
                    >
                      Proceed to Signature
                    </button>
                  )
                )}
              </div>
            </Reveal>
          </div>
        )}
      </div>
    </div>
  );
}
