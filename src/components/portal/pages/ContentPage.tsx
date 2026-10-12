"use client";

import Image from "next/image";
import Logo from "@/components/Logo";
import { resolveCoverLogo } from "@/lib/client-logo";
import { useCopy, useProposal, type PageData } from "../ProposalContext";
import ContentBlockRenderer, {
  RHYTHM,
  IMAGE_RADIUS,
  IMAGE_RADIUS_LARGE,
  MAIN_IMAGE,
  SIZES,
} from "./ContentBlockRenderer";
import Reveal, { STEP, revealDelay } from "../Reveal";
import PaymentPage from "./PaymentPage";
import SignaturePage from "./SignaturePage";

interface ContentPageProps {
  page: PageData;
}

/* The cover's post-signature wording. Fixed, not editable: both only appear
   on a signed proposal, and the page editor always previews a draft, so the
   fields could never show their effect. Same words as before. */
const SIGNED_BADGE = "Signed";
const VIEW_SUMMARY_BUTTON = "View Summary";

export default function ContentPage({ page }: ContentPageProps) {
  const { proposal, pages, setCurrentPage } = useProposal();
  // Called before the slug branches below so the hook order never changes.
  const tCover = useCopy("cover", page);
  const tResults = useCopy("results", page);
  // The trusted-by label is one wording for the whole portal, so it lives in
  // the global set rather than being retyped on every page that shows logos.
  const tGlobal = useCopy("global");
  const slug = page.slug;
  // Read unconditionally so the cover branch below has it; cheap and keeps
  // the precedence rule resolved in exactly one call.
  const coverLogo = resolveCoverLogo(
    proposal.venueLogoUrl,
    proposal.clientLogoUrl,
    tCover("logo"),
  );

  if (slug === "cover") {
    /* THE HANDSHAKE, BUILT LIKE THEIR OWN DECK.
       "First page: needs to look exactly like the pandadoc one." That cover
       is a lockup: the lips mark, a small x, the client's own mark, and the
       line underneath. So the proposal opens the same way, and the client
       sees their badge beside the agency's before they read a word.

       The x only appears when there are two marks to put it between. A
       client with no logo of their own gets the lips mark alone and centred
       rather than an orphaned multiplication sign. */
    const strapline = tCover("strapline").trim();
    const hasClientMark = coverLogo.isCustomLogo;

    return (
      <div className="mx-auto flex h-full w-full max-w-[1400px] flex-col items-center justify-center overflow-y-auto px-6 py-10 text-center sm:px-10">
        {/* The lockup */}
        <Reveal
          index={1}
          className="flex items-center justify-center gap-6 md:gap-10"
        >
          <Logo
            variant="mark"
            priority
            className="h-[7.8rem] sm:h-[10.4rem] md:h-[13rem] [@media(min-height:850px)]:h-[15.6rem]"
          />
          {hasClientMark && (
            <>
              <span
                aria-hidden
                className="font-heading text-2xl font-extrabold uppercase text-lyp-white/60 md:text-4xl"
              >
                x
              </span>
              {/* Their artwork, at the mark's own height. Not drawn through
                  `Logo`: that declares the brand mark's 383 x 120 box and
                  would letterbox anything squarer. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={coverLogo.src}
                alt={`${proposal.venueName} logo`}
                className="h-[7.8rem] w-auto max-w-[18.2rem] object-contain sm:h-[10.4rem] md:h-[13rem] md:max-w-[26rem] [@media(min-height:850px)]:h-[15.6rem]"
              />
            </>
          )}
        </Reveal>

        {strapline && (
          <Reveal
            as="h1"
            index={2}
            className="mt-8 max-w-[22ch] text-balance font-heading text-[1.65rem] font-extrabold uppercase leading-[1.02] tracking-tight text-lyp-white sm:text-[2rem] md:text-[2.65rem] [@media(min-height:850px)]:mt-10 [@media(min-height:850px)]:text-[3.3rem]"
          >
            {strapline}
          </Reveal>
        )}

        {/* Who it is for. Below the statement, because the statement is what
            the slide is; this is the address on the envelope. */}
        <Reveal
          as="p"
          index={3}
          className="mt-10 font-body text-[11px] uppercase tracking-[0.3em] text-lyp-white/50 md:text-sm [@media(min-height:850px)]:mt-12"
        >
          {tCover("preparedFor")}
        </Reveal>
        <Reveal
          as="h2"
          index={4}
          className="mt-2 font-heading text-3xl font-extrabold text-lyp-white md:text-4xl"
        >
          {proposal.venueName}
        </Reveal>
        {proposal.contactName && (
          <Reveal
            as="p"
            index={5}
            className="mt-1 font-body text-lg text-lyp-white/50"
          >
            {proposal.contactName}
          </Reveal>
        )}

        {proposal.status === "signed" && (
          <Reveal index={6} className="mt-8 flex flex-col items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full bg-green-500/15 px-4 py-1.5 font-body text-sm text-green-400 ring-1 ring-green-500/30">
              <span className="h-2 w-2 rounded-full bg-green-400" />
              {SIGNED_BADGE}
            </span>
            <button
              onClick={() => {
                const idx = pages.findIndex((p) => p.slug === "summary");
                if (idx !== -1) setCurrentPage(idx);
              }}
              className="rounded-lg bg-lyp-cherry px-6 py-2.5 font-body text-sm font-semibold text-lyp-white transition-[background-color,transform] duration-300 ease-brand hover:bg-lyp-cherry/90 active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100"
            >
              {VIEW_SUMMARY_BUTTON}
            </button>
          </Reveal>
        )}
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
                className="font-heading text-4xl font-extrabold uppercase leading-[1.02] tracking-tight text-lyp-white md:text-5xl xl:text-6xl"
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
                  resultsLabel={tResults("resultsLabel")}
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
            className={`mx-auto text-balance font-heading font-extrabold uppercase leading-[0.95] tracking-tight text-lyp-white ${
              // A long title drops a size and takes a wider measure, so it
              // sits on one line instead of breaking in two. The agency asked
              // for this by name: "Marketing Growth Strategy: keep the title
              // on one line."
              page.title.length > 19
                ? "max-w-[26ch] text-4xl md:text-6xl"
                : "max-w-[16ch] text-5xl md:text-7xl"
            } ${statementImage ? "mt-8 [@media(min-height:850px)]:mt-10" : ""}`}
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
        {/* Narrower gutters and a wider cap than the other pages. The device
            row here is the page, and it was width-limited rather than
            height-limited, so "make images a bit bigger and closer together"
            is bought by giving the row more room rather than by raising a
            height that never bound. */}
        <div className="flex flex-1 flex-col justify-center px-4 pt-8 pb-6 md:px-6 lg:px-8">
          <div className="mx-auto flex w-full max-w-[1700px] flex-col items-center">
          {page.title && (
            <Reveal
              as="h1"
              index={0}
              className="text-center font-heading text-4xl font-extrabold md:text-6xl leading-[1.02] text-lyp-white uppercase tracking-tight"
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
              // Tighter gaps than before, because the agency wants the row to
              // read as one group: "make images a bit bigger and closer
              // together". The height below grew to match.
              className={`grid w-full items-center gap-2 md:gap-3 lg:gap-4 ${
                page.title || subheadBlocks.length > 0 ? "mt-6" : ""
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
                  className={`portal-reveal portal-reveal-lift mx-auto h-auto max-h-[56vh] w-full object-contain lg:max-h-[72vh] ${IMAGE_RADIUS_LARGE}`}
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

  const trustedByLabel = tGlobal("trustedByLabel");

  return (
    /* No cap on this element. The trusted-by band below is a direct child of
       it and has to reach both edges of the window, so the 1400px measure
       moves onto the content row instead, where it was always meant to be. */
    <div className="flex h-full w-full flex-col overflow-y-auto">
      <div className="mx-auto w-full max-w-[1400px] flex-1 flex flex-col justify-center px-8 pt-8 pb-12 md:px-14 lg:px-20 lg:pt-6 lg:pb-8">
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
              // ONE LINE, WHATEVER THE TITLE'S LENGTH.
              //
              // The measure is font-relative, so it scales with the responsive
              // heading size. Short titles keep the big size. A long one
              // ("Marketing Growth Strategy", which the agency asked to keep on
              // one line) drops a step and takes a wider measure instead, which
              // is what lets it sit on one line in either column width rather
              // than breaking in two. Anything longer still wraps rather than
              // running off the page.
              <Reveal
                as="h1"
                index={0}
                className={`font-heading font-extrabold leading-[1.02] text-lyp-white text-balance uppercase tracking-tight ${
                  page.title.length > 19
                    ? "max-w-[28ch] text-3xl md:text-5xl"
                    : "max-w-[18ch] text-4xl md:text-6xl"
                }`}
              >
                {page.title}
              </Reveal>
            )}
            <ContentBlockRenderer
              blocks={textBlocks.filter((b) => b.type !== "logos")}
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

      {/* TRUSTED BY, ALONG THE FOOT.
          The logos used to sit mid-column, small, in the middle of the copy.
          "Add more logos but not where they currently are, add them in the
          same style as the Forbes logo. Also add the words: Trusted by: and
          then all logos." So they move out of the text and into the same
          black band the press strip uses, with the label leading them. The
          band carries any number of logos and wraps rather than shrinking
          them, so adding more costs nothing. */}
      {showcaseLogos.length > 0 && (
        <Reveal
          variant="fade"
          delay={revealDelay(3)}
          className="w-full bg-black"
        >
          <div className="mx-auto flex max-w-[100rem] flex-wrap items-center justify-center gap-x-10 gap-y-4 px-6 py-5 md:gap-x-14 md:px-10">
            {trustedByLabel && (
              <span className="font-heading text-[11px] font-semibold uppercase tracking-[0.22em] text-lyp-white/70 md:text-[13px]">
                {trustedByLabel}
              </span>
            )}
            {showcaseLogos.map((logo, i) => (
              <Image
                key={`${logo.url}-${i}`}
                src={logo.url}
                alt={logo.alt || ""}
                sizes={SIZES.pressLogo}
                width={600}
                height={240}
                className="h-12 w-auto object-contain md:h-16"
              />
            ))}
          </div>
        </Reveal>
      )}
    </div>
  );
}
