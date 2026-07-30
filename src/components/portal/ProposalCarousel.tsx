"use client"

import { useCallback, useEffect } from "react"
import { motion } from "framer-motion"
import { ChevronLeft, ChevronRight } from "lucide-react"
import {
  ProposalProvider,
  useProposal,
  type ProposalData,
  type PageData,
  type Service,
} from "./ProposalContext"
import RunningTotal from "./RunningTotal"
import ServicePage from "./pages/ServicePage"
import ContentPage from "./pages/ContentPage"
import SummaryPage from "./pages/SummaryPage"

/* ------------------------------------------------------------------ */
/*  Page renderer — dispatches to the right template                  */
/* ------------------------------------------------------------------ */

function PageRenderer({ page }: { page: PageData }) {
  const { services } = useProposal()

  if (page.type === "service" && page.serviceId) {
    const service = services.find((s) => s.id === page.serviceId)
    if (service) return <ServicePage service={service} />
  }

  if (page.slug === "summary") {
    return <SummaryPage />
  }

  return <ContentPage page={page} />
}

/* ------------------------------------------------------------------ */
/*  Inner carousel (needs context)                                    */
/* ------------------------------------------------------------------ */

function CarouselInner() {
  const { pages, currentPage, setCurrentPage, selectedCount } = useProposal()

  const goNext = useCallback(() => {
    setCurrentPage(Math.min(currentPage + 1, pages.length - 1))
  }, [currentPage, pages.length, setCurrentPage])

  const goPrev = useCallback(() => {
    setCurrentPage(Math.max(currentPage - 1, 0))
  }, [currentPage, setCurrentPage])

  // Keyboard navigation
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault()
        goNext()
      }
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault()
        goPrev()
      }
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [goNext, goPrev])

  const page = pages[currentPage]
  if (!page) return null

  const hasBottom = selectedCount > 0

  return (
    <div className="relative flex h-dvh flex-col bg-lyp-black">
      {/* Page content */}
      <div className={`flex-1 overflow-hidden ${hasBottom ? "pb-14" : ""}`}>
        <motion.div
          key={page.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="h-full"
        >
          <PageRenderer page={page} />
        </motion.div>
      </div>

      {/* Navigation bar */}
      <div
        className={`fixed left-0 right-0 z-40 flex items-center justify-between border-t border-lyp-white/10 bg-lyp-black/90 px-6 py-3 backdrop-blur-sm ${
          hasBottom ? "bottom-14" : "bottom-0"
        }`}
      >
        <button
          onClick={goPrev}
          disabled={currentPage === 0}
          className="flex items-center gap-1 font-body text-sm text-lyp-white/60 transition-colors hover:text-lyp-white disabled:opacity-20 disabled:hover:text-lyp-white/60"
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </button>

        {/* Progress */}
        <div className="flex items-center gap-1.5">
          {pages.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentPage(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === currentPage
                  ? "w-6 bg-lyp-cherry"
                  : "w-1.5 bg-lyp-white/20 hover:bg-lyp-white/40"
              }`}
            />
          ))}
        </div>

        <button
          onClick={goNext}
          disabled={currentPage === pages.length - 1}
          className="flex items-center gap-1 font-body text-sm text-lyp-white/60 transition-colors hover:text-lyp-white disabled:opacity-20 disabled:hover:text-lyp-white/60"
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Running total bar */}
      <RunningTotal />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Exported wrapper that sets up the provider                        */
/* ------------------------------------------------------------------ */

interface ProposalCarouselProps {
  proposal: ProposalData
  pages: PageData[]
  services: Service[]
}

export default function ProposalCarousel({
  proposal,
  pages,
  services,
}: ProposalCarouselProps) {
  return (
    <ProposalProvider proposal={proposal} pages={pages} services={services}>
      <CarouselInner />
    </ProposalProvider>
  )
}
