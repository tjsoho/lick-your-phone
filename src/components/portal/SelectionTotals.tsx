"use client";

import { cn } from "@/lib/utils";
import type { SelectionTotals as Totals } from "@/lib/selection-pricing";

/**
 * WHAT THE BASKET COMES TO, AT THE FOOT OF EVERY CARD THAT SHOWS IT.
 *
 * The summary slide and the card beside the signature pad close on the same
 * four lines, so they are written once here rather than twice in markup that
 * drifted apart a line at a time.
 *
 *   Full price        $803/wk   ← struck through, only while an offer runs
 *   YOU SAVE         -$187/wk   ← the best news on the card, so it is loud
 *   Weekly Total      $616/wk + GST
 *   One-off payment   $2,495 + GST
 *
 * ONE CADENCE ONLY. Subscriptions are billed monthly, and an earlier draft
 * carried the monthly equivalent under the weekly total for that reason. The
 * agency wants a single figure at the checkout: "we only want weekly". The
 * monthly amount still appears where it belongs, on the contract.
 *
 * Single payments are never folded into either. A one-off has no cadence.
 *
 * Wording arrives as `t` rather than being read here, so each page keeps its
 * own copy slots and the agency edits them where they expect to.
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

export default function SelectionTotals({
  t,
  totals,
  className,
}: {
  t: Copy;
  totals: Totals;
  className?: string;
}) {
  const hasRecurring = totals.recurringCount > 0;
  const hasOneOff = totals.oneOffCents > 0;

  return (
    <div
      className={cn(
        "space-y-2 border-t border-lyp-white/10 pt-3",
        className,
      )}
    >
      {totals.weeklySavingsCents > 0 && (
        <>
          <div className="flex justify-between">
            <span className="font-body text-[13px]/[18px] text-lyp-white/75">
              {t("fullPrice")}
            </span>
            <span className="font-body text-[13px]/[18px] text-lyp-white/75 line-through">
              {formatCents(totals.weeklyFullCents)}
              {t("perWeekShort")}
            </span>
          </div>
          {/* "Please make the You save amount bigger and bolder." It is the
              one number on the card the client is pleased to find, so it is
              set in the heading face at bold, a size up from the figures it
              sits among and only a touch under the total itself. */}
          <div className="flex items-baseline justify-between gap-3">
            <span className="font-heading text-base/[24px] font-semibold uppercase tracking-wide text-lyp-gold">
              {t("youSave")}
            </span>
            <span className="whitespace-nowrap font-heading text-[22px]/[26px] font-bold text-lyp-gold">
              -{formatCents(totals.weeklySavingsCents)}
              <span className="ml-0.5 font-body text-[13px] font-normal">
                {t("perWeekShort")}
              </span>
            </span>
          </div>
        </>
      )}

      {hasRecurring && (
        <div className="flex items-baseline justify-between gap-3 pt-1">
          <span className="font-heading text-base text-lyp-white">
            {t("weeklyTotal")}
          </span>
          <span className="whitespace-nowrap font-heading text-2xl text-lyp-white">
            {formatCents(totals.weeklyCents)}
            <span className="ml-1 font-body text-[13px] text-lyp-white/80">
              {t("gstSuffixWeekly")}
            </span>
          </span>
        </div>
      )}

      {hasOneOff && (
        <div className="flex items-baseline justify-between gap-3 pt-1">
          <span
            className={
              hasRecurring
                ? "font-body text-[13.5px]/[18px] text-lyp-white/90"
                : "font-heading text-base text-lyp-white"
            }
          >
            {totals.oneOffCount === 1
              ? t("oneOffTotalSingle")
              : t("oneOffTotalPlural")}
          </span>
          <span
            className={cn(
              "whitespace-nowrap text-lyp-white",
              hasRecurring ? "font-body text-base" : "font-heading text-2xl",
            )}
          >
            {totals.oneOffFullCents > totals.oneOffCents && (
              <span className="mr-2 font-body text-[13px] text-lyp-white/75 line-through">
                {formatCents(totals.oneOffFullCents)}
              </span>
            )}
            {formatCents(totals.oneOffCents)}
            <span className="ml-1 font-body text-[13px] text-lyp-white/80">
              {t("gstSuffix")}
            </span>
          </span>
        </div>
      )}

      {!hasRecurring && !hasOneOff && (
        <p className="pt-1 text-center font-heading text-base text-lyp-white">
          {t("complimentary")}
        </p>
      )}
    </div>
  );
}
