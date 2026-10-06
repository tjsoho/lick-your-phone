"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Check } from "lucide-react";
import {
  PageData,
  useCopy,
  useProposal,
  type ContentBlock,
} from "../ProposalContext";
import { cn } from "@/lib/utils";
import ContentBlockRenderer, {
  IMAGE_RADIUS,
  MAIN_IMAGE,
  MAIN_IMAGE_HEIGHT,
  SIZES,
} from "./ContentBlockRenderer";
import MediaCarousel from "./MediaCarousel";
import Reveal, { revealDelay } from "../Reveal";

/** Below this frame width the offer panel stacks instead of running in a row. */
const TIGHT_FRAME_PX = 1200;

/* -------------------------------------------------------------------------
   THE SERVICE SPREAD

   One masthead, one index, one picture, one offer.

   The page is a fixed frame from `lg` up. The MASTHEAD sits at the top with
   its padding above it; everything under the hairline — index, picture and
   offer — is CENTRED in the height that is left, so a five-line service and a
   twenty-line one both sit on the optical centre of the body instead of
   hanging off the rule.

     ┌──────────────────────────────────────────────────────────┐
     │ MEDIA MENU                                               │  masthead
     │ MEDIA EVENT                          ONE-TIME CAMPAIGN   │  full width
     │ ───────────────────────────────────────────────────────  │  hairline
     │                                        ╷                 │  ← free space
     │  WHAT'S INCLUDED                       ╷                 │
     │  01 …………………   07 …………………              ╷                 │
     │  02 …………………   08 …………………              ╷    PICTURE      │
     │  YOUR COMMITMENTS  Food / Drinks / …   ╷   (centred on    │
     │  ┌──────────────────────┐ ┌──────────┐ ╷    the text)     │
     │  │ INVESTMENT  20% OFF  │ │          │ ╷                 │  the quote,
     │  │ $4,791 + GST         │ │ ◉ I WANT │ ╷                 │  and beside
     │  │ PER MONTH            │ │   THIS   │ ╷                 │  it, at the
     │  └──────────────────────┘ └──────────┘ ╷                 │  same height,
     │                                                          │  the decision
     │                                                          │  ← free space
     └──────────────────────────────────────────────────────────┘

   A service with THREE terms cannot run that way — three cards need the
   panel's whole width — so it reads top to bottom instead, in the order the
   client actually works in:

     ┌───────────────────────────────────────┐
     │ INVESTMENT  20% OFF   CHOOSE YOUR TERM│  one label row
     │ ┌─────────┐ ┌─────────┐ ┌───────────┐ │  the terms, cut into the
     │ │ ANNUALLY│ │ 6 MONTHS│ │  3 MONTHS │ │  panel on their own ground
     │ │  $389   │ │  $489   │ │   $589    │ │
     │ └─────────┘ └─────────┘ └───────────┘ │
     └───────────────────────────────────────┘
     ┌───────────────────────────────────────┐  and only then the decision,
     │            ◉  I WANT THIS             │  the width of everything it
     └───────────────────────────────────────┘  is deciding about

   Why this and not the old two-column stack:
   - The title gets the full page width, so it can run at display scale on one
     line instead of being squeezed into a half-width column.
   - The checklist reads as a numbered index with a column rule, not a receipt
     of ticks. Two columns halve its height and the numbers give the count of
     what you are buying at a glance.
   - The picture is centred against the text column, not dropped to the foot of
     a rail, so the two halves of the spread share one optical axis.
   - The offer follows the index immediately — one rhythm from masthead to
     price, no dead air in the middle of the page — and the selection control
     sits OUTSIDE the panel, as its own card of the same height, so the panel
     reads as the quote and the control reads as the decision. Two cards of
     equal weight: here is the number, here is the one thing to do about it.

   Hierarchy is carried by scale, weight, letterspacing and rhythm. There is
   one surface on the page (the offer panel), one hairline, and — on a
   three-term service — one control group cut into that surface.

   FITTING. The slide never scrolls, so every pixel the offer takes is a pixel
   the index gives up. Measured in a headless frame against the real box model,
   with the longest three-term service (Meta Digital Ads: six inclusions, one
   disclaimer, 20% off), the air left under the body row is:

                              basket closed   basket open
       1280 x 720                 24.8px          10.8px
       1440 x 900                 29.4px          15.4px

   — about 6px tighter than the layout that preceded them, in every case. The
   density notch above is what pays for the rest.

   Those four numbers STILL STAND after the decision control grew into a
   full-weight card, and they stand by construction rather than by a second
   measurement: the card never asks the body row for a pixel.

     - On a three-term service it sits on its own row, where its new weight
       comes from WIDTH — the panel's full width instead of a right-hand pill.
       Padding is byte-for-byte what the pill had (py-1.5) and the 24px switch
       still sets the content height, so the row measures exactly what it
       measured before. Delta 0px. These are the numbers above: Meta Digital
       Ads is a three-term service, so the worst case on the slide is the case
       that did not move.
     - Everywhere else it is the offer row's second item under
       `lg:items-stretch`, so its height IS the panel's height and the row is
       as tall as the panel either way. Its own content measures 44px (a 24px
       switch inside py-2.5, unchanged), and the shortest panel this file can
       draw — an in-kind service: one caption against a 20px "Complimentary",
       inside py-3 — is 49px. The control is never the taller of the two, so
       the stretch is always into air that already existed.

   If you add to the offer, re-measure: the next thing to give is the index,
   and it is already at "mid" on these pages. In particular, anything that
   makes the decision card taller than 49px of content — a second line of
   label, a caption above the switch — stops being free and starts pushing the
   in-kind spreads down.
   ------------------------------------------------------------------------- */

/**
 * Lifted brand rose. Cherry (#B22626) is the brand accent, but on the portal's
 * dark red smoke it measures ~2:1 — invisible. This tint is the same hue
 * family, already used on the admin sign-in screen, and clears 8:1 over the
 * brightest part of the backdrop. Every opacity is written out in full because
 * Tailwind scans source text: a template-built `${ROSE}/80` never compiles.
 */
const ROSE = "text-[#f0c9c9]";
const ROSE_DIM = "text-[#f0c9c9]/85";
const ROSE_RULE = "text-[#f0c9c9]/70";

/** Caption style shared by every section label, so they read as one system. */
const CAPTION =
  "font-heading text-[11px] font-semibold uppercase tracking-[0.28em] [@media(min-height:850px)]:text-xs";

/** Block types that belong in the picture rail, not the text column. */
const MEDIA_TYPES = ["image", "logos", "collage", "media_carousel"];

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

interface MediaItem {
  url: string;
  alt: string;
}

/**
 * Splits the page's blocks into photographs, platform logos and everything
 * else. The featured image leads; the rest follow the admin's block order.
 */
function collectMedia(page: PageData): {
  images: MediaItem[];
  logos: MediaItem[];
  textBlocks: ContentBlock[];
} {
  const sorted = [...page.contentBlocks].sort(
    (a, b) => (a.sequence ?? 0) - (b.sequence ?? 0),
  );

  const images: MediaItem[] = page.featuredImage
    ? [{ url: page.featuredImage, alt: page.title ?? "" }]
    : [];
  const logos: MediaItem[] = [];

  for (const block of sorted) {
    if (block.type === "image" && typeof block.content === "string") {
      if (block.content.trim()) images.push({ url: block.content, alt: "" });
    } else if (
      (block.type === "media_carousel" || block.type === "collage") &&
      Array.isArray(block.content)
    ) {
      images.push(...(block.content as MediaItem[]).filter((i) => i?.url));
    } else if (block.type === "logos" && Array.isArray(block.content)) {
      logos.push(...(block.content as MediaItem[]).filter((i) => i?.url));
    }
  }

  return {
    images,
    logos,
    textBlocks: sorted.filter((b) => !b.type || !MEDIA_TYPES.includes(b.type)),
  };
}

/**
 * The picture rail. It takes the full height of the body row and the photo
 * scales into it, so adding inclusions shrinks the photo instead of pushing it
 * off the page.
 *
 * No plate, ring or shadow: the radius is on the <img> itself and the box
 * shrink-wraps the photo, so the corners land on the picture and never on
 * empty letterbox space.
 */
function PictureRail({
  images,
  logos,
  alt,
  delay,
}: {
  images: MediaItem[];
  logos: MediaItem[];
  alt: string;
  /** ms. The rail settles alongside the index, not after the whole page. */
  delay: number;
}) {
  // Requested explicitly for the platform marks: a white ring hugging the
  // circular artwork. This is a deliberate exception to the project-wide
  // "no outline around an image" rule, which still holds everywhere else.
  const LOGO_RING = "ring-[3px] ring-lyp-white";

  // The picture rail is the reference size for every main single image in the
  // proposal; `MAIN_IMAGE` is where that size lives.
  const IMG = MAIN_IMAGE;
  const IMG_IN_FRAME = `h-full w-auto max-w-full object-contain ${IMAGE_RADIUS}`;

  return (
    <div
      className={cn(
        "flex min-h-0 flex-col items-center justify-center gap-6 max-lg:min-h-[12rem]",
      )}
    >
      {images.length === 1 && (
        <Image
          src={images[0].url}
          alt={images[0].alt || alt}
          sizes={SIZES.main}
          className={`portal-reveal portal-reveal-lift ${IMG}`}
          style={{ animationDelay: `${delay}ms` }}
          width={900}
          height={1000}
          priority
        />
      )}

      {images.length > 1 && (
        // The carousel fills a box rather than shrink-wrapping one photo, so it
        // needs the height stated: `h-full` has nothing to resolve against in a
        // content-sized row.
        <Reveal
          variant="lift"
          delay={delay}
          className={`flex min-h-0 w-full items-center ${MAIN_IMAGE_HEIGHT}`}
        >
          <MediaCarousel
            items={images}
            frame
            imageClassName={IMG_IN_FRAME}
            sizes={SIZES.main}
          />
        </Reveal>
      )}

      {/* -----------------------------------------------------------
          PLATFORM MARKS. On a page whose only artwork is logos, the logos
          ARE the picture. Two of them run as a diagonal — first top-left,
          second bottom-right — sized so their inner corners come within a
          few pixels of each other. The near-miss is the composition; a
          centred row of two badges is not. One runs large down the middle;
          three or more fall back to the wrapped row.
          No plate, ring or shadow — the mark sits straight on the ground.
          ----------------------------------------------------------- */}
      {logos.length > 0 &&
        images.length === 0 &&
        (logos.length >= 2 ? (
          // Zigzag diagonal chain. Each mark alternates left/right of the rail
          // centre and overlaps the one above it, so the offsets are fractions
          // of a mark's own width W rather than of the rail:
          //   horizontal  ±37%  -> neighbouring centres 0.74W apart
          //   vertical    -25%  -> neighbouring centres 0.75W apart
          // Centre-to-centre is sqrt(0.74^2 + 0.75^2) = 1.05W against a 1W
          // diameter — edges ~5% of a mark apart, i.e. near-touching. One rule
          // covers 2, 3 or 4 marks and the gap is identical at every viewport.
          <div className="mx-auto flex w-[41%] shrink-0 flex-col">
            {logos.map((logo, i) => (
              <Image
                key={`${logo.url}-${i}`}
                src={logo.url}
                alt={logo.alt || "Platform logo"}
                sizes={SIZES.platformMark}
                style={{ animationDelay: `${delay + i * 90}ms` }}
                className={cn(
                  "portal-reveal portal-reveal-pop",
                  "h-auto w-full rounded-full object-contain",
                  LOGO_RING,
                  i % 2 === 0 ? "-translate-x-[37%]" : "translate-x-[37%]",
                  i > 0 && "-mt-[25%]",
                )}
                width={640}
                height={640}
              />
            ))}
          </div>
        ) : (
          // Single mark. Same 41%-of-rail width as one link in the zigzag, so a
          // one-logo service reads at exactly the same scale as a two- or
          // three-logo one, with the same white ring.
          <Image
            src={logos[0].url}
            alt={logos[0].alt || "Platform logo"}
            sizes={SIZES.platformMark}
            style={{ animationDelay: `${delay}ms` }}
            className={cn(
              "portal-reveal portal-reveal-pop mx-auto h-auto w-[41%] shrink-0 rounded-full object-contain",
              LOGO_RING,
            )}
            width={640}
            height={640}
          />
        ))}

      {/* Alongside a photograph the marks drop back to a caption-sized row. */}
      {logos.length > 0 && images.length > 0 && (
        <div className="flex shrink-0 flex-wrap items-center justify-center gap-6">
          {logos.map((logo, i) => (
            <Image
              key={i}
              src={logo.url}
              alt={logo.alt || "Platform logo"}
              sizes={SIZES.platformMarkSmall}
              style={{ animationDelay: `${delay + 160 + i * 70}ms` }}
              className="portal-reveal portal-reveal-pop h-9 w-auto object-contain [@media(min-height:850px)]:h-11"
              width={320}
              height={320}
            />
          ))}
        </div>
      )}

    </div>
  );
}

interface ServicePageProps {
  service: ServiceWithTiersWithInclusionsWithObligationsWithDisclaimers;
  page: PageData;
}

export default function ServicePage({ service, page }: ServicePageProps) {
  const {
    proposal,
    isSelected,
    selectedTierId,
    toggleService,
    selectTier,
    deselectService,
    selections,
    serviceMap,
    selectedCount,
    discountLive,
  } = useProposal();
  const t = useCopy("service", page);
  // The choose-a-term prompt is the same instruction on every service slide,
  // so it is worded once in Settings rather than retyped on each page.
  const g = useCopy("global");
  // The carousel shows the running-total bar as soon as anything is selected,
  // which changes how much air already sits above the masthead.
  // The discount countdown is a top bar too, so it counts the same way.
  const hasRunningTotal =
    selectedCount > 0 ||
    (discountLive &&
      proposal.status !== "signed" &&
      proposal.status !== "intake_complete");

  const selected = isSelected(service.id);
  const currentTierId = selectedTierId(service.id);
  const hasTiers = service.service_tiers.length > 0;
  const isInKind = service.billing === "in_kind";

  const sortedTiers = [...service.service_tiers].sort(
    (a, b) => a.sequence - b.sequence,
  );

  /**
   * The action for a service that has only one price. A tiered one is added
   * and removed by its term cards instead — there is no separate bar to press,
   * so there is no pending term to hold either: nothing is ticked until the
   * client ticks it.
   */
  function handleWantThis() {
    if (isDisabled) return;
    if (selected) deselectService(service.id);
    else toggleService(service.id);
  }

  const hasOtherSelected = selections.some((sel) => {
    const svc = serviceMap[sel.serviceId];
    return svc && !svc.requires_other_service && sel.serviceId !== service.id;
  });
  const isDisabled =
    proposal.status === "signed" ||
    (service.requires_other_service && !hasOtherSelected);

  const displayTarget = service.target_price_cents;
  const displayList = listFromTarget(displayTarget, service.discount_pct);
  const hasDiscount = service.discount_pct != null && service.discount_pct > 0;
  const periodLabel =
    service.price_display_period === "week" ? t("perWeek") : t("perMonth");
  const savingsCents = displayList - displayTarget;

  const { images, logos, textBlocks } = collectMedia(page);
  const hasArtwork = images.length > 0 || logos.length > 0;

  const inclusions = [...service.inclusions].sort(
    (a, b) => (a.sequence ?? 0) - (b.sequence ?? 0),
  );
  const obligations = [...service.client_obligations].sort(
    (a, b) => (a.sequence ?? 0) - (b.sequence ?? 0),
  );
  const disclaimers = [...service.disclaimers].sort(
    (a, b) => (a.sequence ?? 0) - (b.sequence ?? 0),
  );

  // DENSITY LADDER. One component has to hold a three-line service and a
  // twenty-line one without either looking starved or spilling off a 720px
  // screen, so the setting is derived from the amount of copy on the page.
  //
  // Two separate decisions, because they answer different questions:
  //  - COLUMNS follow the length of the index alone. Past six entries a single
  //    stack is taller than the frame, so it splits either side of a hairline.
  //  - SCALE follows the whole text load — the index plus the sections that sit
  //    under it. A commitments run costs about as much height as three index
  //    rows, and a disclaimer about one, so they are weighted that way.
  const textLoad =
    inclusions.length +
    (obligations.length > 0 ? 3 : 0) +
    (disclaimers.length > 0 ? 1 : 0);
  const twoColumnIndex = inclusions.length > 6;
  const tierCount = service.service_tiers.length;
  // TERMS GET THE WHOLE WIDTH.
  //
  // The label used to take a column beside the term cards whenever there were
  // only two of them, and two long names in what was left of the row ran off
  // the edge: "$7,989 + GST PER MONT". "Adjust this layout so we have invest
  // up the top and then the same two boxes under with the check box and make
  // sure the text stays contained." So every tiered service now reads the way
  // the three-term ones already did — INVESTMENT and its prompt on top, the
  // cards on a full-width row underneath.
  const stackOffer = hasTiers;
  // A three-term service gives its terms a bigger, darker, visibly separate
  // control, and a row of its own for the toggle underneath. That costs
  // height, and the index pays for it: one notch down the density ladder on
  // these pages keeps the whole spread inside a 720px frame with the basket
  // open. Measured rather than guessed — see FITTING, at the foot of the file.
  const density =
    textLoad > 9 ? "tight" : textLoad > 7 || stackOffer ? "mid" : "open";
  // The slide gives up its right-hand width to the open basket, so the frame
  // is measured rather than read off the window: the same page is wide with
  // the basket closed and tight with it open at one viewport size.
  const frameRef = useRef<HTMLElement>(null);
  const [tightFrame, setTightFrame] = useState(false);
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => {
      setTightFrame(entry.contentRect.width < TIGHT_FRAME_PX);
    });
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);
  // Below this the label no longer fits beside the price inside the panel.
  const compactOffer = stackOffer || tightFrame;
  // A single-column index leaves width over, so the picture takes a wider rail
  // — unless the offer needs it for three tiers side by side.
  const wideRail = !twoColumnIndex && tierCount < 3;

  /* ---------------------------------------------------------------------
     THE SPREAD'S CHOREOGRAPHY.

     One ladder, computed from the same copy the layout is computed from, so
     a three-inclusion service and a twelve-inclusion one both finish arriving
     at roughly the same moment: the index cascades at a per-row interval that
     shrinks as the list grows, and everything under it is anchored to where
     that cascade ends rather than to a fixed count of steps.
     --------------------------------------------------------------------- */
  const D_EYEBROW = revealDelay(0);
  const D_TITLE = revealDelay(1);
  const D_RULE = revealDelay(2);
  const D_INDEX = revealDelay(3);
  // A long index deals faster, so twelve rows never outlast four.
  const rowStep = inclusions.length > 8 ? 28 : inclusions.length > 5 ? 38 : 52;
  const D_ROWS = D_INDEX + 70;
  const indexTail = D_ROWS + Math.max(inclusions.length - 1, 0) * rowStep;
  const D_OBLIGATIONS = indexTail + 90;
  const D_DISCLAIMERS = D_OBLIGATIONS + 80;
  const D_BLOCKS = D_DISCLAIMERS + 80;
  // The offer is the climax: it waits for the index to finish, then lands.
  const D_OFFER = indexTail + 190;
  const D_TIERS = D_OFFER + 110;
  const D_TOGGLE = D_OFFER + 170;
  // The picture is a parallel column, not a later one — it settles with the
  // index rather than queueing behind it.
  const D_RAIL = D_RULE + 80;

  /* ---------------------------------------------------------------------
     THE DECISION, AT THE WEIGHT OF THE DECISION.

     One action, identical on every service slide, whether or not a term had to
     be chosen. Beside the quote normally; on its own row under the terms when
     three of them need the panel's full width. Either way it is the LAST thing
     on the reading path — and it has to LOOK like the one thing left to do.

     It used to be a small pill dropped on the panel's bottom-right corner:
     a third of the panel's height, a sixth of its area, in a lighter weight
     than the price it was deciding on. It is now the offer row's second card —
     the panel's corner radius, the panel's FULL HEIGHT beside it, and on a
     three-term service the panel's full width underneath it.

     None of that costs the spread a pixel, which is the whole point of doing
     it this way:
       - Beside the quote, the height comes from `lg:items-stretch` on the
         offer row. The control takes the panel's height instead of asking the
         slide for more, and the row was already as tall as the panel.
       - Under the terms, the weight comes from WIDTH, which is free. The
         padding there is byte-for-byte what the pill had.
     So the FITTING figures at the head of this file still stand.

     The ground is the TERM CARDS' ground, not the panel's: cut into the slide
     (near-black, rose edge) rather than laid on it, because this is a control
     and the panel is a quote. Choosing it fills it with the same rose as a
     chosen term, so the slide has one language for "this one".

     The whole card is the switch — `role="switch"` on the card, with the track
     and thumb drawn inside it as ornament — so the target is the card and not
     a 44px toggle in its corner. Geometry copied from the portal's `Switch`
     (h-6/w-11 track, h-5/w-5 thumb, 20px of travel) so it reads as the same
     component it has always been.
     --------------------------------------------------------------------- */
  const wantToggle = (
    <button
      type="button"
      role="switch"
      aria-checked={selected}
      aria-label={selected ? `Remove ${service.name}` : `I want ${service.name}`}
      disabled={isDisabled}
      onClick={handleWantThis}
      // `pop` scales UP to its final size, so it never occupies more room than
      // it settles into — safe at the foot of the slide.
      style={{ animationDelay: `${D_TOGGLE}ms` }}
      className={cn(
        "portal-reveal portal-reveal-pop flex shrink-0 items-center justify-center gap-2.5 rounded-2xl ring-1 ring-inset transition-[background-color,box-shadow] duration-300 ease-brand",
        // The edge is the resting/selected state, so focus can't live in the
        // ring without reading as a third state. It takes an outline just
        // outside the card instead.
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f0c9c9]",
        stackOffer
          ? // Its own row, so it takes the whole of it.
            "w-full px-4 py-1.5"
          : // In the offer row it stretches to the panel; on a phone, where the
            // offer stacks, it keeps the pill's right-hand anchor. The floor on
            // the width is so the card does not SHRINK when it is chosen —
            // "Added" is half the length of "I want this", and a decision that
            // gets smaller the moment you make it is the opposite of the point.
            "self-end px-4 py-2.5 lg:min-w-[12.5rem] lg:self-auto",
        selected
          ? "bg-[#f0c9c9]/[0.16] ring-[#f0c9c9]/75"
          : "bg-[#120406]/70 ring-[#f0c9c9]/30",
        !selected &&
          !isDisabled &&
          "hover:bg-[#120406]/50 hover:ring-[#f0c9c9]/55",
        isDisabled && "cursor-not-allowed opacity-40",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "flex h-6 w-11 shrink-0 items-center rounded-full border-2 border-transparent transition-colors duration-300 ease-brand",
          selected ? "bg-lyp-cherry" : "bg-lyp-white/25",
        )}
      >
        <span
          className={cn(
            "block h-5 w-5 rounded-full bg-lyp-white shadow-lg transition-transform duration-300 ease-brand motion-reduce:transition-none",
            selected ? "translate-x-5" : "translate-x-0",
          )}
        />
      </span>
      {/* The switch sets the card's content height at every size, so the label
          can be set up two notches from the old pill's 11px for nothing.
          `whitespace-nowrap` keeps it that way: a second line would be the one
          thing on this card that costs the spread height. */}
      <span className="whitespace-nowrap font-heading text-[13px] font-semibold uppercase tracking-[0.16em] text-lyp-white [@media(min-height:850px)]:text-[14px]">
        {isInKind ? t("paidInKind") : selected ? t("added") : t("wantThis")}
      </span>
    </button>
  );

  return (
    <article
      ref={frameRef}
      className={cn(
        "flex h-full flex-col px-7 pb-2 max-lg:h-auto max-lg:min-h-full lg:px-12 xl:px-16 [@media(min-height:850px)]:pb-8",
        // The masthead sits DOWN from the top edge, not against it. When the
        // running-total bar is up it has already put 52px of air above the
        // slide, so the inset drops back to keep the height budget intact on a
        // 720px screen.
        // The masthead sits DOWN the page — as padding, not a transform, so the
        // body below it is re-flowed rather than crossed. How far it can drop
        // is a height budget: the longest service (Media Event) has to keep its
        // twelve inclusions inside a 720px frame.
        hasRunningTotal
          ? "pt-6 [@media(min-height:850px)]:pt-16"
          : "pt-12 [@media(min-height:850px)]:pt-20",
      )}
    >
      {/* ---------------------------------------------------------------
          MASTHEAD — full width so the name can run at display scale.
          The term sits on the title's baseline as metadata: same line,
          a twentieth of the weight.
          --------------------------------------------------------------- */}
      <header className="shrink-0">
        <div className="flex items-end justify-between gap-10">
          <div className="min-w-0">
            <Reveal
              as="p"
              delay={D_EYEBROW}
              className={`font-heading text-[10px] font-semibold uppercase tracking-[0.42em] [@media(min-height:850px)]:text-[11px] ${ROSE}`}
            >
              {t("eyebrow")}
            </Reveal>
            <Reveal
              as="h1"
              delay={D_TITLE}
              className="mt-2 font-heading text-[30px] uppercase leading-[0.94] tracking-[-0.015em] text-lyp-white sm:text-[38px] lg:text-[46px] [@media(min-height:850px)]:mt-3 [@media(min-height:850px)]:text-[58px]"
            >
              {service.name}
            </Reveal>
          </div>
          {service.term && (
            <Reveal
              as="p"
              delay={D_TITLE}
              className="hidden max-w-[16rem] shrink-0 pb-1 text-right font-body text-[11px] uppercase leading-snug tracking-[0.16em] text-lyp-white/75 lg:block [@media(min-height:850px)]:text-xs"
            >
              {service.term}
            </Reveal>
          )}
        </div>
        {/* One hairline, fading out — a rule, not a border. */}
        {/* The hairline DRAWS from the left rather than fading up — the one
            gesture on the page that has direction, and it points at the copy. */}
        <div
          aria-hidden
          style={{ animationDelay: `${D_RULE}ms` }}
          className="portal-reveal portal-reveal-rule mt-3.5 h-px w-full bg-gradient-to-r from-[#f0c9c9]/55 via-lyp-white/15 to-transparent [@media(min-height:850px)]:mt-6"
        />
        {service.term && (
          <Reveal
            as="p"
            delay={D_RULE}
            className="mt-2 font-body text-[11px] uppercase tracking-[0.16em] text-lyp-white/75 lg:hidden"
          >
            {service.term}
          </Reveal>
        )}
      </header>

      {/* ---------------------------------------------------------------
          BODY — index + offer on the left, picture rail on the right.
          --------------------------------------------------------------- */}
      <div
        className={cn(
          // The body owns the height left under the masthead and CENTRES its
          // row inside it (`content-center`), so there is deliberate air
          // between the rule and the copy and the same air below the offer.
          // Items still stretch inside that row, so the picture rail matches
          // the text column and the two share a midpoint.
          "grid min-h-0 flex-1 content-center grid-cols-1 gap-x-12 gap-y-8 pt-4 [@media(min-height:850px)]:pt-5",
          hasArtwork &&
            (wideRail
              ? "lg:grid-cols-[minmax(0,1fr)_41%] xl:grid-cols-[minmax(0,1fr)_43%]"
              : "lg:grid-cols-[minmax(0,1fr)_35%] xl:grid-cols-[minmax(0,1fr)_37%]"),
        )}
      >
        <div className="flex min-h-0 flex-col justify-center">
          {/* Safety net only. Every real service fits the frame; if one ever
              outgrows it this column scrolls rather than clipping copy. */}
          <div className="portal-scroll min-h-0 max-lg:overflow-visible">
            {inclusions.length > 0 && (
              <section>
                <Reveal
                  as="h2"
                  delay={D_INDEX}
                  className={`${CAPTION} ${ROSE}`}
                >
                  {t("includedHeading")}
                </Reveal>
                <ul
                  className={cn(
                    "mt-3.5",
                    density === "tight"
                      ? "[@media(min-height:850px)]:mt-3.5"
                      : "[@media(min-height:850px)]:mt-5",
                    twoColumnIndex
                      ? "sm:columns-2 sm:gap-x-10 sm:[column-rule:1px_solid_rgba(255,255,255,0.12)]"
                      : // One column, held to a reading measure so a wide page
                        // does not stretch the lines past comfort.
                        "max-w-[58ch]",
                  )}
                >
                  {inclusions.map((inc, i) => (
                    <Reveal
                      as="li"
                      key={inc.id}
                      delay={D_ROWS + i * rowStep}
                      className={cn(
                        "flex break-inside-avoid items-baseline gap-3 last:mb-0",
                        density === "open"
                          ? "mb-3 [@media(min-height:850px)]:mb-4"
                          : density === "mid"
                            ? "mb-2.5 [@media(min-height:850px)]:mb-3.5"
                            : "mb-0.5 [@media(min-height:850px)]:mb-2",
                      )}
                    >
                      <span
                        className={`w-[1.45rem] shrink-0 font-heading text-[11px] font-semibold tabular-nums tracking-[0.1em] [@media(min-height:850px)]:text-[12px] ${ROSE_DIM}`}
                      >
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span
                        className={cn(
                          "font-body leading-snug text-lyp-white",
                          density === "open"
                            ? "text-[16px] [@media(min-height:850px)]:text-[19px]"
                            : density === "mid"
                              ? "text-[15px] [@media(min-height:850px)]:text-[17px]"
                              : "text-[14px] leading-[1.3] [@media(min-height:850px)]:text-[16px] [@media(min-height:850px)]:leading-[1.3]",
                        )}
                      >
                        {inc.text}
                      </span>
                    </Reveal>
                  ))}
                </ul>
              </section>
            )}

            {obligations.length > 0 && (
              <section
                className={cn(
                  "mt-3",
                  density === "tight"
                    ? "[@media(min-height:850px)]:mt-5"
                    : "[@media(min-height:850px)]:mt-6",
                )}
              >
                <Reveal
                  as="h2"
                  delay={D_OBLIGATIONS}
                  className={`${CAPTION} ${ROSE}`}
                >
                  {t("commitmentsHeading")}
                </Reveal>
                {/* A run, not a list. These are short items — setting them as
                    one flowing line with rose dividers costs a fraction of the
                    height of seven bulleted rows and reads faster. */}
                <Reveal
                  as="p"
                  delay={D_OBLIGATIONS + 60}
                  className="mt-1.5 font-body text-[14px] leading-normal text-lyp-white/85 [@media(min-height:850px)]:mt-2 [@media(min-height:850px)]:text-[16px] [@media(min-height:850px)]:leading-normal"
                >
                  {obligations.map((ob, i) => (
                    <span key={ob.id}>
                      {i > 0 && (
                        <span className={`mx-2.5 ${ROSE_RULE}`}>/</span>
                      )}
                      {ob.text}
                    </span>
                  ))}
                </Reveal>
              </section>
            )}

            {disclaimers.length > 0 && (
              <div className="mt-3 [@media(min-height:850px)]:mt-7">
                {disclaimers.map((d, i) => (
                  <Reveal
                    as="p"
                    key={d.id}
                    delay={D_DISCLAIMERS + i * 60}
                    className="mt-1.5 font-body text-[11px] italic leading-snug text-lyp-white/70 first:mt-0 [@media(min-height:850px)]:text-xs"
                  >
                    {d.text}
                  </Reveal>
                ))}
              </div>
            )}

            {textBlocks.length > 0 && (
              <div className="mt-6">
                <ContentBlockRenderer
                  blocks={textBlocks}
                  revealFrom={D_BLOCKS}
                />
              </div>
            )}
          </div>

          {/* -----------------------------------------------------------
              THE OFFER — the commercial climax, set directly under the index
              so the reading path runs straight from what you get to what it
              costs. A single machined surface: a soft top-to-bottom
              wash, an inset hairline instead of a border, and a lit top
              edge. No drop shadow.
              ----------------------------------------------------------- */}
          <div
            className={cn(
              "flex shrink-0 flex-col",
              // Three terms fill the panel, so the toggle takes the row under
              // it rather than the column beside it. Everything else keeps the
              // quote-then-decision row — and `items-stretch` is what makes the
              // decision the same height as the quote: the row is already as
              // tall as the panel, so the control grows into air that exists.
              stackOffer ? "gap-2" : "gap-3 lg:flex-row lg:items-stretch lg:gap-5",
              stackOffer
                ? "mt-4 [@media(min-height:850px)]:mt-7"
                : compactOffer
                  ? "mt-5 [@media(min-height:850px)]:mt-8"
                  : "mt-9 [@media(min-height:850px)]:mt-12",
            )}
          >
          <Reveal
            // Fade, not rise. This panel is the lowest element on the slide and
            // `.portal-scroll` counts a transformed child's box in its
            // scrollable overflow, so a downward offset here flashed a 6px
            // scrollbar on a 720px screen. The tier buttons inside still pop,
            // which is where the movement belongs anyway.
            variant="fade"
            delay={D_OFFER}
            className={cn(
              "relative min-w-0 flex-1 overflow-hidden rounded-2xl bg-gradient-to-b from-lyp-white/[0.11] to-lyp-white/[0.035] px-5 py-3 ring-1 ring-inset ring-lyp-white/[0.14] backdrop-blur-[2px] [@media(min-height:850px)]:px-7",
              // A stacked panel is already taller; it keeps the tighter padding
              // so the inclusions above it still fit the frame.
              !compactOffer && "[@media(min-height:850px)]:py-4",
            )}
          >
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#f0c9c9]/45 to-transparent"
            />

            <div
              className={cn(
                "flex flex-col",
                // Beside the open basket, or on a laptop, the price no longer
                // fits next to the label, so the panel stacks rather than being
                // clipped by its own rounded edge.
                compactOffer
                  ? "gap-2.5"
                  : "gap-4 lg:flex-row lg:items-center lg:gap-8",
              )}
            >
              {/* Label + incentive */}
              <div
                className={cn(
                  "shrink-0",
                  compactOffer && "flex flex-wrap items-center gap-x-4 gap-y-2",
                )}
              >
                <h2 className={`${CAPTION} ${ROSE}`}>
                  {t("investmentHeading")}
                </h2>
                {hasDiscount && (
                  <p className={cn(!compactOffer && "mt-2", "inline-flex items-center gap-2 rounded-full px-2.5 py-1 font-heading text-[10px] font-semibold uppercase tracking-[0.18em] text-lyp-gold ring-1 ring-inset ring-lyp-gold/45 [@media(min-height:850px)]:text-[11px]")}>
                    {t("discountBadge", {
                      pct: Math.round((service.discount_pct ?? 0) * 100),
                    })}
                  </p>
                )}
                {/* The lock note sits beside the price rather than under it,
                    so a signed proposal costs the page no extra height. */}
                {isDisabled && (
                  <p className="mt-2 max-w-[15rem] font-body text-[10px] leading-[1.4] text-lyp-white/75 [@media(min-height:850px)]:text-[11px]">
                    {proposal.status === "signed"
                      ? t("signedNote")
                      : t("requiresOtherNote")}
                  </p>
                )}
                {/* Names the step, on a row that already exists — a line of
                    its own would cost the slide 24px it does not have at
                    1280x720 with the basket open. `whitespace-nowrap` so a
                    longer wording pushes itself onto its own line rather than
                    breaking mid-phrase. */}
                {stackOffer && (
                  <p className="whitespace-nowrap font-heading text-[10px] font-semibold uppercase tracking-[0.14em] text-lyp-white/65 [@media(min-height:850px)]:text-[11px]">
                    {g("serviceChooseTerm")}
                  </p>
                )}
              </div>

              {isInKind ? (
                <div className="flex-1">
                  <p
                    className={`font-heading text-[20px] leading-tight [@media(min-height:850px)]:text-[26px] ${ROSE}`}
                  >
                    {t("complimentary")}
                  </p>
                </div>
              ) : hasTiers ? (
                <div
                  className={cn(
                    "grid flex-1 gap-2.5",
                    tierCount >= 3 ? "sm:grid-cols-3" : "sm:grid-cols-2",
                  )}
                >
                  {sortedTiers
                    .map((tier, tierIndex) => {
                      const tierList = listFromTarget(
                        tier.target_price_cents,
                        service.discount_pct,
                      );
                      const tierSelected = selected && currentTierId === tier.id;
                      const tierSaving = tierList - tier.target_price_cents;
                      return (
                        <button
                          key={tier.id}
                          type="button"
                          role="checkbox"
                          aria-checked={tierSelected}
                          aria-label={
                            tierSelected
                              ? `Remove ${service.name} — ${tier.name}`
                              : `Choose ${tier.name} for ${service.name}`
                          }
                          style={{
                            animationDelay: `${D_TIERS + tierIndex * 70}ms`,
                          }}
                          disabled={isDisabled}
                          onClick={() => {
                            if (isDisabled) return;
                            // TICKING A TERM IS THE DECISION.
                            //
                            // There used to be an "I want this" bar under these
                            // cards, and it asked for the same answer twice:
                            // "remove i want this on these pages … just make it
                            // clear to choose your term". So the card is the
                            // action now — ticking one adds the service on that
                            // term, ticking another swaps the term, and ticking
                            // the one already chosen takes the service back out.
                            if (tierSelected) deselectService(service.id);
                            else selectTier(service.id, tier.id);
                          }}
                          className={cn(
                            "portal-reveal portal-reveal-pop relative min-w-0 rounded-xl px-4 text-left ring-1 ring-inset transition-[box-shadow,transform] duration-300 ease-brand hover:-translate-y-0.5 active:translate-y-0 motion-reduce:transform-none motion-reduce:transition-none",
                            "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f0c9c9]",
                            // ALL THREE KEEP THE SAME GROUND.
                            //
                            // "have a check box in the top right so they can
                            // click it and it gives a tick so they all stay the
                            // same colour but the one selected has a green tick
                            // and bright red border." The cards no longer swap
                            // their fill when chosen: the tick and the cherry
                            // edge carry the whole state, so the three prices
                            // stay comparable at a glance.
                            "bg-[#120406]/70",
                            tierSelected
                              ? "ring-2 ring-lyp-cherry"
                              : "ring-[#f0c9c9]/25 hover:ring-[#f0c9c9]/50",
                            // Three terms also get the room to be read.
                            stackOffer ? "py-3" : "py-2.5",
                            isDisabled && "cursor-not-allowed opacity-40",
                          )}
                        >
                          {/* The box in the corner. It is drawn, not clickable
                              on its own: the whole card is the target, and a
                              12px tick would be a cruel one. */}
                          <span
                            aria-hidden
                            className={cn(
                              "absolute right-3 top-3 flex h-[18px] w-[18px] items-center justify-center rounded-[5px] border transition-colors duration-300 ease-brand",
                              tierSelected
                                ? "border-[#4ADE80] bg-[#4ADE80]/[0.14]"
                                : "border-lyp-white/30 bg-transparent",
                            )}
                          >
                            <Check
                              strokeWidth={3}
                              className={cn(
                                "h-3 w-3 text-[#4ADE80] transition-opacity duration-300 ease-brand",
                                tierSelected ? "opacity-100" : "opacity-0",
                              )}
                            />
                          </span>
                          <span className="flex items-center gap-2 pr-7">
                            {/* The name wraps rather than running under the
                                tick box: "up to 30x influencers" is a long
                                term, and a clipped one tells the client
                                nothing. */}
                            <span
                              className={cn(
                                "min-w-0 font-heading font-semibold uppercase leading-tight tracking-[0.12em] text-lyp-white/85",
                                stackOffer
                                  ? "text-[12px] [@media(min-height:850px)]:text-[13px]"
                                  : "text-[11px]",
                              )}
                            >
                              {tier.name}
                            </span>
                          </span>
                          {hasDiscount && (
                            <span className="mt-1.5 flex items-baseline justify-between gap-2 font-body text-[11px]">
                              <span className="text-lyp-white/70 line-through">
                                {formatCents(tierList)}
                              </span>
                              {tierSaving > 0 && (
                                <span className="whitespace-nowrap text-[10px] text-lyp-gold">
                                  {t("saveAmount", {
                                    amount: formatCents(tierSaving),
                                  })}
                                </span>
                              )}
                            </span>
                          )}
                          {/* NOTHING RUNS OFF THE EDGE.
                              The figure keeps its own line unbroken; the
                              cadence beside it is allowed to drop under when
                              the card is too narrow to hold both, which is
                              what used to clip "+ GST PER MONT" against the
                              next card. */}
                          <span
                            className={cn(
                              "mt-1 flex flex-wrap items-baseline gap-x-1.5 font-heading leading-none tabular-nums text-lyp-white",
                              stackOffer
                                ? "text-[21px] [@media(min-height:850px)]:text-[25px]"
                                : "text-[19px] [@media(min-height:850px)]:text-[23px]",
                            )}
                          >
                            <span className="whitespace-nowrap">
                              {formatCents(tier.target_price_cents)}
                            </span>
                            <span
                              className={cn(
                                "font-body text-[10px] uppercase tracking-[0.12em] text-lyp-white/75",
                                // Three terms in a narrowed frame have no room
                                // for the cadence beside the figure at all, so
                                // it takes the line under it outright.
                                tightFrame && tierCount >= 3 && "w-full",
                              )}
                            >
                              {t("plusGst")} {periodLabel}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                </div>
              ) : (
                <div className="flex min-w-0 flex-1 flex-wrap items-end gap-x-6 gap-y-2">
                  <div className="min-w-0">
                    {hasDiscount && (
                      <p className="whitespace-nowrap font-body text-[13px] leading-none text-lyp-white/70 line-through [@media(min-height:850px)]:text-sm">
                        {formatCents(displayList)} {t("plusGst")}
                      </p>
                    )}
                    {/* The figure never breaks; its "+ GST" drops under it when
                        the row runs out of width instead of running off the
                        panel — which is how "$1,595 + G" happened, on the one
                        service whose label column carries a two-line note
                        beside it. */}
                    <p className="mt-1.5 flex flex-wrap items-baseline gap-x-1.5 font-heading text-[32px] leading-none tabular-nums text-lyp-white [@media(min-height:850px)]:text-[42px]">
                      <span className="whitespace-nowrap">
                        {formatCents(displayTarget)}
                      </span>
                      <span className="text-[15px] text-lyp-white/80 [@media(min-height:850px)]:text-[18px]">
                        {t("plusGst")}
                      </span>
                    </p>
                    <p className="mt-1.5 font-body text-[10px] uppercase tracking-[0.22em] text-lyp-white/75 [@media(min-height:850px)]:text-[11px]">
                      {periodLabel}
                    </p>
                  </div>
                  {hasDiscount && savingsCents > 0 && (
                    <p className="pb-1 font-body text-[11px] text-lyp-gold [@media(min-height:850px)]:text-xs">
                      {t("savingLine", {
                        amount: formatCents(savingsCents),
                        period: periodLabel,
                      })}
                    </p>
                  )}
                </div>
              )}

            </div>

          </Reveal>

          {/* A tiered service has already been decided by its term cards —
              ticking one is what puts it in the basket — so there is nothing
              left for this bar to ask. It stays for the single-price services,
              which have no other way in. */}
          {!hasTiers && wantToggle}
          </div>
        </div>

        {hasArtwork && (
          <PictureRail
            images={images}
            logos={logos}
            alt={service.name}
            delay={D_RAIL}
          />
        )}
      </div>
    </article>
  );
}
