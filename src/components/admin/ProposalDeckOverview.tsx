"use client";

import { useState } from "react";
import {
  Loader2,
  RotateCcw,
  EyeOff,
  Lock,
  SquareArrowOutUpRight,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import {
  setProposalPageOverride,
  resetProposalPresentation,
  type PresentationPage,
} from "@/server-actions/proposal-presentation";
import ProposalDeckThumbnail from "@/components/admin/ProposalDeckThumbnail";
import toast from "react-hot-toast";

const EASE = "ease-brand";

const switchClasses =
  "data-[state=checked]:bg-lyp-cherry data-[state=unchecked]:bg-[#EFE6E6]";

const typePill = (type: string | null) =>
  type === "service"
    ? "bg-[#EDF1F7] text-[#5B7394]"
    : "bg-[#F2EDED] text-[#8A7A7A]";

/** Discounts are stored as fractions (0.2), shown to staff as percentages. */
function toPercent(fraction: number | null): string {
  if (fraction == null) return "";
  return String(Math.round(fraction * 1000) / 10);
}

/** Structural pages the portal needs; hiding them would break the flow. */
const LOCKED_SLUGS = ["cover", "summary", "signature", "payment", "intake"];

type Props = {
  proposalId: string;
  initialPages: PresentationPage[];
};

/**
 * The deck this client will actually see, in order, as live thumbnails.
 *
 * Each card is the real slide rendered small, so staff can read the deck at a
 * glance instead of guessing from section names. The show/hide switch and the
 * per-page discount still live on the card, and both write straight through
 * to this proposal's overrides.
 */
export default function ProposalDeckOverview({
  proposalId,
  initialPages,
}: Props) {
  const [pages, setPages] = useState(initialPages);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);

  const overrideCount = pages.filter(
    (p) => p.overrideVisible !== null || p.overrideDiscountPct !== null,
  ).length;

  function effectiveVisible(page: PresentationPage) {
    return page.overrideVisible ?? page.globalVisible;
  }

  const shownCount = pages.filter(effectiveVisible).length;

  async function handleToggle(page: PresentationPage) {
    const next = !effectiveVisible(page);
    // Matching the global setting again means there is nothing to override.
    const value = next === page.globalVisible ? null : next;

    setBusyId(page.pageId);
    setPages((prev) =>
      prev.map((p) =>
        p.pageId === page.pageId ? { ...p, overrideVisible: value } : p,
      ),
    );

    const res = await setProposalPageOverride(proposalId, page.pageId, {
      visible: value,
    });
    setBusyId(null);

    if (res.error) {
      toast.error(res.error);
      setPages((prev) =>
        prev.map((p) =>
          p.pageId === page.pageId
            ? { ...p, overrideVisible: page.overrideVisible }
            : p,
        ),
      );
    }
  }

  async function handleDiscount(page: PresentationPage, raw: string) {
    const trimmed = raw.trim();
    let value: number | null = null;

    if (trimmed !== "") {
      const parsed = Number(trimmed);
      if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
        toast.error("Discount must be between 0 and 100");
        return;
      }
      // Typed as a percentage, stored as a fraction to match services.
      value = parsed / 100;
      if (
        page.globalDiscountPct != null &&
        Math.abs(value - page.globalDiscountPct) < 1e-9
      )
        value = null;
    }

    if (value === page.overrideDiscountPct) return;

    setBusyId(page.pageId);
    setPages((prev) =>
      prev.map((p) =>
        p.pageId === page.pageId ? { ...p, overrideDiscountPct: value } : p,
      ),
    );

    const res = await setProposalPageOverride(proposalId, page.pageId, {
      discountPct: value,
    });
    setBusyId(null);

    if (res.error) {
      toast.error(res.error);
      setPages((prev) =>
        prev.map((p) =>
          p.pageId === page.pageId
            ? { ...p, overrideDiscountPct: page.overrideDiscountPct }
            : p,
        ),
      );
      return;
    }
    toast.success(
      value === null ? "Following the standard discount" : "Discount updated",
    );
  }

  async function handleReset() {
    if (
      !window.confirm(
        "Drop every change and show this client the standard deck?",
      )
    )
      return;

    setResetting(true);
    const res = await resetProposalPresentation(proposalId);
    setResetting(false);

    if (res.error) {
      toast.error(res.error);
      return;
    }
    setPages((prev) =>
      prev.map((p) => ({
        ...p,
        overrideVisible: null,
        overrideDiscountPct: null,
      })),
    );
    toast.success("Back to the standard deck");
  }

  // Deck position counts only the slides the client will actually reach, and
  // re-counts as switches flip.
  let position = 0;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="font-body text-[12px] text-[#8A7A7A]">
          <span className="font-semibold text-lyp-black tabular-nums">
            {shownCount}
          </span>{" "}
          {shownCount === 1 ? "page" : "pages"} in this client&rsquo;s deck.{" "}
          {overrideCount === 0 ? (
            <>
              Following the standard deck — changes here affect this proposal
              only.
            </>
          ) : (
            <>
              <span className="font-semibold text-lyp-cherry">
                {overrideCount} tailored
              </span>{" "}
              for this proposal; everything else follows Content Pages.
            </>
          )}
        </p>

        {overrideCount > 0 && (
          <button
            type="button"
            onClick={handleReset}
            disabled={resetting}
            className={`inline-flex items-center gap-2 rounded-full border border-[#EFE6E6] bg-lyp-white px-4 py-1.5 font-body text-[12px] font-semibold text-[#8A7A7A] transition-all duration-500 ${EASE} hover:border-lyp-cherry/25 hover:text-lyp-cherry active:scale-[0.985] disabled:opacity-40`}
          >
            {resetting ? (
              <Loader2 strokeWidth={1.5} className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RotateCcw strokeWidth={1.5} className="h-3.5 w-3.5" />
            )}
            Reset to standard
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {pages.map((page) => {
          const locked = !!page.slug && LOCKED_SLUGS.includes(page.slug);
          const shown = effectiveVisible(page);
          const tailored =
            page.overrideVisible !== null || page.overrideDiscountPct !== null;
          const title = page.title ?? page.slug ?? "Untitled";
          if (shown) position += 1;

          return (
            <article
              key={page.pageId}
              className={`overflow-hidden rounded-2xl border bg-lyp-white transition-all duration-500 ${EASE} ${
                tailored
                  ? "border-lyp-cherry/25"
                  : "border-[#EFE6E6] hover:border-lyp-cherry/20"
              } hover:shadow-[0_14px_32px_-20px_rgba(61,11,17,0.3)]`}
            >
              {/* ── Live slide ── */}
              <a
                href={`/admin/pages/${page.pageId}`}
                target="_blank"
                rel="noopener noreferrer"
                title={`Edit ${title}`}
                className="group relative block"
              >
                <ProposalDeckThumbnail
                  pageId={page.pageId}
                  proposalId={proposalId}
                  title={title}
                  dimmed={!shown}
                />

                {/* Deck position, or a plain marker when the slide is skipped. */}
                <span className="pointer-events-none absolute left-2.5 top-2.5 flex h-6 min-w-6 items-center justify-center rounded-full bg-lyp-black/55 px-2 font-body text-[10px] font-medium tabular-nums text-lyp-white/85 backdrop-blur-sm">
                  {shown ? position : "—"}
                </span>

                {!shown && (
                  <span className="pointer-events-none absolute right-2.5 top-2.5 inline-flex items-center gap-1.5 rounded-full bg-lyp-black/55 px-2.5 py-1 font-body text-[9px] font-medium uppercase tracking-[0.16em] text-lyp-white/85 backdrop-blur-sm">
                    <EyeOff strokeWidth={1.75} className="h-3 w-3" />
                    Hidden
                  </span>
                )}

                {/* Editing is a click away, but only hinted at on hover. */}
                <span
                  className={`pointer-events-none absolute bottom-2.5 right-2.5 inline-flex items-center gap-1.5 rounded-full bg-lyp-white/90 px-2.5 py-1 font-body text-[10px] font-semibold tracking-wide text-lyp-black opacity-0 transition-opacity duration-500 ${EASE} group-hover:opacity-100`}
                >
                  Edit page
                  <SquareArrowOutUpRight
                    strokeWidth={1.75}
                    className="h-3 w-3"
                  />
                </span>
              </a>

              {/* ── Controls ── */}
              <div className="p-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3
                      className={`truncate font-body text-[13px] font-semibold ${
                        shown ? "text-lyp-black" : "text-[#C3B5B5]"
                      }`}
                      title={title}
                    >
                      {title}
                    </h3>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <span
                        className={`rounded-full px-2 py-0.5 font-body text-[9px] font-medium uppercase tracking-[0.16em] ${typePill(page.type)}`}
                      >
                        {page.type ?? "content"}
                      </span>
                      {tailored && (
                        <span className="rounded-full bg-lyp-cherry/[0.08] px-2 py-0.5 font-body text-[9px] font-medium uppercase tracking-[0.16em] text-lyp-cherry">
                          Tailored
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-shrink-0 items-center gap-2">
                    {busyId === page.pageId && (
                      <Loader2
                        strokeWidth={1.5}
                        className="h-3.5 w-3.5 animate-spin text-[#C3B5B5]"
                      />
                    )}
                    {locked ? (
                      <span
                        title="The portal needs this page, so it always shows"
                        className="flex h-6 w-6 items-center justify-center rounded-full bg-[#F7F1F1]"
                      >
                        <Lock
                          strokeWidth={1.5}
                          className="h-3 w-3 text-[#A89898]"
                        />
                      </span>
                    ) : (
                      <Switch
                        checked={shown}
                        onCheckedChange={() => handleToggle(page)}
                        aria-label={`Show ${title} in this proposal`}
                        className={switchClasses}
                      />
                    )}
                  </div>
                </div>

                {page.type === "service" && (
                  <label className="mt-3 flex items-center justify-between gap-3 border-t border-[#F7F1F1] pt-3">
                    <span className="font-body text-[10px] font-medium uppercase tracking-[0.22em] text-[#A89898]">
                      Discount
                    </span>
                    <span className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        defaultValue={toPercent(page.overrideDiscountPct)}
                        placeholder={toPercent(page.globalDiscountPct) || "0"}
                        onBlur={(e) => handleDiscount(page, e.target.value)}
                        aria-label={`Discount for ${title}`}
                        className={`w-16 rounded-xl border border-[#EFE6E6] bg-[#FBF8F8] px-2.5 py-1.5 text-right font-body text-[12.5px] tabular-nums text-lyp-black outline-none transition-all duration-500 ${EASE} placeholder:text-[#C3B5B5] focus:border-lyp-cherry/30 focus:bg-lyp-white focus:shadow-[0_0_0_4px_rgba(178,38,38,0.07)]`}
                      />
                      <span className="font-body text-[11px] text-[#A89898]">
                        %
                      </span>
                    </span>
                  </label>
                )}
              </div>
            </article>
          );
        })}
      </div>

      <p className="mt-4 font-body text-[11px] leading-relaxed text-[#A89898]">
        Thumbnails are the live slides with this client&rsquo;s own details.
        Cover, Summary, Signature, Payment and Onboarding always show — the
        portal needs them. Discounts left blank follow the service&rsquo;s
        standard rate.
      </p>
    </div>
  );
}
