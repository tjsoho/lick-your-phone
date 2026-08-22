import Image from "next/image";
import type { ReactNode } from "react";
import { ContentBlock } from "../ProposalContext";
import MediaCarousel from "./MediaCarousel";

/** One radius for every content image, so nothing looks half-styled. */
export const IMAGE_RADIUS = "rounded-xl";

/**
 * The height a page's MAIN SINGLE IMAGE is drawn at — the service-page picture
 * rail, the statement slide, and the featured image in the two-column content
 * layout all use it, so the picture does not change size as you flick through
 * the proposal. One definition, so the templates cannot drift apart again.
 *
 * Height-driven, not `h-auto` + a max-height: the optimiser hands most of these
 * sources back at ~300px tall (a 2x srcset candidate of a ~620px original), so
 * an auto box renders them at natural size, a cap never binds, and the picture
 * sits small in a slide with room to spare. Stating the height lets it run to
 * the size the composition wants, and `w-auto` means the width follows the
 * aspect ratio, so the box still shrink-wraps the photo and the radius lands on
 * the picture rather than on letterbox space.
 */
export const MAIN_IMAGE_HEIGHT =
  "h-[58vh] [@media(min-height:850px)]:h-[56vh] max-lg:h-[40vh]";

/**
 * `MAIN_IMAGE_HEIGHT` plus the rules every image on a content page obeys:
 * shrink-wrapped box, never cropped, radius on the photo. No plate, no border,
 * no shadow.
 */
export const MAIN_IMAGE = `${MAIN_IMAGE_HEIGHT} w-auto max-w-full object-contain ${IMAGE_RADIUS}`;

/**
 * The single vertical spacing scale for a content page's text column.
 *
 * Hierarchy comes from spacing, not just type size: the gap ABOVE a section
 * heading is large and the gap BELOW it is tight, so a heading visibly groups
 * with the content it introduces instead of floating between two blocks.
 *
 * Every gap on a content page comes from this object — including the one under
 * the page <h1>, which ContentPage passes back in as `leadingGap`. No block
 * carries its own ad-hoc margin, so nothing can double up.
 */
export const RHYTHM = {
  /** Above a section heading, and under the page title. */
  section: "mt-10",
  /** Directly under a heading — binds it to what it introduces. */
  grouped: "mt-3",
  /** Between sibling body blocks. */
  block: "mt-6",
} as const;

/** Comfortable measure for running copy (~70 characters per line). */
const MEASURE = "max-w-[70ch]";

function renderBlock(block: ContentBlock): ReactNode {
  if (block.type === "heading") {
    return (
      <h2 className="font-heading text-2xl md:text-3xl text-lyp-white uppercase tracking-wide">
        {String(block.content ?? "")}
      </h2>
    );
  }

  if (block.type === "paragraph") {
    return (
      <p
        className={`font-body text-base text-lyp-white/85 leading-relaxed ${MEASURE}`}
      >
        {String(block.content ?? "")}
      </p>
    );
  }

  if (block.type === "list" && Array.isArray(block.content)) {
    return (
      <ul className={`space-y-2 ${MEASURE}`}>
        {(block.content as string[]).map((item, i) => (
          <li
            key={i}
            className="flex items-start gap-3 font-body text-base text-lyp-white/85"
          >
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-lyp-cherry" />
            {item}
          </li>
        ))}
      </ul>
    );
  }

  if (block.type === "logos" && Array.isArray(block.content)) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        {(block.content as { url: string; alt: string }[])
          .filter((logo) => logo?.url)
          .map((logo, i) => (
            <Image
              key={i}
              src={logo.url}
              alt={logo.alt || "Logo"}
              className="h-16 w-auto object-contain opacity-80 hover:opacity-100 transition-opacity"
              width={200}
              height={64}
            />
          ))}
      </div>
    );
  }

  if (block.type === "collage" && Array.isArray(block.content)) {
    const images = (block.content as { url: string; alt: string }[]).filter(
      (img) => img?.url,
    );
    if (images.length === 0) return null;

    return (
      // Tight, left-aligned row. flex-1 lets the tiles grow to fill the column
      // instead of sitting at a small fixed size, capped so they stay sensible
      // on a wide column.
      <div className="flex justify-start gap-2">
        {images.map((img, i) => (
          <div key={i} className="aspect-square max-w-[10rem] flex-1">
            <Image
              src={img.url}
              alt={img.alt || "Team photo"}
              // NOTE: object-cover, and the radius is on the image itself
              // rather than a wrapper. These sources are 2:3 portrait, so
              // contain would letterbox them inside the square and the rounded
              // corners would land on empty space instead of the photo.
              className={`h-full w-full object-cover transition-transform duration-500 ease-brand hover:scale-105 ${IMAGE_RADIUS}`}
              width={480}
              height={480}
            />
          </div>
        ))}
      </div>
    );
  }

  if (block.type === "results" && Array.isArray(block.content)) {
    const results = (
      block.content as { url: string; alt: string; text: string }[]
    ).filter((r) => r?.url || r?.text);
    if (results.length === 0) return null;

    return (
      // Two across from `sm` up, one on mobile, for any number of items — eight
      // items therefore read as the 2 x 4 block the design calls for.
      // The row gap and the logo size below step up only when the viewport is
      // tall enough to spend the pixels: eight items plus a title, a device
      // pair and the bottom banner have to fit a 720px-tall laptop unscrolled.
      <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2 lg:gap-x-8 [@media(min-height:850px)]:gap-y-6">
        {results.map((result, i) => (
          <div key={i} className="flex items-start gap-4 lg:gap-5">
            {result.url && (
              // THE ONE PERMITTED object-cover ON A CONTENT IMAGE. The client
              // marks are meant to FILL a circle, so a non-square source has to
              // be cropped to the circle rather than letterboxed inside it —
              // contain would leave the rounded edge sitting on empty space.
              // The radius is on the image element itself; there is no plate,
              // ring or shadow behind it.
              <Image
                src={result.url}
                alt={result.alt || "Client logo"}
                className="h-16 w-16 flex-shrink-0 rounded-full object-cover [@media(min-height:850px)]:h-20 [@media(min-height:850px)]:w-20"
                width={160}
                height={160}
              />
            )}
            <div className="min-w-0 pt-0.5">
              <p className="font-heading text-[11px] font-bold uppercase tracking-[0.2em] text-lyp-white lg:text-xs">
                Results
              </p>
              {result.text && (
                <p className="mt-1 font-body text-[13px] leading-snug text-lyp-white/80 lg:text-sm lg:leading-snug">
                  {result.text}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Consumed by ContentPage, which lifts it into the image column and pairs it
  // with the page's featured image. Never drawn inline.
  if (block.type === "offset_image") return null;

  if (block.type === "media_carousel" && Array.isArray(block.content)) {
    return <MediaCarousel items={block.content as { url: string; alt: string }[]} />;
  }

  if (block.type === "image" && typeof block.content === "string") {
    return (
      <div className={`overflow-hidden ${IMAGE_RADIUS}`}>
        <Image
          src={block.content}
          alt="Content image"
          className="mx-auto h-auto max-h-[60vh] w-full object-contain"
          width={800}
          height={600}
        />
      </div>
    );
  }

  return (
    <div className={`font-body text-base text-lyp-white/60 ${MEASURE}`}>
      {JSON.stringify(block.content)}
    </div>
  );
}

export default function ContentBlockRenderer({
  blocks,
  leadingGap = "",
}: {
  blocks: ContentBlock[];
  /**
   * Gap applied above the first block. ContentPage passes RHYTHM.section when
   * a page title sits directly above the stack, so the title-to-body gap comes
   * from the same scale as every other gap.
   */
  leadingGap?: string;
}) {
  // `offset_image` is layout data for the page's image column, not a block in
  // the text flow. Dropping it here (rather than rendering null) keeps it from
  // leaving an empty rhythm gap behind on any page that stacks blocks.
  const sorted = blocks
    .filter((b) => b.type !== "offset_image")
    .sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));

  return (
    <div>
      {sorted.map((block, i) => {
        const previous = i > 0 ? sorted[i - 1] : null;
        const gap =
          i === 0
            ? leadingGap
            : block.type === "heading"
              ? RHYTHM.section
              : previous?.type === "heading"
                ? RHYTHM.grouped
                : RHYTHM.block;

        return (
          <div key={block.id} className={gap}>
            {renderBlock(block)}
          </div>
        );
      })}
    </div>
  );
}
