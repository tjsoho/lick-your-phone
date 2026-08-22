"use client"

import { useProposal } from "./ProposalContext"

function formatCents(cents: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

export default function RunningTotal() {
  const { selectedCount, totalListCents, totalTargetCents, totalDiscountCents } =
    useProposal()

  if (selectedCount === 0) return null

  const hasDiscount = totalDiscountCents > 0

  return (
    // The bar drops in from above the viewport edge the moment the first
    // service is added — it mounts on that transition, so the CSS entry fires
    // once per appearance rather than on every re-render.
    <div className="portal-reveal portal-reveal-fall fixed top-0 left-0 right-0 z-50 border-b border-lyp-cherry/30 bg-lyp-cherry px-6 py-3">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Re-keyed on the count so the badge acknowledges each change. */}
          <span
            key={selectedCount}
            className="portal-reveal portal-reveal-pop flex h-7 w-7 items-center justify-center rounded-full bg-lyp-white font-heading text-sm text-lyp-cherry"
            style={{ animationDelay: "0ms" }}
          >
            {selectedCount}
          </span>
          <span className="font-body text-sm text-lyp-white">
            {selectedCount === 1 ? "service" : "services"} selected
          </span>
        </div>
        <div className="flex items-center gap-3">
          {hasDiscount && (
            <span className="font-body text-sm text-lyp-white/60 line-through">
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
          <span className="font-body text-xs text-lyp-white/70">+ GST</span>
        </div>
      </div>
    </div>
  )
}
