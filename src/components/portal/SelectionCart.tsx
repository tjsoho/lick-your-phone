"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { ChevronDown, Pencil, ShoppingBag, X } from "lucide-react";
import { useCopy, useProposal } from "./ProposalContext";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------
   THE BASKET

   The red price bar is the handle; this is what hangs from it. It is the
   summary card the client can keep open while they read the deck — the same
   lines, the same totals, the same one action — so a term can be changed or a
   service dropped without walking back through the slides.

     ┌──────────────────────────────────────────────┬───────────────┐
     │  ⬤ 3  services selected        $4,791  ▾ Hide │  ← the handle │
     ├──────────────────────────────────────────────┼───────────────┤
     │                                              │ YOUR SELECTIONS│
     │                                              │ ┌───────────┐ │
     │                 the slide,                   │ │▢ Name     │ │
     │             still centred in                 │ │  [12 mo ▾]│ │
     │             the width it has                 │ │  $1,299/mo│ │
     │                                              │ │  edit  ✕  │ │
     │                                              │ └───────────┘ │
     │                                              │ ─────────────  │
     │                                              │ Monthly total  │
     │                                              │ [ Review & sign]│
     └──────────────────────────────────────────────┴───────────────┘

   Rules it lives by:
   - On `sm` and up it is a rail between the bars, never on top of the slide:
     the carousel pads the slide column by the same width, so the page's
     content re-centres in what is left and still never scrolls.
   - On a phone there is no room for a rail, so it becomes a full-screen sheet
     with its own close control.
   - The list is the only thing that scrolls, and only inside the panel.
   ------------------------------------------------------------------------- */

/**
 * Rail width, and the room the carousel leaves for it. Kept together so the
 * two can never drift apart. Written out in full: Tailwind reads source text,
 * so a width built from a template string would never compile.
 *
 * Deliberately narrow. The slide keeps whatever the rail doesn't take, and a
 * service spread is a fixed frame — at 1280 wide it is left with 940px, which
 * is still more than the layout is designed down to.
 */
export const CART_WIDTH_CLASS = "sm:w-[300px] min-[1600px]:w-[340px]";
export const CART_GUTTER_CLASS = "sm:pr-[300px] min-[1600px]:pr-[340px]";

/** The nav bar's height — the panel stops above it rather than covering it. */
const NAV_HEIGHT = 56;

const STORAGE_PREFIX = "lyp-cart-open";

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

/**
 * Whether the basket is open, remembered for this visitor and this proposal.
 *
 * It starts closed on every render so the server and the first client pass
 * agree, then adopts the remembered choice on mount. Storage is wrapped
 * throughout: in a private window every call can throw, and the panel still
 * has to work — it just forgets.
 */
export function useCartOpen(token: string) {
  const [open, setOpen] = useState(false);
  const key = `${STORAGE_PREFIX}:${token}`;

  useEffect(() => {
    try {
      if (window.localStorage.getItem(key) === "1") setOpen(true);
    } catch {
      /* storage blocked — the basket simply starts closed. */
    }
  }, [key]);

  const setOpenRemembered = useCallback(
    (next: boolean) => {
      setOpen(next);
      try {
        window.localStorage.setItem(key, next ? "1" : "0");
      } catch {
        /* storage blocked — the choice holds for this visit only. */
      }
    },
    [key],
  );

  return { open, setOpen: setOpenRemembered };
}

interface SelectionCartProps {
  open: boolean;
  onClose: () => void;
  /** Height of the fixed top bars on `sm` and up, so the rail hangs off them. */
  topOffset: number;
}

export default function SelectionCart({
  open,
  onClose,
  topOffset,
}: SelectionCartProps) {
  const {
    proposal,
    selections,
    serviceMap,
    pages,
    setCurrentPage,
    selectTier,
    deselectService,
    paymentCaptured,
  } = useProposal();
  const t = useCopy("global");

  // Escape closes it, which is the one shortcut a panel like this owes you.
  // The carousel's own arrow keys keep working underneath — reading on and
  // watching the total move is the point of leaving it open.
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  /**
   * A jump only closes the panel on a phone, where it is a full-screen sheet
   * and would otherwise hide the very slide it just opened. On a wide screen
   * it is beside the slide, so it stays where it is.
   */
  const closeIfSheet = useCallback(() => {
    if (window.matchMedia("(max-width: 639px)").matches) onClose();
  }, [onClose]);

  if (!open) return null;

  // Same shape the summary card builds, from the same context values, so the
  // two can never disagree about what a line costs.
  const lines = selections.flatMap((sel) => {
    const svc = serviceMap[sel.serviceId];
    if (!svc) return [];

    const tiers = [...svc.service_tiers].sort((a, b) => a.sequence - b.sequence);
    const tier = sel.tierId ? tiers.find((x) => x.id === sel.tierId) : undefined;
    const targetCents = tier ? tier.target_price_cents : svc.target_price_cents;

    const monthlyTarget =
      svc.price_display_period === "week"
        ? Math.round((targetCents * 52) / 12)
        : targetCents;
    const listCents = listFromTarget(monthlyTarget, svc.discount_pct);

    return [
      {
        id: svc.id,
        name: svc.name,
        billing: svc.billing,
        tiers,
        tierId: sel.tierId,
        monthlyTarget,
        listCents,
        saving: listCents - monthlyTarget,
        pageIndex: pages.findIndex((p) => p.serviceId === svc.id),
        image: pages.find((p) => p.serviceId === svc.id)?.featuredImage ?? null,
      },
    ];
  });

  const sumBy = (billing: string, key: "monthlyTarget" | "listCents") =>
    lines.reduce((sum, line) => sum + (line.billing === billing ? line[key] : 0), 0);

  const monthlyTotal = sumBy("recurring_monthly", "monthlyTarget");
  const monthlyFull = sumBy("recurring_monthly", "listCents");
  const monthlySavings = monthlyFull - monthlyTotal;
  const oneOffTotal = sumBy("one_off", "monthlyTarget");
  const oneOffFull = sumBy("one_off", "listCents");
  const oneOffCount = lines.filter((line) => line.billing === "one_off").length;

  const signatureIdx = pages.findIndex((p) => p.slug === "signature");
  const paymentIdx = pages.findIndex((p) => p.slug === "payment");

  return (
    <aside
      id="selection-cart"
      aria-label={t("cartTitle")}
      // The panel mounts on open, so its entry runs once per appearance
      // rather than on every total that changes inside it.
      className={cn(
        "portal-reveal portal-reveal-right fixed inset-0 z-[60] flex flex-col bg-[#0b0406]/95 backdrop-blur-xl",
        // From `sm` it stops being a sheet and becomes a rail slung between
        // the price bar and the nav bar.
        "sm:inset-auto sm:right-0 sm:top-[var(--cart-top)] sm:bottom-[var(--cart-bottom)] sm:border-l sm:border-lyp-white/10",
        CART_WIDTH_CLASS,
      )}
      style={
        {
          "--cart-top": `${topOffset}px`,
          "--cart-bottom": `${NAV_HEIGHT}px`,
        } as React.CSSProperties
      }
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-lyp-white/10 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <ShoppingBag
            aria-hidden
            strokeWidth={2}
            className="h-4 w-4 shrink-0 text-[#f0c9c9]"
          />
          <h2 className="truncate font-heading text-xs uppercase tracking-[0.06em] text-lyp-white">
            {t("cartTitle")}
          </h2>
          {lines.length > 0 && (
            <span
              key={lines.length}
              className="portal-reveal portal-reveal-pop shrink-0 whitespace-nowrap rounded-full bg-lyp-cherry px-1.5 py-0.5 font-body text-[10px] text-lyp-white"
              style={{ animationDelay: "0ms" }}
            >
              {lines.length === 1
                ? t("cartCountOne")
                : t("cartCountMany", { count: lines.length })}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1.5 font-body text-xs text-lyp-white/75 transition-colors duration-300 ease-brand hover:bg-lyp-white/10 hover:text-lyp-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f0c9c9]/70 motion-reduce:transition-none"
        >
          {/* The label is for screen readers only: in a 300px rail the title
              needs every pixel, and the cross is unambiguous. */}
          <X aria-hidden className="h-4 w-4" />
          <span className="sr-only">{t("cartCloseButton")}</span>
        </button>
      </div>

      {/* The list — the only scroller in the portal, and it stays inside here. */}
      {lines.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-8 text-center">
          <ShoppingBag
            aria-hidden
            strokeWidth={1.5}
            className="h-7 w-7 text-lyp-white/25"
          />
          <p className="font-heading text-sm uppercase tracking-wide text-lyp-white/80">
            {t("cartEmptyTitle")}
          </p>
          <p className="font-body text-xs leading-relaxed text-lyp-white/60">
            {t("cartEmptyBody")}
          </p>
        </div>
      ) : (
        <ul className="portal-scroll min-h-0 flex-1">
          {lines.map((line) => (
            <li
              key={line.id}
              className="border-b border-lyp-white/10 px-4 py-3.5 last:border-b-0"
            >
              <div className="flex items-start gap-3">
                {line.image && (
                  // No plate, ring or shadow: the radius sits on the picture
                  // itself and it is never cropped.
                  <Image
                    src={line.image}
                    alt=""
                    width={44}
                    height={44}
                    sizes="44px"
                    className="h-11 w-11 shrink-0 rounded-md object-contain"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <h3 className="font-heading text-[13px] uppercase leading-snug tracking-wide text-lyp-white">
                    {line.name}
                  </h3>

                  {/* The price re-keys on its own value, so a term change is
                      felt rather than just seen. */}
                  <div
                    key={line.monthlyTarget}
                    className="portal-reveal portal-reveal-fade mt-1 flex flex-wrap items-baseline gap-x-2"
                    style={{ animationDelay: "0ms", animationDuration: "380ms" }}
                  >
                    {line.billing === "in_kind" ? (
                      <span className="font-body text-sm text-[#f0c9c9]">
                        {t("cartComplimentary")}
                      </span>
                    ) : (
                      <>
                        {line.saving > 0 && (
                          <span className="font-body text-[11px] text-lyp-white/60 line-through">
                            {formatCents(line.listCents)}
                          </span>
                        )}
                        <span className="font-heading text-base tabular-nums text-lyp-white">
                          {formatCents(line.monthlyTarget)}
                          <span className="ml-0.5 font-body text-[11px] text-lyp-white/70">
                            {line.billing === "recurring_monthly"
                              ? t("cartPerMonth")
                              : ` ${t("cartOneOff")}`}
                          </span>
                        </span>
                        {line.saving > 0 && (
                          <span className="whitespace-nowrap font-body text-[10px] text-lyp-gold">
                            {t("cartSaveAmount", {
                              amount: formatCents(line.saving),
                            })}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* The term, changed in place. A proposal line is one of a
                  thing, so this is the only quantity there is to pick. */}
              {line.tiers.length > 0 && (
                <div className="relative mt-2.5">
                  <select
                    aria-label={`${t("cartTermLabel")}: ${line.name}`}
                    value={line.tierId ?? ""}
                    onChange={(e) => selectTier(line.id, e.target.value)}
                    className="w-full appearance-none rounded-lg border border-lyp-white/15 bg-lyp-white/[0.06] py-1.5 pl-3 pr-8 font-body text-xs text-lyp-white transition-colors duration-300 ease-brand hover:border-lyp-white/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f0c9c9]/70 motion-reduce:transition-none"
                  >
                    {!line.tierId && (
                      <option value="" disabled className="bg-lyp-black">
                        {t("cartTermLabel")}
                      </option>
                    )}
                    {line.tiers.map((tier) => (
                      <option
                        key={tier.id}
                        value={tier.id}
                        className="bg-lyp-black text-lyp-white"
                      >
                        {tier.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    aria-hidden
                    className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-lyp-white/60"
                  />
                </div>
              )}

              <div className="mt-2.5 flex items-center gap-1">
                {line.pageIndex >= 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentPage(line.pageIndex);
                      closeIfSheet();
                    }}
                    className="flex items-center gap-1.5 rounded-lg px-2 py-1 font-body text-[11px] text-lyp-white/70 transition-colors duration-300 ease-brand hover:bg-lyp-white/10 hover:text-lyp-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f0c9c9]/70 motion-reduce:transition-none"
                  >
                    <Pencil aria-hidden className="h-3.5 w-3.5" />
                    {t("cartEditButton")}
                    <span className="sr-only"> — {line.name}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => deselectService(line.id)}
                  className="flex items-center gap-1.5 rounded-lg px-2 py-1 font-body text-[11px] text-lyp-white/70 transition-colors duration-300 ease-brand hover:bg-lyp-cherry/20 hover:text-lyp-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f0c9c9]/70 motion-reduce:transition-none"
                >
                  <X aria-hidden className="h-3.5 w-3.5" />
                  {t("cartRemoveButton")}
                  <span className="sr-only"> — {line.name}</span>
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Totals. The same model the summary card closes on: what they pay each
          month, with single payments kept apart from it. */}
      {lines.length > 0 && (
        <div className="space-y-2 border-t border-lyp-white/10 bg-lyp-black/40 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:pb-4">
          {monthlySavings > 0 && (
            <>
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-body text-xs text-lyp-white/75">
                  {t("cartFullPrice")}
                </span>
                <span className="font-body text-xs text-lyp-white/70 line-through">
                  {formatCents(monthlyFull)}
                  {t("cartPerMonth")}
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-body text-xs text-lyp-gold">
                  {t("cartYouSave")}
                </span>
                <span className="font-body text-xs text-lyp-gold">
                  -{formatCents(monthlySavings)}
                  {t("cartPerMonth")}
                </span>
              </div>
            </>
          )}

          {monthlyTotal > 0 && (
            <div className="flex items-baseline justify-between gap-3 pt-0.5">
              <span className="font-heading text-sm text-lyp-white">
                {t("cartMonthlyTotal")}
              </span>
              <span
                key={monthlyTotal}
                className="portal-reveal portal-reveal-fade whitespace-nowrap font-heading text-xl tabular-nums text-lyp-white"
                style={{ animationDelay: "0ms", animationDuration: "380ms" }}
              >
                {formatCents(monthlyTotal)}
                <span className="ml-1 font-body text-[10px] text-lyp-white/75">
                  {t("cartGstSuffixMonthly")}
                </span>
              </span>
            </div>
          )}

          {oneOffTotal > 0 && (
            <div className="flex items-baseline justify-between gap-3 pt-0.5">
              <span
                className={
                  monthlyTotal > 0
                    ? "font-body text-xs text-lyp-white/85"
                    : "font-heading text-sm text-lyp-white"
                }
              >
                {oneOffCount === 1
                  ? t("cartOneOffTotalSingle")
                  : t("cartOneOffTotalPlural")}
              </span>
              <span
                className={cn(
                  "whitespace-nowrap tabular-nums text-lyp-white",
                  monthlyTotal > 0 ? "font-body text-sm" : "font-heading text-xl",
                )}
              >
                {oneOffFull > oneOffTotal && (
                  <span className="mr-2 font-body text-xs text-lyp-white/70 line-through">
                    {formatCents(oneOffFull)}
                  </span>
                )}
                {formatCents(oneOffTotal)}
                <span className="ml-1 font-body text-[10px] text-lyp-white/75">
                  {t("cartGstSuffix")}
                </span>
              </span>
            </div>
          )}

          {monthlyTotal === 0 && oneOffTotal === 0 && (
            <p className="text-center font-heading text-sm text-lyp-white">
              {t("cartComplimentary")}
            </p>
          )}

          {/* One action, the same one the summary card ends on. Nothing to pay
              for yet means sign; already signed means pay. */}
          {!paymentCaptured &&
            (proposal.status === "signed"
              ? paymentIdx >= 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentPage(paymentIdx);
                      closeIfSheet();
                    }}
                    className="mt-1 w-full rounded-lg bg-lyp-cherry px-5 py-3 font-heading text-sm text-lyp-white transition-[background-color,transform] duration-300 ease-brand hover:bg-lyp-deep-red active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100"
                  >
                    {t("cartPaymentButton")}
                  </button>
                )
              : signatureIdx >= 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentPage(signatureIdx);
                      closeIfSheet();
                    }}
                    className="mt-1 w-full rounded-lg bg-lyp-cherry px-5 py-3 font-heading text-sm text-lyp-white transition-[background-color,transform] duration-300 ease-brand hover:bg-lyp-deep-red active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100"
                  >
                    {t("cartProceedButton")}
                  </button>
                ))}
        </div>
      )}
    </aside>
  );
}
