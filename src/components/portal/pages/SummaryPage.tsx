"use client";

import { useState } from "react";
import { Check, ChevronDown, Clock, Pencil, X } from "lucide-react";
import { useCopy, useProposal } from "../ProposalContext";
import { cn } from "@/lib/utils";
import Reveal, { STEP, revealDelay } from "../Reveal";
import SelectionTotals from "../SelectionTotals";
import { CountdownClock, useDiscountTimerLive } from "../DiscountCountdown";
import { buildSelectionLines, totalSelection } from "@/lib/selection-pricing";

function formatCents(cents: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export default function SummaryPage() {
  const {
    proposal,
    selections,
    serviceMap,
    pages,
    setCurrentPage,
    deselectService,
    selectTier,
    paymentCaptured,
  } = useProposal();
  const t = useCopy("summary");
  const g = useCopy("global");

  const [expandedId, setExpandedId] = useState<string | null>(null);

  // The same test the countdown strip at the top of the deck applies, so the
  // two can never disagree about whether an offer is still running.
  const timerLive = useDiscountTimerLive(
    proposal.discountTimerActive,
    proposal.discountExpiresAt,
    proposal.discountStartsAt,
  );
  const isSigned =
    proposal.status === "signed" || proposal.status === "intake_complete";
  const showOfferEnds =
    timerLive && !isSigned && !!proposal.discountExpiresAt;

  // Every line, priced in the cadence it is sold in, by the one module that
  // prices the price bar and the basket too.
  const selectedServices = buildSelectionLines(selections, serviceMap);
  const totals = totalSelection(selectedServices);

  const signatureIdx = pages.findIndex((p) => p.slug === "signature");
  const paymentIdx = pages.findIndex((p) => p.slug === "payment");

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      {/* The body sits on the optical centre of the frame like every other
          slide. Auto margins, not justify-center: if a long list ever outgrows
          the height, it scrolls from the top instead of losing its heading. */}
      <div className="flex flex-1 px-8 py-8 md:px-16 lg:px-24">
        <div className="m-auto w-full">
          <Reveal
            as="h1"
            index={0}
            className="font-heading text-3xl md:text-5xl text-lyp-white mb-2 uppercase tracking-tight"
          >
            {t("heading")}
          </Reveal>
          <Reveal
            as="p"
            index={1}
            className="font-body text-base text-lyp-white/80 mb-6"
          >
            {t("intro")}
          </Reveal>

          {selectedServices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Reveal
                as="p"
                index={2}
                className="font-body text-lyp-white/70 text-lg"
              >
                {t("emptyTitle")}
              </Reveal>
              <Reveal
                as="p"
                index={3}
                className="font-body text-lyp-white/70 text-[15px] mt-2"
              >
                {t("emptyBody")}
              </Reveal>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8 items-start">
              {/* Left: expandable drawers */}
              <div className="space-y-2">
                {selectedServices.map((item, i) => {
                  if (!item) return null;
                  const isOpen = expandedId === item.id;
                  // The slide this service was pitched on, so the drawer can
                  // offer a way back to it. `pages` is already filtered to what
                  // this client can see, so -1 means there is nothing to send
                  // them to and the control stays off.
                  const servicePageIdx = pages.findIndex(
                    (p) => p.serviceId === item.id,
                  );
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
                        className="w-full flex items-center justify-between px-4 py-4 text-left transition-colors hover:bg-lyp-white/5 sm:px-5"
                      >
                        {/* On a phone the name gets its own line and the term
                          sits under it, so the price never squeezes the name
                          down to a single letter. */}
                        <div className="flex items-start gap-3 min-w-0">
                          <Check className="mt-0.5 h-4 w-4 text-lyp-cherry shrink-0" />
                          <div className="min-w-0">
                            <span className="block font-heading text-sm text-lyp-white uppercase tracking-wide break-words sm:truncate">
                              {item.name}
                            </span>
                            {item.tierName && (
                              <span className="block font-body text-[13px]/[18px] text-lyp-white/75">
                                {item.tierName}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-3 sm:gap-3 sm:ml-4">
                          {item.billing === "in_kind" ? (
                            <span className="font-body text-sm text-lyp-cherry">
                              {t("complimentary")}
                            </span>
                          ) : (
                            <span className="font-heading text-base text-lyp-white">
                              {item.hasDiscount && (
                                <span className="hidden font-body text-[13px]/[18px] text-lyp-white/70 line-through mr-2 sm:inline">
                                  {formatCents(item.nativeListCents)}
                                </span>
                              )}
                              {formatCents(item.nativeCents)}
                              <span className="font-body text-[13px]/[18px] text-lyp-white/75 ml-0.5">
                                {item.period === "week"
                                  ? t("perWeekShort")
                                  : item.period === "month"
                                    ? t("perMonthShort")
                                    : ` ${t("oneOffShort")}`}
                              </span>
                            </span>
                          )}
                          <ChevronDown
                            className={cn(
                              "h-4 w-4 text-lyp-white/70 transition-transform duration-300 ease-brand motion-reduce:transition-none",
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
                          {item.period === "week" && (
                            <p className="font-body text-sm text-lyp-white/80">
                              {t("weeklyBreakdown", {
                                weekly: formatCents(item.nativeCents),
                                monthly: formatCents(item.monthlyCents),
                              })}
                            </p>
                          )}

                          {/* The contract length is changed here rather than
                              back on the slide: this is where they compare
                              what they have chosen, so this is where they
                              change their mind. Prices move at once. */}
                          {item.tiers.length > 1 && !paymentCaptured && (
                            <div>
                              <p className="font-heading text-[13px]/[18px] uppercase tracking-wide text-lyp-cherry">
                                {t("termLabel")}
                              </p>
                              <div className="mt-2 flex flex-wrap gap-2">
                                {[...item.tiers]
                                  .sort((a, b) => a.sequence - b.sequence)
                                  .map((tier) => {
                                    const chosen = tier.id === item.tierId;
                                    return (
                                      <button
                                        key={tier.id}
                                        type="button"
                                        aria-pressed={chosen}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          selectTier(item.id, tier.id);
                                        }}
                                        className={cn(
                                          "rounded-lg border px-3.5 py-2 font-body text-[13px]/[18px] transition-colors duration-300 ease-brand motion-reduce:transition-none",
                                          chosen
                                            ? "border-lyp-cherry/70 bg-lyp-cherry/15 text-lyp-white"
                                            : "border-lyp-white/15 text-lyp-white/85 hover:border-lyp-cherry/40 hover:text-lyp-white",
                                        )}
                                      >
                                        {tier.name}
                                        <span className="ml-2 font-heading">
                                          {formatCents(tier.target_price_cents)}
                                        </span>
                                        <span className="text-lyp-white/70">
                                          {item.period === "week"
                                            ? t("perWeekShort")
                                            : t("perMonthShort")}
                                        </span>
                                      </button>
                                    );
                                  })}
                              </div>
                            </div>
                          )}

                          {item.service.inclusions.length > 0 && (
                            <div>
                              <p className="font-heading text-[13px]/[18px] text-lyp-white uppercase tracking-wider mb-2">
                                {t("includedHeading")}
                              </p>
                              <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1.5">
                                {item.service.inclusions
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
                                      <Check className="mt-[3px] h-4 w-4 shrink-0 text-lyp-cherry/70" />
                                      <span className="font-body text-[13.5px]/[20px] text-lyp-white/90">
                                        {inc.text}
                                      </span>
                                    </li>
                                  ))}
                              </ul>
                            </div>
                          )}

                          {item.service.client_obligations.length > 0 && (
                            <div>
                              <p className="font-heading text-[13px]/[18px] text-lyp-white uppercase tracking-wider mb-2">
                                {t("commitmentsHeading")}
                              </p>
                              <ul className="space-y-1">
                                {item.service.client_obligations
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
                                      <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-lyp-white/40" />
                                      <span className="font-body text-[13.5px]/[20px] text-lyp-white/85">
                                        {ob.text}
                                      </span>
                                    </li>
                                  ))}
                              </ul>
                            </div>
                          )}

                          {/* Two ways out of a line the client isn't happy with:
                            go back to the slide and change it, or drop it.
                            Changing comes first — removing is the destructive
                            one and earns the far seat. */}
                          {!paymentCaptured && (
                            <div className="flex flex-wrap items-center gap-2">
                              {servicePageIdx >= 0 && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setCurrentPage(servicePageIdx);
                                  }}
                                  className="flex items-center gap-2 rounded-lg border border-lyp-white/20 px-4 py-2 font-body text-[13px]/[18px] text-lyp-white transition-colors duration-300 ease-brand hover:border-lyp-cherry/50 hover:text-lyp-cherry motion-reduce:transition-none"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                  {t("editButton")}
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deselectService(item.id);
                                  setExpandedId(null);
                                }}
                                className="flex items-center gap-2 rounded-lg border border-lyp-white/15 px-4 py-2 font-body text-[13px]/[18px] text-lyp-white/85 transition-colors duration-300 ease-brand hover:border-lyp-cherry/40 hover:text-lyp-cherry motion-reduce:transition-none"
                              >
                                <X className="h-3.5 w-3.5" />
                                {t("removeButton")}
                              </button>
                            </div>
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
                {/* The card reads bigger than it used to, so its own rhythm
                  gives the height back: a tighter pad and tighter gaps keep
                  the whole column the same height as before at six services,
                  which is what stops the slide scrolling on desktop. */}
                <div className="rounded-xl border border-lyp-white/10 bg-lyp-white/5 p-5 space-y-3.5">
                  <h3 className="font-heading text-lg text-lyp-white text-center mb-3">
                    {t("cardTitle")}
                  </h3>

                  <div className="space-y-2">
                    {selectedServices.map((item) => {
                      if (!item) return null;
                      return (
                        <div
                          key={item.id}
                          className="flex justify-between items-start"
                        >
                          <span className="font-body text-[13.5px]/[18px] text-lyp-white/90 mr-2 mt-px">
                            {item.name}
                          </span>
                          <div className="flex flex-col items-end shrink-0">
                            <span className="font-body text-[13.5px]/[18px] text-lyp-white">
                              {item.period === "in_kind" ? (
                                t("free")
                              ) : (
                                <>
                                  {formatCents(item.nativeCents)}
                                  {item.period === "week" && (
                                    <span className="text-lyp-white/80">
                                      {t("perWeekShort")}
                                    </span>
                                  )}
                                  {item.period === "month" && (
                                    <span className="text-lyp-white/80">
                                      {t("perMonthShort")}
                                    </span>
                                  )}
                                </>
                              )}
                            </span>

                            {/* Every paid line says how long it runs, so a
                              12-month plan reads as plainly as a 3-month one
                              and a single payment is never mistaken for a
                              recurring one. */}
                            {item.billing === "recurring_monthly" ? (
                              <span className="font-body text-[12.5px]/[16px] text-lyp-white/75 mt-0.5">
                                {item.billingCycleMonths === 1
                                  ? t("forOneMonth")
                                  : t("forMonths", {
                                      months: item.billingCycleMonths,
                                    })}
                              </span>
                            ) : item.period === "one_off" ? (
                              <span className="font-body text-[12.5px]/[16px] text-lyp-white/75 mt-0.5">
                                {t("oneOffPayment")}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <SelectionTotals t={t} totals={totals} />

                  {/* "Could the Offer ends countdown also show on the Your
                      Summary page?" The strip at the top of the deck is easy
                      to lose while reading the card, and this is where the
                      client decides, so the clock stands with the figures it
                      applies to. Same rule as the strip: gone once signed. */}
                  {showOfferEnds && (
                    <div
                      role="timer"
                      className="flex items-center justify-center gap-2 rounded-lg bg-lyp-cherry px-3 py-2"
                    >
                      <Clock
                        strokeWidth={2.25}
                        className="h-3.5 w-3.5 flex-shrink-0 text-lyp-white"
                      />
                      <span className="whitespace-nowrap font-body text-[11px] font-semibold uppercase tracking-[0.14em] text-lyp-white">
                        {g("discountEndsInShort")}
                      </span>
                      <CountdownClock
                        expiresAt={proposal.discountExpiresAt!}
                        className="text-[15px] font-bold"
                        unitClassName="ml-px text-[10px] font-semibold text-lyp-white/70"
                      />
                    </div>
                  )}

                  {paymentCaptured ? (
                    <div className="mt-2 flex flex-col items-center gap-2 rounded-lg border border-green-500/20 bg-green-500/10 px-5 py-4">
                      <span className="inline-flex items-center gap-2 font-body text-sm text-green-400">
                        <span className="h-2 w-2 rounded-full bg-green-400" />
                        {t("paymentCapturedTitle")}
                      </span>
                      <p className="font-body text-[13px]/[18px] text-lyp-white/80 text-center">
                        {t("paymentCapturedBody")}
                      </p>
                    </div>
                  ) : proposal.status === "signed" ? (
                    <button
                      onClick={() => setCurrentPage(paymentIdx)}
                      className="w-full rounded-lg bg-lyp-cherry px-5 py-3.5 font-heading text-base text-lyp-white transition-[background-color,transform] duration-300 ease-brand hover:bg-lyp-deep-red active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100 mt-2"
                    >
                      {t("addPaymentButton")}
                    </button>
                  ) : (
                    signatureIdx >= 0 && (
                      <button
                        onClick={() => setCurrentPage(signatureIdx)}
                        className="w-full rounded-lg bg-lyp-cherry px-5 py-3.5 font-heading text-base text-lyp-white transition-[background-color,transform] duration-300 ease-brand hover:bg-lyp-deep-red active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100 mt-2"
                      >
                        {t("proceedButton")}
                      </button>
                    )
                  )}
                </div>
              </Reveal>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
