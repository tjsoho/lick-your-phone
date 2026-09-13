"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, RotateCcw, Pencil } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import {
  setProposalPageOverride,
  resetProposalPresentation,
  type PresentationPage,
} from "@/server-actions/proposal-presentation";
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

export default function ProposalPresentationEditor({
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

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="font-body text-[12px] text-[#8A7A7A]">
          {overrideCount === 0 ? (
            <>
              Following the standard deck. Changes here affect this proposal
              only.
            </>
          ) : (
            <>
              <span className="font-semibold text-lyp-cherry">
                {overrideCount} tailored
              </span>{" "}
              for this proposal. Everything else follows Content Pages.
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

      <div className="overflow-x-auto rounded-2xl border border-[#EFE6E6]">
        <table className="w-full min-w-[34rem] text-left font-body text-[12.5px]">
          <thead>
            <tr className="border-b border-[#F1E8E8] bg-[#FCFAFA]">
              <th className="px-4 py-2.5 font-body text-[9px] font-medium uppercase tracking-[0.2em] text-[#A89898]">
                Section
              </th>
              <th className="px-4 py-2.5 font-body text-[9px] font-medium uppercase tracking-[0.2em] text-[#A89898]">
                Discount
              </th>
              <th className="px-4 py-2.5 text-right font-body text-[9px] font-medium uppercase tracking-[0.2em] text-[#A89898]">
                Show
              </th>
              <th className="w-10 px-2 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {pages.map((page) => {
              const locked = !!page.slug && LOCKED_SLUGS.includes(page.slug);
              const shown = effectiveVisible(page);
              const tailored =
                page.overrideVisible !== null ||
                page.overrideDiscountPct !== null;

              return (
                <tr
                  key={page.pageId}
                  className={`border-b border-[#F7F1F1] last:border-0 transition-colors duration-500 ${EASE} ${
                    tailored ? "bg-lyp-cherry/[0.03]" : "hover:bg-[#FBF8F8]"
                  }`}
                >
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={
                          shown
                            ? "font-medium text-lyp-black"
                            : "text-[#C3B5B5] line-through"
                        }
                      >
                        {page.title ?? page.slug ?? "Untitled"}
                      </span>
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
                  </td>

                  <td className="px-4 py-3">
                    {page.type === "service" ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          defaultValue={toPercent(page.overrideDiscountPct)}
                          placeholder={toPercent(page.globalDiscountPct) || "0"}
                          onBlur={(e) => handleDiscount(page, e.target.value)}
                          aria-label={`Discount for ${page.title ?? "page"}`}
                          className={`w-16 rounded-xl border border-[#EFE6E6] bg-[#FBF8F8] px-2.5 py-1.5 text-right font-body text-[12.5px] tabular-nums text-lyp-black outline-none transition-all duration-500 ${EASE} placeholder:text-[#C3B5B5] focus:border-lyp-cherry/30 focus:bg-lyp-white focus:shadow-[0_0_0_4px_rgba(178,38,38,0.07)]`}
                        />
                        <span className="font-body text-[11px] text-[#A89898]">
                          %
                        </span>
                      </div>
                    ) : (
                      <span className="font-body text-[11px] text-[#C3B5B5]">
                        —
                      </span>
                    )}
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {busyId === page.pageId && (
                        <Loader2
                          strokeWidth={1.5}
                          className="h-3.5 w-3.5 animate-spin text-[#C3B5B5]"
                        />
                      )}
                      <Switch
                        checked={shown}
                        disabled={locked}
                        onCheckedChange={() => handleToggle(page)}
                        aria-label={`Show ${page.title ?? "page"} in this proposal`}
                        className={switchClasses}
                      />
                    </div>
                  </td>

                  <td className="px-2 py-3 text-right">
                    <Link
                      href={`/admin/pages/${page.pageId}`}
                      title="Edit this page's content"
                      aria-label={`Edit ${page.title ?? "page"}`}
                      className={`inline-flex rounded-full p-1.5 text-[#A89898] transition-colors duration-500 ${EASE} hover:text-lyp-cherry`}
                    >
                      <Pencil strokeWidth={1.5} className="h-3.5 w-3.5" />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-3 font-body text-[11px] leading-relaxed text-[#A89898]">
        Cover, Summary, Signature, Payment and Onboarding always show — the portal
        needs them. Discounts left blank follow the service&rsquo;s standard
        rate.
      </p>
    </div>
  );
}
