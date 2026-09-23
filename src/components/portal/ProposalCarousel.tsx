"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  ProposalProvider,
  useProposal,
  useCopy,
  type ProposalData,
  type PageData,
  type Selection,
  type AgreementCopy,
} from "./ProposalContext";
import type { CopyOverrides } from "@/lib/portal-copy";
import RunningTotal from "./RunningTotal";
import SelectionCart, {
  CART_GUTTER_CLASS,
  useCartOpen,
} from "./SelectionCart";
import DiscountCountdown from "./DiscountCountdown";
import ServicePage from "./pages/ServicePage";
import ContentPage from "./pages/ContentPage";
import SummaryPage from "./pages/SummaryPage";
import PaymentPage from "./pages/PaymentPage";
import SignaturePage from "./pages/SignaturePage";
import PortalBackground from "./PortalBackground";
import FlowProgress from "./FlowProgress";
import { SIZES } from "./pages/ContentBlockRenderer";

/**
 * The closing stretch: the slides that are a checkout rather than a read.
 * Here the page counter gives its slot to the three-stage tracker, because
 * what is left to DO is the only number that means anything this late. Through
 * the deck the counter stays — "agreement / payment / onboarding" under slide
 * 6 of 24 would say nothing about the twenty-three pages either side of it.
 *
 * `intake` is listed although onboarding is normally its own route rather than
 * a slide: if a deck ever carries it, it belongs to this stretch too.
 */
const CLOSING_SLUGS = ["summary", "signature", "payment", "intake"];

/**
 * Slides that carry their own way forward, so the bar's Next would be a
 * second and wronger exit. Signing turns the page itself, and the payment
 * slide hands over to onboarding once the details are captured.
 */
const SELF_ADVANCING_SLUGS = ["signature", "payment"];

/**
 * The `sizes` the NEXT slide's featured image will be requested with, or null
 * when it cannot be predicted exactly.
 *
 * Warming the cache is only worth doing if the warm request is byte-identical
 * to the real one — a different `sizes` picks a different srcset candidate,
 * which means a different `/_next/image?w=` URL and a wasted download rather
 * than a saved one. So this covers only the shapes whose featured image has
 * one unambiguous size (service spreads, statement slides, and the plain
 * two-column content page) and declines the rest.
 */
function predictFeaturedSizes(page: PageData | undefined): string | null {
  if (!page?.featuredImage) return null;

  // The cover already carries `priority`, and these three have no picture.
  if (page.slug && ["cover", "summary", "payment", "signature"].includes(page.slug))
    return null;

  if (page.type === "service" && page.serviceId) return SIZES.main;

  const blocks = page.contentBlocks.filter((b) => b.type !== "offset_image");

  // A page with no blocks at all is a statement slide — the same test
  // ContentPage uses to pick that branch.
  if (blocks.length === 0) return SIZES.statement;

  // The showcase and results branches size their pictures from the number of
  // images on the page, so leave them alone rather than guess.
  const SKIP = ["media_carousel", "collage", "logos", "image", "results"];
  if (blocks.some((b) => b.type && SKIP.includes(b.type))) return null;

  return SIZES.main;
}

/**
 * Warms the next slide's picture while the current one is being read.
 *
 * The carousel mounts one page at a time, so every page turn used to start its
 * images from nothing. This renders the next page's featured image into a
 * zero-size, clipped box: it never participates in layout, cannot add a pixel
 * of scroll, and carries no reveal — but the browser fetches it, so by the time
 * the slide is turned the bytes are already in cache.
 *
 * `loading="eager"` is required: inside a 0x0 box the lazy-loading observer
 * would never consider it in view and it would never load at all.
 */
function NextSlideWarmup({ page }: { page: PageData | undefined }) {
  const sizes = predictFeaturedSizes(page);
  if (!sizes || !page?.featuredImage) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute h-0 w-0 overflow-hidden opacity-0"
    >
      <Image
        src={page.featuredImage}
        alt=""
        sizes={sizes}
        loading="eager"
        width={800}
        height={600}
      />
    </div>
  );
}

/**
 * The reading-width cap used to sit on the scroll column, which meant nothing
 * inside a page could ever be wider than 1400px — a full-bleed band was
 * impossible. The cap now belongs to each page, so a page that wants to run
 * edge to edge simply does not apply it.
 */
function Capped({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto h-full w-full max-w-[1400px]">{children}</div>;
}

/**
 * Renders one slide exactly as the client sees it. Exported so the admin
 * live preview draws from this same code path rather than a second
 * implementation that would drift.
 */
export function PageRenderer({ page }: { page: PageData }) {
  const { services } = useProposal();

  if (page.type === "service" && page.serviceId) {
    const service = services.find((s) => s.id === page.serviceId);
    if (service)
      return (
        <Capped>
          <ServicePage service={service} page={page} />
        </Capped>
      );
  }

  if (page.slug === "summary") {
    return (
      <Capped>
        <SummaryPage />
      </Capped>
    );
  }

  if (page.slug === "payment") {
    return (
      <Capped>
        <PaymentPage />
      </Capped>
    );
  }

  if (page.slug === "signature") {
    return (
      <Capped>
        <SignaturePage />
      </Capped>
    );
  }

  // ContentPage caps itself, so its showcase layout can be full-bleed.
  return <ContentPage page={page} />;
}

/* -------------------------------------------------------------------------
   THE PAGE TRANSITION

   A deck, not a slideshow. The incoming slide arrives from the direction you
   are travelling — from the right on Next, from the left on Back — and settles
   on `ease-brand`, so the two gestures are visibly opposites rather than the
   same crossfade played twice. It comes in fractionally oversized and relaxes
   to true, which is what gives the arrival weight.

   No AnimatePresence and no exit animation, deliberately. `mode="wait"` hangs
   in this tree (the outgoing page never unmounts and navigation dies), and
   `mode="sync"` would mount two slides at once — two full-height children in
   the same flow column, which doubles the scroller's height and puts a
   scrollbar on a portal that must never scroll. One keyed child, always.

   The motion element sits OUTSIDE `.portal-scroll` and inside the
   `overflow-hidden` frame: an x-translate on an `overflow-y: auto` element
   makes its x axis scrollable too, and would flash a horizontal scrollbar on
   every page turn.
   ------------------------------------------------------------------------- */
/** ease-brand, as a framer cubic-bezier array. */
const BRAND_EASE = [0.32, 0.72, 0, 1] as const;

function CarouselInner() {
  const {
    pages,
    currentPage,
    setCurrentPage,
    selectedCount,
    proposal,
    discountLive,
    paymentCaptured,
  } = useProposal();
  const reduceMotion = useReducedMotion();
  const t = useCopy("global");
  const { open: cartOpen, setOpen: setCartOpen } = useCartOpen(proposal.token);

  // Direction is resolved DURING render, not in an effect: the incoming slide
  // has to know which way it is travelling on the very first frame it paints.
  // Both refs only ever move together, so a repeated render with an unchanged
  // index (StrictMode's double pass) is a no-op.
  const lastIndex = useRef(currentPage);
  const direction = useRef(1);
  if (lastIndex.current !== currentPage) {
    direction.current = currentPage > lastIndex.current ? 1 : -1;
    lastIndex.current = currentPage;
  }

  // The warm-up waits a beat so it never competes with the slide the client is
  // actually looking at. Re-armed on every page change.
  const [warmNext, setWarmNext] = useState(false);
  useEffect(() => {
    setWarmNext(false);
    const id = setTimeout(() => setWarmNext(true), 700);
    return () => clearTimeout(id);
  }, [currentPage]);

  // Once signed, the pages after the signature only move forward: the deal is
  // done, so there's nothing to go back and change.
  const signatureIndex = pages.findIndex((p) => p.slug === "signature");
  const backLocked =
    (proposal.status === "signed" || proposal.status === "intake_complete") &&
    signatureIndex >= 0 &&
    currentPage > signatureIndex;

  // Read before the callbacks, so the arrow keys obey the same lock the Next
  // button does — a hidden button that a keypress walks straight past would
  // only be half a decision.
  const currentSlug = pages[currentPage]?.slug ?? null;
  // A slide only keeps Next off itself while it really does carry the client
  // onward. Once the card is on file the signature slide is a confirmation
  // with nothing left to trigger, and hiding Next there would strand them.
  const nextLocked =
    !!currentSlug &&
    SELF_ADVANCING_SLUGS.includes(currentSlug) &&
    !(currentSlug === "signature" && paymentCaptured);

  const goNext = useCallback(() => {
    if (nextLocked) return;
    setCurrentPage(Math.min(currentPage + 1, pages.length - 1));
  }, [currentPage, nextLocked, pages.length, setCurrentPage]);

  const goPrev = useCallback(() => {
    if (backLocked) return;
    setCurrentPage(Math.max(currentPage - 1, 0));
  }, [backLocked, currentPage, setCurrentPage]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        goNext();
      }
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        goPrev();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [goNext, goPrev]);

  const page = pages[currentPage];

  if (!page) return null;

  const hasTop = selectedCount > 0;
  const isSummary = page.slug === "summary";
  // The counter's slot goes to the stage tracker from the summary onwards.
  const showFlow = !!page.slug && CLOSING_SLUGS.includes(page.slug);
  // Once signed, the selection is locked in — the running total stops being
  // a shopping aid and just follows the client through onboarding.
  const isSigned = proposal.status === "signed" || proposal.status === "intake_complete";
  const showRunningTotal = hasTop && !isSummary && !isSigned;
  // The countdown is a buying aid too, so it goes once the client has signed.
  const showTimer = discountLive && !isSigned && !!proposal.discountExpiresAt;
  // The fixed bars sit outside the flow, so the slide has to reserve their
  // height itself: the countdown strip is 44px (h-11), the price bar 52px. On
  // sm and up the price bar carries the countdown, so only one bar is on
  // screen and the strip's 44px comes back.
  const topPad =
    showTimer && showRunningTotal
      ? "pt-[96px] sm:pt-[52px]"
      : showRunningTotal
        ? "pt-[52px]"
        : showTimer
          ? "pt-11"
          : "";

  // The basket is the price bar's own panel, so it follows the bar's rule:
  // gone on the summary slide (which is the same list at full size) and gone
  // for good once the proposal is signed. It does NOT follow the bar's
  // selection count, though — removing the last line should leave an empty
  // basket open to say so, rather than snapping it shut mid-gesture.
  const showCart = cartOpen && !isSummary && !isSigned;
  // Where the rail hangs from on `sm` and up: under the price bar when it is
  // there, otherwise under the countdown strip, otherwise the top of the page.
  const cartTopOffset = showRunningTotal ? 52 : showTimer ? 44 : 0;

  return (
    <div className="relative flex h-dvh flex-col bg-[#050203]">
      <PortalBackground />
      {(showTimer || showRunningTotal) && (
        <div className="fixed left-0 right-0 top-0 z-50">
          {showTimer && (
            <DiscountCountdown
              expiresAt={proposal.discountExpiresAt!}
              // On wider screens the price bar carries the countdown itself.
              className={showRunningTotal ? "sm:hidden" : undefined}
            />
          )}
          {showRunningTotal && (
            <RunningTotal
              countdownEndsAt={showTimer ? proposal.discountExpiresAt : null}
              cartOpen={showCart}
              onToggleCart={() => setCartOpen(!showCart)}
            />
          )}
        </div>
      )}

      <SelectionCart
        open={showCart}
        onClose={() => setCartOpen(false)}
        topOffset={cartTopOffset}
      />

      {/* The slide column gives up the rail's width rather than sitting under
          it, so a page stays centred in what it actually has and still never
          scrolls. On a phone the basket is a sheet over the top, so there is
          nothing to give up. */}
      <div
        className={`relative z-10 flex-1 overflow-hidden pb-[56px] ${topPad} ${
          showCart ? CART_GUTTER_CLASS : ""
        }`}
      >
        <motion.div
          key={page.id}
          initial={
            reduceMotion
              ? false
              : { opacity: 0, x: direction.current * 60, scale: 1.012 }
          }
          animate={{
            opacity: 1,
            x: 0,
            scale: 1,
            transition: reduceMotion
              ? { duration: 0 }
              : { duration: 0.56, ease: BRAND_EASE },
          }}
          className="h-full w-full"
        >
          <div className="portal-scroll h-full w-full">
            <PageRenderer page={page} />
          </div>
        </motion.div>

        {warmNext && <NextSlideWarmup page={pages[currentPage + 1]} />}
      </div>

      {/* Navigation bar. Fixed, so it survives every page change and its own
          entry runs exactly once, on load, after the first slide has settled. */}
      <div
        className="portal-reveal fixed bottom-0 left-0 right-0 z-40 border-t border-lyp-white/10 bg-lyp-black/80 backdrop-blur-md"
        style={{ animationDelay: "320ms" }}
      >
        <div className="h-0.5 w-full bg-lyp-white/5">
          {/* scaleX, not width: a width transition is a layout animation on
              every frame, and the constraint here is transform/opacity only. */}
          <div
            className="h-0.5 w-full origin-left bg-lyp-cherry transition-transform duration-700 ease-brand motion-reduce:transition-none"
            style={{
              transform: `scaleX(${(currentPage + 1) / pages.length})`,
            }}
          />
        </div>

        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-3">
          <button
            onClick={goPrev}
            disabled={currentPage === 0 || backLocked}
            // Hidden rather than removed, so Next and the counter keep their places.
            aria-hidden={backLocked}
            // `shrink-0`: the tracker that can now sit beside it is the thing
            // that gives, never the buttons.
            className={`${backLocked ? "invisible " : ""}group flex shrink-0 items-center gap-1.5 rounded-lg border border-lyp-white/20 px-4 py-2 font-body text-sm text-lyp-white transition-[background-color,transform] duration-300 ease-brand hover:bg-lyp-white/10 active:scale-[0.97] disabled:opacity-20 motion-reduce:transition-none motion-reduce:active:scale-100`}
          >
            <ChevronLeft className="h-5 w-5 transition-transform duration-300 ease-brand group-hover:-translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0" />
            {t("backButton")}
          </button>

          {/* One slot, two tenants. Both sit well inside the height the Back
              button sets, so the bar measures the same on every slide. */}
          {showFlow ? (
            <FlowProgress />
          ) : (
            /* The counter re-keys on the page index, so the number itself
               changes with a beat instead of snapping. */
            <span className="font-body text-sm text-lyp-white/60">
              <span
                key={currentPage}
                className="portal-reveal portal-reveal-fade inline-block tabular-nums"
                style={{ animationDelay: "0ms", animationDuration: "420ms" }}
              >
                {t("pageCounter", { current: currentPage + 1, total: pages.length })}
              </span>
            </span>
          )}

          <button
            onClick={goNext}
            disabled={currentPage === pages.length - 1 || nextLocked}
            // Hidden rather than removed, so Back and the tracker keep their places.
            aria-hidden={nextLocked}
            className={`${nextLocked ? "invisible " : ""}group flex shrink-0 items-center gap-1.5 rounded-lg bg-lyp-cherry px-5 py-2 font-body text-sm font-semibold text-lyp-white transition-[background-color,transform] duration-300 ease-brand hover:bg-lyp-cherry/90 active:scale-[0.97] disabled:opacity-20 motion-reduce:transition-none motion-reduce:active:scale-100`}
          >
            {t("nextButton")}
            <ChevronRight className="h-5 w-5 transition-transform duration-300 ease-brand group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0" />
          </button>
        </div>
      </div>
    </div>
  );
}

export interface ProposalCarouselProps {
  proposal: ProposalData;
  agreement?: AgreementCopy;
  pages: PageData[];
  services: ServiceWithTiersWithInclusionsWithObligationsWithDisclaimers[];
  savedSelections?: Selection[] | null;
  paymentCaptured?: boolean;
  discountOverrides?: Record<string, number>;
  /** Wording overrides for the structural pages, keyed by slug. */
  pageCopy?: Record<string, CopyOverrides>;
}

export default function ProposalCarousel({
  proposal,
  agreement,
  pages,
  services,
  savedSelections,
  paymentCaptured,
  discountOverrides,
  pageCopy,
}: ProposalCarouselProps) {
  return (
    <ProposalProvider
      proposal={proposal}
      agreement={agreement}
      pages={pages}
      services={services}
      initialSelections={savedSelections ?? undefined}
      paymentCaptured={paymentCaptured}
      discountOverrides={discountOverrides}
      pageCopy={pageCopy}
    >
      <CarouselInner />
    </ProposalProvider>
  );
}
