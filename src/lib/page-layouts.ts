/**
 * THE FOUR SHAPES A CONTENT PAGE CAN TAKE.
 *
 * A page's layout used to be worked out from whichever blocks happened to be
 * on it. One `results` block turned the whole page into the results slide.
 * Images with almost no copy became a showcase. Adding a second paragraph
 * silently turned that back into the two column template.
 *
 * Nothing on screen said any of it, so adding one element changed the shape of
 * the page underneath them: "its quite confusing for the client to choose the
 * layout and content types".
 *
 * So the layout is now a choice. `pages.layout` holds it, and the rules below
 * are shared by the admin that offers them and the portal that draws them, so
 * the picker can never promise something the slide does not do.
 *
 * A page with no choice saved falls back to `inferPageLayout`, which is the
 * old guess exactly. Every page that already exists renders as it always has
 * until somebody actually picks something.
 */

export type PageLayout = "text_image" | "showcase" | "results" | "statement";

/** Every block type the editor knows about. */
export type BlockKind =
  | "heading"
  | "subheading"
  | "paragraph"
  | "list"
  | "image"
  | "logos"
  | "media_carousel"
  | "collage"
  | "results"
  | "offset_image"
  | "custom";

interface LayoutSpec {
  key: PageLayout;
  /** What the agency sees in the picker. */
  name: string;
  /** One line, in their words, not ours. */
  summary: string;
  /** The blocks this layout actually draws. Anything else is ignored. */
  blocks: BlockKind[];
  /** Whether the left and right image position setting does anything here. */
  usesImagePosition: boolean;
}

export const PAGE_LAYOUTS: LayoutSpec[] = [
  {
    key: "text_image",
    name: "Text and image",
    summary: "Words down one side, a picture down the other.",
    blocks: ["heading", "subheading", "paragraph", "list", "image"],
    usesImagePosition: true,
  },
  {
    key: "showcase",
    name: "Showcase",
    summary: "Big imagery across the page, with at most one line of text.",
    blocks: ["image", "logos", "media_carousel", "collage", "heading", "paragraph"],
    usesImagePosition: false,
  },
  {
    key: "results",
    name: "Client results",
    summary: "A grid of results, a phone mockup, and a strip of logos.",
    blocks: ["results", "logos", "offset_image", "heading", "paragraph"],
    usesImagePosition: false,
  },
  {
    key: "statement",
    name: "Statement",
    summary: "The title on its own, with nothing else on the page.",
    blocks: [],
    usesImagePosition: false,
  },
];

export function layoutSpec(layout: PageLayout): LayoutSpec {
  return PAGE_LAYOUTS.find((l) => l.key === layout) ?? PAGE_LAYOUTS[0];
}

/**
 * `custom` takes raw JSON and falls back to plain text.
 *
 * That is an escape hatch for us, not a choice to put in front of the agency,
 * so it is kept out of the picker while anything already using it still draws.
 */
export const HIDDEN_BLOCK_KINDS: BlockKind[] = ["custom"];

/**
 * Does this block draw anything on this layout?
 *
 * The editor greys out the rest rather than hiding them, because a page that
 * already carries one needs to say why it is doing nothing.
 */
export function blockDrawsOn(layout: PageLayout, kind: BlockKind): boolean {
  return layoutSpec(layout).blocks.includes(kind);
}

/**
 * The layout a page would have had before any of this existed.
 *
 * Lifted straight out of ContentPage so the fallback and the old behaviour
 * cannot drift apart. The order of the tests matters and is the order the
 * component used: a page with nothing on it is a statement before anything
 * else gets a say, and results beats showcase.
 */
export function inferPageLayout(input: {
  /** Every block on the page, in order. */
  kinds: BlockKind[];
  /** Whether a showcase would have anything to show. */
  hasShowcaseImagery: boolean;
}): PageLayout {
  const { kinds, hasShowcaseImagery } = input;

  if (kinds.length === 0) return "statement";
  if (kinds.includes("results")) return "results";

  const IMAGE_LIST: BlockKind[] = ["media_carousel", "collage", "logos", "image"];
  const SUBHEAD: BlockKind[] = ["heading", "paragraph"];

  const subheadCount = kinds.filter((k) => SUBHEAD.includes(k)).length;
  const bodyCount = kinds.filter(
    (k) => !IMAGE_LIST.includes(k) && !SUBHEAD.includes(k),
  ).length;

  // A showcase is imagery plus AT MOST one line of supporting copy. Without
  // the cap, a page built from headings and paragraphs plus a logos block was
  // classed as a showcase and had its whole article rendered as centred
  // subheading text.
  if (bodyCount === 0 && subheadCount <= 1 && hasShowcaseImagery) {
    return "showcase";
  }

  return "text_image";
}

/**
 * A SERVICE PAGE HAS ONE SHAPE, AND IT IS NOT ONE OF THE FOUR ABOVE.
 *
 * Attaching a service to a page swaps the whole renderer: `ServicePage` draws
 * it, not `ContentPage`, so none of the layouts above apply. That swap is what
 * the agency saw when a page changed shape between two screenshots, with
 * nothing saying it would.
 *
 * Its picture rail takes the featured image and every image block. Everything
 * else is drawn as text down the left, beside the inclusions and the price.
 */
export const SERVICE_PAGE_BLOCKS: BlockKind[] = [
  "heading",
  "subheading",
  "paragraph",
  "list",
  "results",
  "image",
  "logos",
  "media_carousel",
  "collage",
];

/**
 * `offset_image` only ever draws inside the Client results layout. Anywhere
 * else it renders nothing at all, which reads as broken rather than as a
 * block in the wrong place.
 */
export function blockDrawsOnServicePage(kind: BlockKind): boolean {
  return SERVICE_PAGE_BLOCKS.includes(kind);
}
