"use client";

import Image from "next/image";
import Logo from "@/components/Logo";
import { useProposal, type PageData } from "../ProposalContext";
import ContentBlockRenderer, {
  RHYTHM,
  IMAGE_RADIUS,
  MAIN_IMAGE,
  SIZES,
} from "./ContentBlockRenderer";
import Reveal, { STEP, revealDelay } from "../Reveal";
import PaymentPage from "./PaymentPage";
import SignaturePage from "./SignaturePage";

interface ContentPageProps {
  page: PageData;
}

export default function ContentPage({ page }: ContentPageProps) {
  const { proposal, pages, setCurrentPage } = useProposal();
  const slug = page.slug;

  if (slug === "cover") {
    return (
      <div className="mx-auto flex h-full w-full max-w-[1400px] flex-col justify-center overflow-y-auto px-6 py-12 sm:px-10 lg:px-16">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16">
          {/* Featured image — bare, no container, border or shadow */}
          {page.featuredImage && (
            <Image
              src={page.featuredImage}
              alt={page.title || "Proposal cover image"}
              sizes={SIZES.cover}
              className="portal-reveal portal-reveal-lift h-auto w-full max-h-[45vh] object-contain lg:max-h-[75vh]"
              style={{ animationDelay: `${revealDelay(0)}ms` }}
              width={800}
              height={600}
              priority
            />
          )}

          {/* Proposal info */}
          <div
            className={`text-center lg:text-left ${
              page.featuredImage ? "" : "lg:col-span-2 lg:text-center"
            }`}
          >
            {/* The cover is the proposal's handshake, so it is the one
                slide whose stagger is stretched: the mark lands, a beat, then
                the client's own name. */}
            <Reveal
              index={1}
              className={`mb-8 flex justify-center ${
                page.featuredImage ? "lg:justify-start" : ""
              }`}
            >
              <Logo onDark className="h-14 md:h-16" priority />
            </Reveal>

            <Reveal
              as="p"
              index={2}
              className="font-body text-sm text-lyp-white/60 mb-3 tracking-[0.3em] uppercase"
            >
              Proposal prepared for
            </Reveal>
            <Reveal
              as="h2"
              index={3}
              className="font-heading text-4xl md:text-5xl text-lyp-white mb-2"
            >
              {proposal.clientName}
            </Reveal>
            <Reveal
              as="p"
              index={4}
              className="font-body text-xl text-lyp-white/50"
            >
              {proposal.venueName}
            </Reveal>

            {proposal.status === "signed" && (
              <Reveal
                index={5}
                className={`mt-8 flex flex-col items-center gap-3 ${
                  page.featuredImage ? "lg:items-start" : ""
                }`}
              >
                <span className="inline-flex items-center gap-2 rounded-full bg-green-500/15 px-4 py-1.5 font-body text-sm text-green-400 ring-1 ring-green-500/30">
                  <span className="h-2 w-2 rounded-full bg-green-400" />
                  Proposal signed
                </span>
                <button
                  onClick={() => {
                    const idx = pages.findIndex((p) => p.slug === "summary");
                    if (idx !== -1) setCurrentPage(idx);
                  }}
                  className="rounded-lg bg-lyp-cherry px-6 py-2.5 font-body text-sm font-semibold text-lyp-white transition-[background-color,transform] duration-300 ease-brand hover:bg-lyp-cherry/90 active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100"
                >
                  View Summary
                </button>
              </Reveal>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (slug === "signature") return <SignaturePage />;
  if (slug === "payment") return <PaymentPage />;
  // if (slug === "intake") return <IntakeFormWrapper />
  if (slug === "summary") return null;

  // `offset_image` blocks are layout data for the image column, not body copy.
  // They are pulled out here so they neither render in the text flow nor make
  // an otherwise heading-only page look like it has content.
  const textBlocks = page.contentBlocks.filter((b) => b.type !== "offset_image");

  // The image column shows the page's featured image; an `offset_image` block
  // contributes the second image that sits over it. Order is deliberate:
  // featured image first (behind, higher), offset image second (in front,
  // lower). One image on its own falls back to the plain featured-image card
  // that every other page uses, so nothing changes for pages without the block.
  const columnImages = [
    ...(page.featuredImage
      ? [{ url: page.featuredImage, alt: page.title || "Page illustration" }]
      : []),
    ...page.contentBlocks
      .filter((b) => b.type === "offset_image" && Array.isArray(b.content))
      .flatMap((b) => b.content as { url: string; alt: string }[]),
  ]
    .filter((img) => img?.url)
    .slice(0, 2);

  // A "showcase" page carries only imagery — device mockups and a press-logo
  // strip — with no body copy. It gets a full-width composition rather than the
  // two-column text/image template, which would strand the images in a narrow
  // column. Detection is by content shape, not by slug, so any page built this
  // way in the admin gets the treatment.
  const IMAGE_LIST_TYPES = ["media_carousel", "collage", "logos", "image"];
  const imageListBlocks = textBlocks.filter(
    (b) => b.type && IMAGE_LIST_TYPES.includes(b.type),
  );
  // A heading or paragraph on an otherwise image-only page reads as a
  // subheading under the title, not as body copy, so it does not disqualify
  // the page from the showcase layout.
  const SUBHEAD_TYPES = ["heading", "paragraph"];
  const subheadBlocks = textBlocks.filter(
    (b) => b.type && SUBHEAD_TYPES.includes(b.type),
  );
  const bodyBlocks = textBlocks.filter(
    (b) =>
      !(b.type && IMAGE_LIST_TYPES.includes(b.type)) &&
      !(b.type && SUBHEAD_TYPES.includes(b.type)),
  );

  const asImages = (types: string[]) =>
    imageListBlocks
      .filter((b) => b.type && types.includes(b.type) && Array.isArray(b.content))
      .flatMap((b) => b.content as { url: string; alt: string }[])
      .filter((img) => img?.url);

  // A single `image` block stores a bare URL string rather than an array.
  const singleImages = imageListBlocks
    .filter((b) => b.type === "image" && typeof b.content === "string")
    .map((b) => ({ url: b.content as string, alt: "" }))
    .filter((img) => img.url.trim());

  // The featured image leads the row; image blocks follow in their own order,
  // which the admin's up/down arrows control. Move the featured image into an
  // `image` block if you need it anywhere other than first.
  const showcaseImages = [
    ...(page.featuredImage
      ? [{ url: page.featuredImage, alt: page.title || "" }]
      : []),
    ...asImages(["media_carousel", "collage"]),
    ...singleImages,
  ];
  const showcaseLogos = asImages(["logos"]);

  // A `results` block turns the page into the client-results slide: a title
  // top-left, a two-across grid of results down the left, the device mockup on
  // the right (the featured image, or the offset pair if the page also has an
  // `offset_image` block), and a full-bleed banner along the bottom built from
  // a `logos` block plus the page's heading/paragraph text. Detection is by
  // content shape, not by slug, and no other page uses the block, so no
  // existing page changes behaviour.
  const resultsBlocks = textBlocks.filter((b) => b.type === "results");
  const isResults = resultsBlocks.length > 0;

  // Note the branch order below: a page with NO blocks at all is a statement
  // slide and is handled before this, even though a featured image alone would
  // otherwise satisfy the showcase test. Showcase is for pages that carry image
  // BLOCKS — a device row, a press strip — not for a lone featured image.
  // A showcase is imagery plus AT MOST one line of supporting copy. Without the
  // subhead cap, any page built only from headings/paragraphs plus a logos
  // block — `who-we-are`, which has five blocks of real body copy — was
  // classed as a showcase and had its whole article rendered as centred
  // subheading text.
  const isShowcase =
    bodyBlocks.length === 0 &&
    subheadBlocks.length <= 1 &&
    (showcaseImages.length > 0 || showcaseLogos.length > 0);

  const hasBlocks = textBlocks.length > 0;
  const hasImage = columnImages.length > 0;
  const imageFirst = page.imagePosition === "left";

  const featuredImage =
    columnImages.length >= 2 ? (
      // Two overlapping device mockups. The boxes are laid out as percentages
      // of a fixed-aspect stage so the composition holds at every width, and
      // object-contain means any source aspect ratio lands intact inside its
      // box rather than being cropped.
      <div className="relative mx-auto aspect-[3/4] w-full max-w-[20rem] lg:max-w-[24rem]">
        {/* The pair arrives as a pair — back mockup first, front one a beat
            later, so the overlap reads as depth rather than as one flat plate. */}
        <Reveal
          variant="lift"
          index={2}
          className="absolute left-0 top-0 h-[82%] w-[62%]"
        >
          <Image
            src={columnImages[0].url}
            alt={columnImages[0].alt || "Page illustration"}
            sizes={SIZES.offsetPair}
            className={`mx-auto h-full w-auto max-w-full object-contain object-top ${IMAGE_RADIUS}`}
            width={600}
            height={1200}
          />
        </Reveal>
        <Reveal
          variant="lift"
          index={3}
          className="absolute bottom-0 right-0 h-[82%] w-[62%]"
        >
          <Image
            src={columnImages[1].url}
            alt={columnImages[1].alt || "Page illustration"}
            sizes={SIZES.offsetPair}
            className={`mx-auto h-full w-auto max-w-full object-contain object-bottom ${IMAGE_RADIUS}`}
            width={600}
            height={1200}
          />
        </Reveal>
      </div>
    ) : hasImage ? (
      <Image
        src={columnImages[0].url}
        alt={columnImages[0].alt || "Page illustration"}
        // The same size as the service-page picture rail and the statement
        // slide — see `MAIN_IMAGE`. No container, border or shadow, and
        // object-contain so the image is never cropped. Whichever column is
        // taller still sets the grid row height, so a picture this size only
        // pushes the text down on a page whose copy is shorter than it.
        sizes={SIZES.main}
        className={`portal-reveal portal-reveal-lift mx-auto ${MAIN_IMAGE}`}
        style={{ animationDelay: `${revealDelay(2)}ms` }}
        width={800}
        height={600}
      />
    ) : null;

  if (isResults) {
    // The bottom band is built from ordinary blocks so it stays editable in the
    // admin: the first image of the `logos` block is the brand mark, and the
    // `heading`/`paragraph` blocks are the tagline beside it. Nothing is
    // dropped — every text block on the page renders as a line of the tagline.
    const bannerMark = showcaseLogos[0];
    const bannerLines = subheadBlocks
      .map((b) => (typeof b.content === "string" ? b.content : String(b.content ?? "")))
      .filter((line) => line.trim());
    const hasBanner = Boolean(bannerMark) || bannerLines.length > 0;

    return (
      // No max-width on this element. The scroll column is full-bleed now, so
      // the banner below simply inherits the viewport width from `w-full`;
      // the cap is applied to the content row only. No w-screen/left-1/2
      // translate hacks, which `.portal-scroll`'s overflow would clip.
      // `min-h-full`, not `h-full`: on desktop the flex child still fills the
      // viewport slide, but on a phone the column grows with its content
      // instead of overflowing the fixed box and letting the device images
      // spill over the banner.
      <div className="flex min-h-full w-full flex-col">
        <div className="flex min-h-0 flex-1 flex-col justify-center px-6 py-6 md:px-10 lg:px-14 [@media(min-height:850px)]:py-8">
          <div className="mx-auto w-full max-w-[1400px]">
            {page.title && (
              <Reveal
                as="h1"
                index={0}
                className="font-heading text-4xl uppercase leading-[1.02] tracking-tight text-lyp-white md:text-5xl xl:text-6xl"
              >
                {page.title}
              </Reveal>
            )}

            {/* 62/38 split. Fractional track sizes rather than col-spans so the
                ratio is exact, and minmax(0,…) so a long line of result copy
                cannot push the grid wider than its container.
                `lg:items-center` levels the two columns against each other —
                the same treatment the generic content page uses. Whichever
                column is taller still sets the row height, so this is
                alignment only and nothing is ever clipped. The page title sits
                ABOVE the pair rather than inside the left column: it reads as
                the slide's heading, and centring the columns against each
                other only works if the title is not padding one of them. */}
            <div
              className={`grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,62fr)_minmax(0,38fr)] lg:items-center lg:gap-10 ${
                page.title ? "mt-6 lg:mt-8" : ""
              }`}
            >
              <div>
                <ContentBlockRenderer
                  blocks={resultsBlocks}
                  revealFrom={revealDelay(1)}
                />
              </div>

              {columnImages.length > 0 && (
                // The device column gets a definite height from `lg` up, so it
                // can be centred against the results grid rather than
                // stretching to it. The cap is viewport-relative, never a fixed
                // rem: 56vh is the largest the mockup can be while the title,
                // the eight results and the bottom banner still fit a 720px
                // laptop unscrolled, and it grows with the window from there.
                // Below `lg` the columns stack and the image is sized by width.
                <div className="flex items-center justify-center lg:h-[56vh]">
                  {columnImages.length >= 2 ? (
                    <div className="relative mx-auto aspect-[3/4] w-full max-w-[17rem] lg:h-full lg:w-auto lg:max-w-full">
                      <Reveal
                        variant="lift"
                        index={2}
                        className="absolute left-0 top-0 h-[82%] w-[62%]"
                      >
                        <Image
                          src={columnImages[0].url}
                          alt={columnImages[0].alt || "Page illustration"}
                          sizes={SIZES.offsetPair}
                          className={`mx-auto h-full w-auto max-w-full object-contain object-top ${IMAGE_RADIUS}`}
                          width={600}
                          height={1200}
                        />
                      </Reveal>
                      <Reveal
                        variant="lift"
                        index={3}
                        className="absolute bottom-0 right-0 h-[82%] w-[62%]"
                      >
                        <Image
                          src={columnImages[1].url}
                          alt={columnImages[1].alt || "Page illustration"}
                          sizes={SIZES.offsetPair}
                          className={`mx-auto h-full w-auto max-w-full object-contain object-bottom ${IMAGE_RADIUS}`}
                          width={600}
                          height={1200}
                        />
                      </Reveal>
                    </div>
                  ) : (
                    <Image
                      src={columnImages[0].url}
                      alt={columnImages[0].alt || "Page illustration"}
                      // h-auto + w-auto + a max-height: the box tracks the
                      // photo exactly, so the radius lands on the artwork and
                      // never on letterbox space. No plate, border or shadow.
                      sizes={SIZES.resultsDevice}
                      className={`portal-reveal portal-reveal-lift mx-auto h-auto max-h-[50vh] w-auto max-w-full object-contain lg:max-h-full ${IMAGE_RADIUS}`}
                      style={{ animationDelay: `${revealDelay(2)}ms` }}
                      width={600}
                      height={1200}
                    />
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {hasBanner && (
          // Full viewport width: this element is a direct child of the scroll
          // column, which is no longer capped, so `w-full` IS the viewport.
          <Reveal
            variant="fade"
            delay={revealDelay(6)}
            className="w-full bg-lyp-black px-6 md:px-10 lg:px-14"
          >
            {/* Padding outside the cap, cap inside — the same order as the
                content above, so the mark's left edge lines up exactly with
                the first column of result logos at every width. */}
            <div className="mx-auto flex max-w-[1400px] items-center gap-4 py-4 md:gap-6">
              {bannerMark && (
                <Image
                  src={bannerMark.url}
                  alt={bannerMark.alt || "LickYourPhone"}
                  sizes={SIZES.bannerMark}
                  // Square source in, circle out: w-auto keeps the box on the
                  // artwork so the radius lands on the mark, not on letterbox.
                  className="h-12 w-auto max-w-full flex-shrink-0 rounded-full object-contain md:h-14 [@media(min-height:850px)]:h-16"
                  width={240}
                  height={240}
                />
              )}
              {bannerLines.length > 0 && (
                <div className="min-w-0">
                  {bannerLines.map((line, i) => (
                    <p
                      key={i}
                      className="font-heading text-xl font-light leading-tight text-lyp-white md:text-2xl lg:text-3xl"
                    >
                      {line}
                    </p>
                  ))}
                </div>
              )}
            </div>
          </Reveal>
        )}
      </div>
    );
  }

  // Pages with no content blocks are statement slides in the proposal flow, not
  // broken two-column pages: one large image with the page title beneath it,
  // centred as a single composition. Nothing else — no rule, no body copy —
  // which is what makes the pairing read as deliberate rather than sparse.
  if (!hasBlocks) {
    // The image carries the slide here, so it is sized far larger than the
    // one in the two-column layout. The cap is viewport-relative on purpose:
    // it grows with the window, and it steps down on short viewports so a
    // two-line display title still fits a 720px laptop without scrolling.
    const statementImage =
      columnImages.length >= 2 ? (
        featuredImage
      ) : columnImages.length === 1 ? (
        <Image
          src={columnImages[0].url}
          alt={columnImages[0].alt || page.title || "Page illustration"}
          // The one main-image size, shared with the service-page picture rail
          // and the two-column featured image — see `MAIN_IMAGE`. The radius is
          // kept for photographic sources; on artwork that is already a circle
          // on a transparent square it simply has nothing to round, which is
          // harmless.
          sizes={SIZES.statement}
          className={`portal-reveal portal-reveal-lift mx-auto ${MAIN_IMAGE}`}
          style={{ animationDelay: `${revealDelay(0)}ms` }}
          width={1200}
          height={1200}
          priority
        />
      ) : null;

    return (
      // min-h-full rather than h-full: the slide fills the viewport on desktop
      // but grows instead of clipping if a phone cannot fit the composition.
      <div className="mx-auto flex min-h-full w-full max-w-[1400px] flex-col items-center justify-center px-8 py-8 text-center md:px-16 [@media(min-height:850px)]:py-10">
        {statementImage}
        {page.title && (
          // The statement slide is the one place the title follows the image
          // rather than leading it: the picture is the statement, the words
          // are the caption, and the order they arrive in says so.
          <Reveal
            as="h1"
            index={2}
            className={`mx-auto max-w-[16ch] text-balance font-heading text-5xl uppercase leading-[0.95] tracking-tight text-lyp-white md:text-7xl ${
              statementImage ? "mt-8 [@media(min-height:850px)]:mt-10" : ""
            }`}
          >
            {page.title}
          </Reveal>
        )}
        {/* Title-only pages (a service page reached without its service in the
            proposal) keep the cherry rule: on its own a lone centred title
            reads like a page that failed to load, and the rule gives it
            intent. With an image above, the image is the intent. */}
        {!statementImage && (
          <div
            className="portal-reveal portal-reveal-rule mx-auto mt-8 h-[3px] w-16 rounded-full bg-lyp-cherry"
            style={{ animationDelay: `${revealDelay(3)}ms` }}
          />
        )}
      </div>
    );
  }

  if (isShowcase) {
    return (
      <div className="flex h-full flex-col overflow-y-auto">
        <div className="flex flex-1 flex-col justify-center px-6 pt-10 pb-8 md:px-12 lg:px-16">
          <div className="mx-auto flex w-full max-w-[1400px] flex-col items-center">
          {page.title && (
            <Reveal
              as="h1"
              index={0}
              className="text-center font-heading text-4xl md:text-6xl leading-[1.02] text-lyp-white uppercase tracking-tight"
            >
              {page.title}
            </Reveal>
          )}

          {subheadBlocks.length > 0 && (
            <div className="mt-2 max-w-[46rem] space-y-2 text-center">
              {subheadBlocks.map((b, i) => (
                <Reveal
                  as="p"
                  key={b.id}
                  index={1 + i}
                  className="font-body text-base leading-relaxed text-lyp-white/70 md:text-lg"
                >
                  {typeof b.content === "string"
                    ? b.content
                    : String(b.content ?? "")}
                </Reveal>
              ))}
            </div>
          )}

          {/* Device mockups. Sized by height so portrait phones and a landscape
              tablet sit on a common baseline instead of on a common width. */}
          {showcaseImages.length > 0 && (
            <div
              // One grid column per image so the row never wraps. Percentage
              // widths plus gaps always exceeded 100% and pushed the third
              // device onto a second row.
              style={{
                gridTemplateColumns: `repeat(${showcaseImages.length}, minmax(0, 1fr))`,
              }}
              className={`grid w-full items-center gap-4 md:gap-6 lg:gap-8 ${
                page.title || subheadBlocks.length > 0 ? "mt-10" : ""
              }`}
            >
              {/* The device row deals itself out left to right. */}
              {showcaseImages.map((img, i) => (
                <Image
                  key={`${img.url}-${i}`}
                  src={img.url}
                  alt={img.alt || ""}
                  // One grid column each inside a capped 1400px row, so the
                  // render width is a clean fraction of the page.
                  sizes={`(min-width: 1024px) ${Math.round(
                    1300 / showcaseImages.length,
                  )}px, ${Math.round(92 / showcaseImages.length)}vw`}
                  style={{ animationDelay: `${revealDelay(2) + i * STEP}ms` }}
                  width={900}
                  height={1600}
                  priority={i === 0}
                  // object-contain inside a fixed column: mixed device aspects
                  // (portrait phones beside a landscape tablet) share a common
                  // height and nothing is ever cropped.
                  className="portal-reveal portal-reveal-lift mx-auto h-auto max-h-[46vh] w-full object-contain lg:max-h-[60vh]"
                />
              ))}
            </div>
          )}

          {/* Press strip. Capped by height so wildly different logo artwork
              still reads as one even row. */}
          </div>
        </div>

        {/* Press banner. The page sits inside a max-w-[1400px] scroll column, so
            the band breaks out to the full viewport width. The logo artwork has
            an opaque black background baked in (verified: rgba(0,0,0,255) in
            every corner), which is exactly why a true-black banner is the right
            backing — the artwork edges disappear into it. */}
        {showcaseLogos.length > 0 && (
          <Reveal
            variant="fade"
            delay={revealDelay(2) + showcaseImages.length * STEP + 120}
            className="w-full bg-black"
          >
            <div className="mx-auto flex max-w-[100rem] flex-wrap items-center justify-center gap-x-10 gap-y-4 px-6 md:gap-x-16 md:px-10">
              {showcaseLogos.map((logo, i) => (
                <Image
                  key={`${logo.url}-${i}`}
                  src={logo.url}
                  alt={logo.alt || ""}
                  sizes={SIZES.pressLogo}
                  width={600}
                  height={240}
                  className="h-14 w-auto object-contain md:h-20"
                />
              ))}
            </div>
          </Reveal>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-full w-full max-w-[1400px] flex-col overflow-y-auto">
      <div className="flex-1 flex flex-col justify-center px-8 pt-8 pb-12 md:px-14 lg:px-20 lg:pt-6 lg:pb-8">
        {/* lg:items-center centres the featured image against the text column.
            The title lives INSIDE the text column, so title, subheadings,
            paragraphs and list items all share one left edge — including on the
            pages whose image sits on the left. Alignment only: the taller
            column still sets the row height, so nothing is ever clipped. */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-12 lg:items-center">
          {/* The text column is first in the DOM so that stacked mobile pages
              always lead with the page title, whichever side the image takes on
              desktop; lg:order-* then places the image left or right. */}
          <div
            className={`${imageFirst ? "lg:order-2" : "lg:order-1"} ${
              hasImage ? "lg:col-span-7" : "lg:col-span-12"
            }`}
          >
            {page.title && (
              // max-w-[18ch] is a font-relative measure, so it scales with the
              // responsive heading size. Titles up to ~19 characters
              // ("Complimentary Visit") stay on one line; longer ones
              // ("Marketing Growth Strategy") break over two without any manual
              // line break. No current page title needs three lines.
              <Reveal
                as="h1"
                index={0}
                className="max-w-[18ch] font-heading text-4xl md:text-6xl leading-[1.02] text-lyp-white text-balance uppercase tracking-tight"
              >
                {page.title}
              </Reveal>
            )}
            <ContentBlockRenderer
              blocks={textBlocks}
              leadingGap={page.title ? RHYTHM.section : ""}
              revealFrom={revealDelay(page.title ? 1 : 0)}
            />
          </div>

          {hasImage && (
            <div
              className={`${imageFirst ? "lg:order-1" : "lg:order-2"} lg:col-span-5`}
            >
              {featuredImage}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
