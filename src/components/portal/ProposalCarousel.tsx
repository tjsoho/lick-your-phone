"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  ProposalProvider,
  useProposal,
  type ProposalData,
  type PageData,
  type Selection,
} from "./ProposalContext";
import RunningTotal from "./RunningTotal";
import ServicePage from "./pages/ServicePage";
import ContentPage from "./pages/ContentPage";
import SummaryPage from "./pages/SummaryPage";
import PaymentPage from "./pages/PaymentPage";
import SignaturePage from "./pages/SignaturePage";
import PortalBackground from "./PortalBackground";
import { SIZES } from "./pages/ContentBlockRenderer";

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

function PageRenderer({ page }: { page: PageData }) {
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
  const { pages, currentPage, setCurrentPage, selectedCount } = useProposal();
  const reduceMotion = useReducedMotion();

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

  const goNext = useCallback(() => {
    setCurrentPage(Math.min(currentPage + 1, pages.length - 1));
  }, [currentPage, pages.length, setCurrentPage]);

  const goPrev = useCallback(() => {
    setCurrentPage(Math.max(currentPage - 1, 0));
  }, [currentPage, setCurrentPage]);

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
  const showRunningTotal = hasTop && !isSummary;
  const topPad = showRunningTotal ? "pt-[52px]" : "";

  return (
    <div className="relative flex h-dvh flex-col bg-[#050203]">
      <PortalBackground />
      {showRunningTotal && <RunningTotal />}

      <div className={`relative z-10 flex-1 overflow-hidden pb-[56px] ${topPad}`}>
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
            disabled={currentPage === 0}
            className="group flex items-center gap-1.5 rounded-lg border border-lyp-white/20 px-4 py-2 font-body text-sm text-lyp-white transition-[background-color,transform] duration-300 ease-brand hover:bg-lyp-white/10 active:scale-[0.97] disabled:opacity-20 motion-reduce:transition-none motion-reduce:active:scale-100"
          >
            <ChevronLeft className="h-5 w-5 transition-transform duration-300 ease-brand group-hover:-translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0" />
            Back
          </button>

          {/* The counter re-keys on the page index, so the number itself
              changes with a beat instead of snapping. */}
          <span className="font-body text-sm text-lyp-white/60">
            <span
              key={currentPage}
              className="portal-reveal portal-reveal-fade inline-block tabular-nums"
              style={{ animationDelay: "0ms", animationDuration: "420ms" }}
            >
              {currentPage + 1} / {pages.length}
            </span>
          </span>

          <button
            onClick={goNext}
            disabled={currentPage === pages.length - 1}
            className="group flex items-center gap-1.5 rounded-lg bg-lyp-cherry px-5 py-2 font-body text-sm font-semibold text-lyp-white transition-[background-color,transform] duration-300 ease-brand hover:bg-lyp-cherry/90 active:scale-[0.97] disabled:opacity-20 motion-reduce:transition-none motion-reduce:active:scale-100"
          >
            Next
            <ChevronRight className="h-5 w-5 transition-transform duration-300 ease-brand group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0" />
          </button>
        </div>
      </div>
    </div>
  );
}

export interface ProposalCarouselProps {
  proposal: ProposalData;
  pages: PageData[];
  services: ServiceWithTiersWithInclusionsWithObligationsWithDisclaimers[];
  savedSelections?: Selection[] | null;
  paymentCaptured?: boolean;
}

export default function ProposalCarousel({
  proposal,
  pages,
  services,
  savedSelections,
  paymentCaptured,
}: ProposalCarouselProps) {
  return (
    <ProposalProvider
      proposal={proposal}
      pages={pages}
      services={services}
      initialSelections={savedSelections ?? undefined}
      paymentCaptured={paymentCaptured}
    >
      <CarouselInner />
    </ProposalProvider>
  );
}
