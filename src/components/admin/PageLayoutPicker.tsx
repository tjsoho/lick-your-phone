"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { LayoutTemplate, Check } from "lucide-react";
import { updatePage } from "@/server-actions/pages";
import {
  PAGE_LAYOUTS,
  SERVICE_PAGE_BLOCKS,
  blockDrawsOnServicePage,
  layoutSpec,
  type BlockKind,
  type PageLayout,
} from "@/lib/page-layouts";
import { cn } from "@/lib/utils";

const EASE = "ease-brand";

/**
 * PICK THE SHAPE OF THE PAGE, RATHER THAN HAVING IT GUESSED.
 *
 * The layout used to be worked out from whichever blocks happened to be on the
 * page. Adding a Client Results block turned the whole page into the results
 * slide. Adding a second paragraph turned a showcase back into the two column
 * template. Nothing said so, so the page changed shape under them and the only
 * way to find out was to look.
 *
 * So it is a choice now, in four plain words, and the card says which blocks
 * that choice actually draws. A page nobody has picked for still falls back to
 * the old guess, which is what the "working this out from the page" line is
 * telling them.
 */

/** What the agency calls each block, matching the block editor's own labels. */
const BLOCK_LABELS: Record<BlockKind, string> = {
  heading: "Heading",
  subheading: "Subheading",
  paragraph: "Paragraph",
  list: "List",
  image: "Image",
  logos: "Logos",
  media_carousel: "Media Carousel",
  collage: "Image Collage",
  results: "Client Results",
  offset_image: "Offset Image",
  custom: "Custom",
};

export function PageLayoutPicker({
  pageId,
  initialLayout,
  inferredLayout,
  blockKinds,
  isServicePage,
  onSaved,
}: {
  pageId: string;
  /** What the agency chose, or null where nobody has. */
  initialLayout: PageLayout | null;
  /** What the blocks on the page would have made it, before any choice. */
  inferredLayout: PageLayout;
  /** The blocks currently on the page, so we can say which are being ignored. */
  blockKinds: BlockKind[];
  /**
   * A page with a service attached is drawn by a different component
   * altogether, so none of the four layouts apply to it.
   */
  isServicePage: boolean;
  /**
   * Told when the layout has actually been written.
   *
   * The preview reads the layout when it loads rather than from the draft
   * that is posted to it as someone types, so it has to be sent round again
   * or it would keep showing the old shape.
   */
  onSaved?: () => void;
}) {
  const [layout, setLayout] = useState<PageLayout | null>(initialLayout);
  const [saving, setSaving] = useState(false);

  // A service page is drawn by ServicePage, not ContentPage, so there is no
  // layout to choose. Offering four that do nothing would be worse than
  // saying plainly that this one is fixed.
  if (isServicePage) {
    const notDrawn = [...new Set(blockKinds)].filter(
      (kind) => !blockDrawsOnServicePage(kind),
    );
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-lyp-cherry/[0.06] ring-1 ring-lyp-cherry/10">
            <LayoutTemplate
              strokeWidth={1.25}
              className="h-4 w-4 text-lyp-cherry"
            />
          </span>
          <h2 className="font-heading text-[16px] font-bold tracking-[-0.02em] text-lyp-black">
            Layout
          </h2>
          <span className="rounded-full bg-[#F7F1F1] px-2.5 py-1 font-body text-[10px] font-medium uppercase tracking-[0.14em] text-[#6B5A5A]">
            Service page
          </span>
        </div>
        <p className="font-body text-[12px] leading-relaxed text-[#6B5A5A]">
          A page with a service on it always looks the same: your words down
          the left beside what is included and the price, and the pictures down
          the right. There is nothing to choose here.
        </p>
        <p className="font-body text-[11.5px] leading-relaxed text-[#9C8C8C]">
          Blocks that show on this page:{" "}
          {SERVICE_PAGE_BLOCKS.map((b) => BLOCK_LABELS[b]).join(", ")}.
        </p>
        {notDrawn.length > 0 && (
          <p className="rounded-xl bg-[#FBF3E3] px-3.5 py-2.5 font-body text-[11.5px] leading-relaxed text-[#9A7B2E]">
            {notDrawn.length === 1 ? "This block is" : "These blocks are"} on
            the page but {notDrawn.length === 1 ? "draws" : "draw"} nothing
            here:{" "}
            <span className="font-semibold">
              {notDrawn.map((k) => BLOCK_LABELS[k]).join(", ")}
            </span>
            . Offset Image only shows on a Client results page.
          </p>
        )}
      </div>
    );
  }

  const active = layout ?? inferredLayout;
  const spec = layoutSpec(active);

  // Anything on the page that this layout does not draw. Saying so is the
  // whole point: a block that silently does nothing is what "I tried adding a
  // couple of elements and it looks a bit off" feels like from their side.
  const ignored = [...new Set(blockKinds)].filter(
    (kind) => !spec.blocks.includes(kind),
  );

  async function choose(next: PageLayout) {
    if (saving || next === layout) return;
    const previous = layout;
    setLayout(next);
    setSaving(true);
    const { error } = await updatePage(pageId, { layout: next });
    setSaving(false);
    if (error) {
      setLayout(previous);
      toast.error(error);
      return;
    }
    toast.success(`Layout set to ${layoutSpec(next).name}`);
    onSaved?.();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-lyp-cherry/[0.06] ring-1 ring-lyp-cherry/10">
          <LayoutTemplate strokeWidth={1.25} className="h-4 w-4 text-lyp-cherry" />
        </span>
        <h2 className="font-heading text-[16px] font-bold tracking-[-0.02em] text-lyp-black">
          Layout
        </h2>
        {layout === null && (
          <span className="rounded-full bg-[#FBF3E3] px-2.5 py-1 font-body text-[10px] font-medium uppercase tracking-[0.14em] text-[#9A7B2E]">
            Working this out from the page
          </span>
        )}
      </div>

      <p className="font-body text-[12px] text-[#6B5A5A]">
        {layout === null
          ? "Nobody has picked a layout for this page, so it takes its shape from the blocks on it. That means adding or removing one can change the whole page. Pick one to settle it."
          : "This page keeps this shape whatever is added to it."}
      </p>

      <div className="grid gap-2.5 sm:grid-cols-2">
        {PAGE_LAYOUTS.map((option) => {
          const chosen = active === option.key;
          return (
            <button
              key={option.key}
              type="button"
              onClick={() => choose(option.key)}
              disabled={saving}
              aria-pressed={chosen}
              className={cn(
                `rounded-xl border p-3.5 text-left transition-all duration-500 ${EASE} disabled:opacity-60`,
                chosen
                  ? "border-lyp-cherry/40 bg-lyp-cherry/[0.04]"
                  : "border-[#EFE6E6] bg-lyp-white hover:border-lyp-cherry/20",
              )}
            >
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border transition-colors duration-500",
                    chosen
                      ? "border-lyp-cherry bg-lyp-cherry text-lyp-white"
                      : "border-[#D4C6C6]",
                  )}
                >
                  {chosen && <Check strokeWidth={3} className="h-2.5 w-2.5" />}
                </span>
                <span className="font-heading text-[13px] font-bold tracking-[-0.01em] text-lyp-black">
                  {option.name}
                </span>
              </div>
              <p className="mt-1.5 font-body text-[11.5px] leading-relaxed text-[#6B5A5A]">
                {option.summary}
              </p>
              <p className="mt-2 font-body text-[10px] uppercase tracking-[0.14em] text-[#9C8C8C]">
                {option.blocks.length === 0
                  ? "No blocks"
                  : option.blocks.map((b) => BLOCK_LABELS[b]).join(", ")}
              </p>
            </button>
          );
        })}
      </div>

      {ignored.length > 0 && (
        <p className="rounded-xl bg-[#FBF3E3] px-3.5 py-2.5 font-body text-[11.5px] leading-relaxed text-[#9A7B2E]">
          {ignored.length === 1 ? "This block is" : "These blocks are"} on the
          page but {ignored.length === 1 ? "does" : "do"} not show on a{" "}
          {spec.name} page:{" "}
          <span className="font-semibold">
            {ignored.map((k) => BLOCK_LABELS[k]).join(", ")}
          </span>
          . Change the layout, or remove{" "}
          {ignored.length === 1 ? "it" : "them"}.
        </p>
      )}

      {!spec.usesImagePosition && (
        <p className="font-body text-[11.5px] leading-relaxed text-[#9C8C8C]">
          A {spec.name} page places its own imagery, so the left and right
          Image Position setting above does nothing here.
        </p>
      )}
    </div>
  );
}
