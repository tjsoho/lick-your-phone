"use client";

import { useProposal } from "./ProposalContext";
import { cn } from "@/lib/utils";

/**
 * THE INVESTMENT SUMMARY, OFF THE SUMMARY SLIDE.
 *
 * Lifted out of SummaryPage so the signing slide can stand the same figures
 * beside the signature pad: what a client is about to be bound by belongs on
 * screen while they sign it, not a page back. The pricing rules are the
 * summary slide's own, because they have to agree to the cent —
 *
 *   - a weekly price is shown as the month it will actually be billed as
 *     (× 52 / 12), since nothing here is billed by the week;
 *   - a struck-through full price and a saving appear only while the discount
 *     is live, which the provider has already resolved by nulling out
 *     `discount_pct` when it is not;
 *   - one-off payments are totalled apart from anything monthly, so a single
 *     payment is never folded into a recurring figure.
 *
 * Wording comes in as `t` rather than being read here, so the page that shows
 * the card owns its own copy slots and the agency edits them where they
 * expect to.
 */

/** The wording function from `useCopy`, whichever page is showing the card. */
type Copy = (key: string, vars?: Record<string, string | number>) => string;

function formatCents(cents: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

/** The pre-discount price, derived from the discounted one it is shown beside. */
function listFromTarget(
  targetCents: number,
  discountPct: number | null,
): number {
  if (discountPct == null || discountPct === 0) return targetCents;
  return Math.round(targetCents / (1 - discountPct));
}

export default function SelectionSummaryCard({
  t,
  className,
}: {
  t: Copy;
  className?: string;
}) {
  const { selections, serviceMap } = useProposal();

  // flatMap rather than map+filter: a selection whose service is missing from
  // this proposal drops out and the rest stay properly typed.
  const lines = selections.flatMap((sel) => {
    const svc = serviceMap[sel.serviceId];
    if (!svc) return [];

    const tier = sel.tierId
      ? svc.service_tiers.find((candidate) => candidate.id === sel.tierId)
      : null;
    const targetCents = tier ? tier.target_price_cents : svc.target_price_cents;

    const monthlyTarget =
      svc.price_display_period === "week"
        ? Math.round((targetCents * 52) / 12)
        : targetCents;

    const billingCycleMonths =
      svc.billing === "recurring_monthly"
        ? (tier?.billing_cycle_months ?? svc.billing_cycle_months ?? 1)
        : 1;

    return [
      {
        id: svc.id,
        name: svc.name,
        tierName: tier?.name ?? null,
        billing: svc.billing,
        monthlyTarget,
        listCents: listFromTarget(monthlyTarget, svc.discount_pct),
        billingCycleMonths,
      },
    ];
  });

  const sumBy = (billing: string, key: "monthlyTarget" | "listCents") =>
    lines.reduce(
      (sum, line) => sum + (line.billing === billing ? line[key] : 0),
      0,
    );

  const monthlyTotal = sumBy("recurring_monthly", "monthlyTarget");
  const monthlyFull = sumBy("recurring_monthly", "listCents");
  const monthlySavings = monthlyFull - monthlyTotal;
  const oneOffTotal = sumBy("one_off", "monthlyTarget");
  const oneOffFull = sumBy("one_off", "listCents");
  const oneOffCount = lines.filter((line) => line.billing === "one_off").length;

  return (
    <div
      className={cn(
        "rounded-xl border border-lyp-white/10 bg-lyp-white/5 p-5",
        className,
      )}
    >
      <h2 className="mb-3 text-center font-heading text-lg text-lyp-white">
        {t("cardTitle")}
      </h2>

      {/* A long list gets its own scroll on desktop rather than pushing the
          signature pad off the bottom of a slide that must not scroll. On a
          phone it runs at full length, where the page scrolls anyway. */}
      <div className="portal-scroll space-y-2 lg:max-h-[38vh] lg:overflow-y-auto lg:pr-1">
        {lines.map((line) => (
          <div key={line.id} className="flex items-start justify-between">
            <div className="mr-2 mt-px min-w-0">
              <span className="block font-body text-[13.5px]/[18px] text-lyp-white/90">
                {line.name}
              </span>
              {line.tierName && (
                <span className="block font-body text-[12.5px]/[16px] text-lyp-white/70">
                  {line.tierName}
                </span>
              )}
            </div>
            <div className="flex shrink-0 flex-col items-end">
              <span className="font-body text-[13.5px]/[18px] text-lyp-white">
                {line.billing === "in_kind" ? (
                  t("free")
                ) : (
                  <>
                    {formatCents(line.monthlyTarget)}
                    {line.billing === "recurring_monthly" && (
                      <span className="text-lyp-white/80">
                        {t("perMonthShort")}
                      </span>
                    )}
                  </>
                )}
              </span>

              {/* Every paid line says how long it runs, so a 12-month plan
                  reads as plainly as a 3-month one and a single payment is
                  never mistaken for a recurring one. */}
              {line.billing === "recurring_monthly" ? (
                <span className="mt-0.5 font-body text-[12.5px]/[16px] text-lyp-white/75">
                  {line.billingCycleMonths === 1
                    ? t("forOneMonth")
                    : t("forMonths", { months: line.billingCycleMonths })}
                </span>
              ) : line.billing === "one_off" ? (
                <span className="mt-0.5 font-body text-[12.5px]/[16px] text-lyp-white/75">
                  {t("oneOffPayment")}
                </span>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 space-y-2 border-t border-lyp-white/10 pt-3">
        {monthlySavings > 0 && (
          <>
            <div className="flex justify-between">
              <span className="font-body text-[13px]/[18px] text-lyp-white/75">
                {t("fullPrice")}
              </span>
              <span className="font-body text-[13px]/[18px] text-lyp-white/75 line-through">
                {formatCents(monthlyFull)}
                {t("perMonthShort")}
              </span>
            </div>
            {/* The saving is the best news on the card, so it is set in the
                heading face at the weight of a total rather than whispered
                underneath one. */}
            <div className="flex items-baseline justify-between gap-3">
              <span className="font-heading text-[15px]/[22px] uppercase tracking-wide text-lyp-gold">
                {t("youSave")}
              </span>
              <span className="whitespace-nowrap font-heading text-lg/[22px] text-lyp-gold">
                -{formatCents(monthlySavings)}
                <span className="ml-0.5 font-body text-[13px]">
                  {t("perMonthShort")}
                </span>
              </span>
            </div>
          </>
        )}

        {monthlyTotal > 0 && (
          <div className="flex items-baseline justify-between gap-3 pt-1">
            <span className="font-heading text-base text-lyp-white">
              {t("monthlyTotal")}
            </span>
            <span className="whitespace-nowrap font-heading text-2xl text-lyp-white">
              {formatCents(monthlyTotal)}
              <span className="ml-1 font-body text-[13px] text-lyp-white/80">
                {t("gstSuffixMonthly")}
              </span>
            </span>
          </div>
        )}

        {oneOffTotal > 0 && (
          <div className="flex items-baseline justify-between gap-3 pt-1">
            <span
              className={
                monthlyTotal > 0
                  ? "font-body text-[13.5px]/[18px] text-lyp-white/90"
                  : "font-heading text-base text-lyp-white"
              }
            >
              {oneOffCount === 1
                ? t("oneOffTotalSingle")
                : t("oneOffTotalPlural")}
            </span>
            <span
              className={cn(
                "whitespace-nowrap text-lyp-white",
                monthlyTotal > 0
                  ? "font-body text-base"
                  : "font-heading text-2xl",
              )}
            >
              {oneOffFull > oneOffTotal && (
                <span className="mr-2 font-body text-[13px] text-lyp-white/75 line-through">
                  {formatCents(oneOffFull)}
                </span>
              )}
              {formatCents(oneOffTotal)}
              <span className="ml-1 font-body text-[13px] text-lyp-white/80">
                {t("gstSuffix")}
              </span>
            </span>
          </div>
        )}

        {monthlyTotal === 0 && oneOffTotal === 0 && (
          <p className="pt-1 text-center font-heading text-base text-lyp-white">
            {t("complimentary")}
          </p>
        )}
      </div>
    </div>
  );
}
