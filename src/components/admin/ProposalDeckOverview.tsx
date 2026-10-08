"use client";

import { useEffect, useState } from "react";
import { Loader2, RotateCcw, EyeOff, Lock, AlertTriangle } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import {
  setProposalPageOverride,
  resetProposalPresentation,
  type PresentationPage,
} from "@/server-actions/proposal-presentation";
import ProposalDeckThumbnail from "@/components/admin/ProposalDeckThumbnail";
import { useDiscountTimerLive } from "@/components/portal/DiscountCountdown";
import toast from "react-hot-toast";

const EASE = "ease-brand";

const switchClasses =
  "data-[state=checked]:bg-lyp-cherry data-[state=unchecked]:bg-[#EFE6E6]";

const typePill = (type: string | null) =>
  type === "service"
    ? "bg-[#EDF1F7] text-[#5B7394]"
    : "bg-[#F2EDED] text-[#6B5A5A]";

/** Discounts are stored as fractions (0.2), shown to staff as percentages. */
function toPercent(fraction: number | null): string {
  if (fraction == null) return "";
  return String(Math.round(fraction * 1000) / 10);
}

/**
 * Whether a scheduled discount has begun. Flips itself on at the start with a
 * single timeout rather than a ticking interval, and reads true when no start
 * is set — a discount with no start begins the moment the timer is switched on.
 */
function useDiscountStarted(startsAt: string | null) {
  const [started, setStarted] = useState(
    () => !startsAt || new Date(startsAt).getTime() <= Date.now(),
  );

  useEffect(() => {
    if (!startsAt) {
      setStarted(true);
      return;
    }

    const start = new Date(startsAt).getTime();
    if (Number.isNaN(start)) {
      setStarted(true);
      return;
    }

    // setTimeout overflows past ~24.8 days, so a far-off start re-checks in steps.
    let id: ReturnType<typeof setTimeout> | undefined;
    const check = () => {
      const left = start - Date.now();
      setStarted(left <= 0);
      if (left > 0) id = setTimeout(check, Math.min(left, 2 ** 31 - 1));
    };

    check();
    return () => clearTimeout(id);
  }, [startsAt]);

  return started;
}

/** Structural pages the portal needs; hiding them would break the flow. */
const LOCKED_SLUGS = ["cover", "summary", "signature", "payment", "intake"];

type Props = {
  proposalId: string;
  initialPages: PresentationPage[];
  /** The discount timer's state, so a discount that isn't reaching the client is called out. */
  timerActive: boolean;
  /** A scheduled start, before which the discount is not live yet. */
  timerStartsAt?: string | null;
  timerExpiresAt: string | null;
  /** Signed and superseded proposals kept the prices they were signed at. */
  pricesLocked?: boolean;
};

/**
 * The deck this client will actually see, in order, as live thumbnails.
 *
 * Each card is the real slide rendered small, so staff can read the deck at a
 * glance instead of guessing from section names. The show/hide switch and the
 * per-page discount live on the card, and both write straight through to this
 * proposal's overrides.
 *
 * The cards deliberately do NOT open the page editor: wording and images are
 * shared company content, so a click from inside one client's proposal must
 * never be able to rewrite the deck for everybody.
 */
export default function ProposalDeckOverview({
  proposalId,
  initialPages,
  timerActive,
  timerStartsAt = null,
  timerExpiresAt,
  pricesLocked = false,
}: Props) {
  // A discount only ever reaches the client while the timer is running, so a
  // discount set against a stopped or finished timer changes nothing — and
  // that has caught the team out before. Flag it loudly instead.
  const timerRunning = useDiscountTimerLive(timerActive, timerExpiresAt);
  const started = useDiscountStarted(timerStartsAt);
  const discountLive = timerRunning && started;
  const discountsIdle = !pricesLocked && !discountLive;

  const effectiveDiscount = (page: PresentationPage) =>
    page.overrideDiscountPct ?? page.globalDiscountPct ?? 0;
  const [pages, setPages] = useState(initialPages);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);

  const overrideCount = pages.filter(
    (p) => p.overrideVisible !== null || p.overrideDiscountPct !== null,
  ).length;

  function effectiveVisible(page: PresentationPage) {
    return page.overrideVisible ?? page.globalVisible;
  }

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
      {/* The count line that used to sit here is gone at the agency's
          request — "please remove the page count line". The list below says
          how many pages there are by being the list. */}
      <div className="mb-4 flex flex-wrap items-center justify-end gap-3">
        {overrideCount > 0 && (
          <button
            type="button"
            onClick={handleReset}
            disabled={resetting}
            className={`inline-flex items-center gap-2 rounded-full border border-[#EFE6E6] bg-lyp-white px-4 py-1.5 font-body text-[12px] font-semibold text-[#6B5A5A] transition-all duration-500 ${EASE} hover:border-lyp-cherry/25 hover:text-lyp-cherry active:scale-[0.985] disabled:opacity-40`}
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

      {/* Their wording, kept to the sentence they asked for: "in the section
          intro, please keep only the first part of the sentence." */}
      <p className="mb-4 rounded-2xl border border-[#F1E8E8] bg-[#FCFAFA] px-4 py-3 font-body text-[12px] leading-relaxed text-[#6B5A5A]">
        Here you choose which pages this client sees and tailor their
        discounts.
      </p>

      {discountsIdle && pages.some((p) => effectiveDiscount(p) > 0) && (
        <p className="mb-4 flex items-start gap-2.5 rounded-2xl border border-lyp-cherry/25 bg-lyp-cherry/[0.05] px-4 py-3 font-body text-[12.5px] leading-relaxed text-lyp-black">
          <AlertTriangle
            strokeWidth={1.75}
            className="mt-0.5 h-4 w-4 flex-shrink-0 text-lyp-cherry"
          />
          {/* Their wording, to the word: "in the discount warning banner,
              please keep only the highlighted part and remove the rest."
              The headline and the page tally are gone; what is left is the
              consequence and the switch that changes it. */}
          <span>
            Client sees full prices until{" "}
            <span className="font-semibold">
              {timerRunning && !started ? "the scheduled start" : "Activate Timer"}
            </span>{" "}
            {timerRunning && !started
              ? "is reached below."
              : "is switched on below."}{" "}
            When the countdown ends, prices go back to full.
          </span>
        </p>
      )}

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
              {/* ── Live slide — a preview, not a way in to the editor ── */}
              <div className="relative">
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
              </div>

              {/* ── Controls ── */}
              <div className="p-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3
                      className={`truncate font-body text-[13px] font-semibold ${
                        shown ? "text-lyp-black" : "text-[#9C8C8C]"
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
                      {discountsIdle && effectiveDiscount(page) > 0 && (
                        <span
                          title="The client sees full price until the discount window is running"
                          className="inline-flex items-center gap-1 rounded-full bg-[#FBF3E3] px-2 py-0.5 font-body text-[9px] font-medium uppercase tracking-[0.16em] text-[#9A7B2E]"
                        >
                          <AlertTriangle strokeWidth={1.75} className="h-2.5 w-2.5" />
                          Discount off
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-shrink-0 items-center gap-2">
                    {busyId === page.pageId && (
                      <Loader2
                        strokeWidth={1.5}
                        className="h-3.5 w-3.5 animate-spin text-[#9C8C8C]"
                      />
                    )}
                    {locked ? (
                      <span
                        title="The portal needs this page, so it always shows"
                        className="flex h-6 w-6 items-center justify-center rounded-full bg-[#F7F1F1]"
                      >
                        <Lock
                          strokeWidth={1.5}
                          className="h-3 w-3 text-[#867474]"
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
                    <span className="font-body text-[10px] font-medium uppercase tracking-[0.22em] text-[#867474]">
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
                        className={`w-16 rounded-xl border border-[#E4D6D6] bg-lyp-white px-2.5 py-1.5 text-right font-body text-[12.5px] tabular-nums text-lyp-black outline-none transition-all duration-500 ${EASE} placeholder:text-[#6F6060] hover:border-lyp-cherry/30 focus:border-lyp-cherry/40 focus:shadow-[0_0_0_4px_rgba(178,38,38,0.07)]`}
                      />
                      <span className="font-body text-[11px] text-[#6B5A5A]">
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

      <p className="mt-4 font-body text-[11px] leading-relaxed text-[#867474]">
        Thumbnails are the live slides with this client&rsquo;s own details.
        Cover, Summary, Signature, Payment and Onboarding always show — the
        portal needs them. Discounts left blank follow the service&rsquo;s
        standard rate.
      </p>
    </div>
  );
}
