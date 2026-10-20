"use client"

import { ChevronDown, Clock, ShoppingBag } from "lucide-react"
import { useCopy, useProposal } from "./ProposalContext"
import { CountdownClock } from "./DiscountCountdown"
import { cn } from "@/lib/utils"

function formatCents(cents: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

/**
 * The red bar, which is also the basket's handle: the whole width of it is one
 * button that opens and closes the selection panel, so the running total and
 * the thing it summarises are the same object rather than two.
 *
 * `countdownEndsAt` folds the discount countdown into this bar on wider
 * screens, so the slide never loses two bars' worth of height.
 */
export default function RunningTotal({
  countdownEndsAt,
  cartOpen = false,
  onToggleCart,
}: {
  countdownEndsAt?: string | null
  cartOpen?: boolean
  onToggleCart?: () => void
} = {}) {
  const { selectedCount, totals } = useProposal()
  const t = useCopy("global")

  if (selectedCount === 0) return null

  /**
   * THE BAR QUOTES BY THE WEEK, AND NEVER QUOTES A ONE-OFF AT ALL.
   *
   * It used to add every selection into one monthly figure, so a $2,495
   * photography shoot — a single payment — read as $2,495 a month. The
   * subscriptions now carry the headline in the cadence they are sold in,
   * and single payments sit beside it as their own amount.
   */
  const hasRecurring = totals.recurringCount > 0
  const hasOneOff = totals.oneOffCount > 0
  const headlineCents = hasRecurring ? totals.weeklyCents : totals.oneOffCents
  const fullCents = hasRecurring ? totals.weeklyFullCents : totals.oneOffFullCents
  const hasDiscount = fullCents > headlineCents

  return (
    // The bar drops in from above the viewport edge the moment the first
    // service is added — it mounts on that transition, so the CSS entry fires
    // once per appearance rather than on every re-render.
    <div className="portal-reveal portal-reveal-fall border-b border-lyp-cherry/30 bg-lyp-cherry px-4 py-3 sm:px-6">
      <button
        type="button"
        onClick={onToggleCart}
        aria-expanded={cartOpen}
        aria-controls="selection-cart"
        className="mx-auto flex w-full max-w-[1400px] items-center justify-between rounded-lg text-left transition-colors duration-300 ease-brand hover:bg-lyp-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lyp-white/80 motion-reduce:transition-none"
      >
        <div className="flex items-center gap-2 sm:gap-3">
          <ShoppingBag
            aria-hidden
            strokeWidth={2.25}
            className="h-4 w-4 flex-shrink-0 text-lyp-white"
          />
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
          {(hasRecurring || hasOneOff) && (
            <>
              {hasDiscount && (
                <span className="hidden font-body text-sm text-lyp-white/60 line-through sm:inline">
                  {formatCents(fullCents)}
                </span>
              )}
              <span
                key={headlineCents}
                className="portal-reveal portal-reveal-fade font-heading text-xl text-lyp-white"
                style={{ animationDelay: "0ms", animationDuration: "380ms" }}
              >
                {formatCents(headlineCents)}
              </span>
              {/* On a phone the bar has room for the count, the total and the
                  handle, and little else — but the figure must never sit there
                  unlabelled, or a weekly price reads as the whole cost. The
                  cadence stays at phone width in short form; the GST line is
                  waiting in the basket. */}
              <span className="whitespace-nowrap font-body text-[11px] text-lyp-white/70 sm:hidden">
                {hasRecurring ? t("perWeekGstShort") : ` ${t("cartOneOff")}`}
              </span>
              <span className="hidden whitespace-nowrap font-body text-[11px] text-lyp-white/70 sm:inline sm:text-xs">
                {hasRecurring ? t("perWeekGst") : t("barOneOffGst")}
              </span>
              {/* Single payments alongside a subscription. Their own amount,
                  never added into the weekly figure. Wide screens only: the
                  basket carries it everywhere else. */}
              {hasRecurring && hasOneOff && (
                <span className="hidden whitespace-nowrap font-body text-[11px] text-lyp-white/70 lg:inline lg:text-xs">
                  {t("barOneOffSuffix", {
                    amount: formatCents(totals.oneOffCents),
                  })}
                </span>
              )}
            </>
          )}
          {/* The affordance. The words are for anyone with the room for them;
              the chevron carries the state on a phone, where they don't fit. */}
          <span className="ml-1 flex items-center gap-1 whitespace-nowrap border-l border-lyp-white/25 pl-2 font-body text-xs text-lyp-white sm:pl-3">
            <span className="hidden md:inline">
              {cartOpen ? t("cartHideLabel") : t("cartOpenLabel")}
            </span>
            <ChevronDown
              aria-hidden
              strokeWidth={2.25}
              className={cn(
                "h-4 w-4 transition-transform duration-300 ease-brand motion-reduce:transition-none",
                cartOpen && "rotate-180",
              )}
            />
          </span>
        </div>
      </button>
    </div>
  )
}
