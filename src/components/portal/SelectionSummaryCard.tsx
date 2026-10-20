"use client";

import { useProposal } from "./ProposalContext";
import SelectionTotals from "./SelectionTotals";
import { cn } from "@/lib/utils";
import { buildSelectionLines, totalSelection } from "@/lib/selection-pricing";

/**
 * THE INVESTMENT SUMMARY, OFF THE SUMMARY SLIDE.
 *
 * Lifted out of SummaryPage so the signing slide can stand the same figures
 * beside the signature pad: what a client is about to be bound by belongs on
 * screen while they sign it, not a page back. The sums are not done here —
 * `src/lib/selection-pricing` does them for every screen that shows a basket,
 * so the slide, the price bar and this card cannot disagree to the cent.
 *
 * Each line is quoted in its own cadence: by the week for a subscription,
 * by the month for the two the agency still quotes that way, and neither for
 * a single payment. The totals underneath carry the week and the month
 * together, because that is what the client is quoted and what they are
 * actually billed.
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

export default function SelectionSummaryCard({
  t,
  className,
}: {
  t: Copy;
  className?: string;
}) {
  const { selections, serviceMap } = useProposal();

  const lines = buildSelectionLines(selections, serviceMap);
  const totals = totalSelection(lines);

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
                {line.period === "in_kind" ? (
                  t("free")
                ) : (
                  <>
                    {formatCents(line.nativeCents)}
                    {line.period === "week" && (
                      <span className="text-lyp-white/80">
                        {t("perWeekShort")}
                      </span>
                    )}
                    {line.period === "month" && (
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
              ) : line.period === "one_off" ? (
                <span className="mt-0.5 font-body text-[12.5px]/[16px] text-lyp-white/75">
                  {t("oneOffPayment")}
                </span>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      <SelectionTotals t={t} totals={totals} className="mt-3" />
    </div>
  );
}
