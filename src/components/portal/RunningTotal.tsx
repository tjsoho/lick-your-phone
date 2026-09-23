"use client"

import { Clock } from "lucide-react"
import { useCopy, useProposal } from "./ProposalContext"
import { CountdownClock } from "./DiscountCountdown"

function formatCents(cents: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

/**
 * `countdownEndsAt` folds the discount countdown into this bar on wider
 * screens, so the slide never loses two bars' worth of height.
 */
export default function RunningTotal({
  countdownEndsAt,
}: {
  countdownEndsAt?: string | null
} = {}) {
  const { selectedCount, totalListCents, totalTargetCents, totalDiscountCents } =
    useProposal()
  const t = useCopy("global")

  if (selectedCount === 0) return null

  const hasDiscount = totalDiscountCents > 0

  return (
    // The bar drops in from above the viewport edge the moment the first
    // service is added — it mounts on that transition, so the CSS entry fires
    // once per appearance rather than on every re-render.
    <div className="portal-reveal portal-reveal-fall border-b border-lyp-cherry/30 bg-lyp-cherry px-4 py-3 sm:px-6">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Re-keyed on the count so the badge acknowledges each change. */}
          <span
            key={selectedCount}
            className="portal-reveal portal-reveal-pop flex h-7 w-7 items-center justify-center rounded-full bg-lyp-white font-heading text-sm text-lyp-cherry"
            style={{ animationDelay: "0ms" }}
          >
            {selectedCount}
          </span>
          <span className="whitespace-nowrap font-body text-sm text-lyp-white">
            {t(selectedCount === 1 ? "servicesSelectedOne" : "servicesSelectedMany")}
          </span>
        </div>
        {countdownEndsAt && (
          // Same alert voice as the standalone strip — white and weighted, not
          // a faint caption on the cherry ground.
          <div
            role="timer"
            className="hidden items-center gap-2 font-body text-xs text-lyp-white sm:flex"
          >
            <Clock strokeWidth={2.25} className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="whitespace-nowrap font-semibold uppercase tracking-[0.16em]">
              {t("discountEndsInShort")}
            </span>
            <CountdownClock
              expiresAt={countdownEndsAt}
              className="text-[15px] font-bold"
              unitClassName="ml-px text-[10px] font-semibold text-lyp-white/70"
            />
          </div>
        )}
        <div className="flex items-center gap-2 sm:gap-3">
          {hasDiscount && (
            <span className="hidden font-body text-sm text-lyp-white/60 line-through sm:inline">
              {formatCents(totalListCents)}
            </span>
          )}
          <span
            key={totalTargetCents}
            className="portal-reveal portal-reveal-fade font-heading text-xl text-lyp-white"
            style={{ animationDelay: "0ms", animationDuration: "380ms" }}
          >
            {formatCents(totalTargetCents)}
          </span>
          <span className="whitespace-nowrap font-body text-[11px] text-lyp-white/70 sm:text-xs">
            {t("perMonthGst")}
          </span>
        </div>
      </div>
    </div>
  )
}
