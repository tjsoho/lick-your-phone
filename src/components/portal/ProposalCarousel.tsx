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

function CarouselInner() {
  const { pages, currentPage, setCurrentPage, selectedCount } = useProposal()

  const goNext = useCallback(() => {
    setCurrentPage(Math.min(currentPage + 1, pages.length - 1))
  }, [currentPage, pages.length, setCurrentPage])

  const goPrev = useCallback(() => {
    setCurrentPage(Math.max(currentPage - 1, 0))
  }, [currentPage, setCurrentPage])

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

  const hasTop = selectedCount > 0
  const isSummary = page.slug === "summary"
  const showRunningTotal = hasTop && !isSummary
  const topPad = showRunningTotal ? "pt-[52px]" : ""

  return (
    <div className="relative flex h-dvh flex-col portal-bg">
      {showRunningTotal && <RunningTotal />}

      <div className={`flex-1 overflow-hidden pb-[56px] ${topPad}`}>
        <div className="mx-auto h-full max-w-[1400px]">
          <motion.div
            key={page.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.25 }}
            className="h-full"
          >
            <PageRenderer page={page} />
          </motion.div>
        </div>
      </div>

      {/* Navigation bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-lyp-white/10 bg-lyp-black/80 backdrop-blur-md">
        <div className="h-0.5 w-full bg-lyp-white/5">
          <div
            className="h-0.5 bg-lyp-cherry transition-all duration-300"
            style={{ width: `${((currentPage + 1) / pages.length) * 100}%` }}
          />
        </div>

        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-3">
          <button
            onClick={goPrev}
            disabled={currentPage === 0}
            className="flex items-center gap-1.5 rounded-lg border border-lyp-white/20 px-4 py-2 font-body text-sm text-lyp-white transition-colors hover:bg-lyp-white/10 disabled:opacity-20"
          >
            <ChevronLeft className="h-5 w-5" />
            Back
          </button>

          <span className="font-body text-sm text-lyp-white/60">
            {currentPage + 1} / {pages.length}
          </span>

          <button
            onClick={goNext}
            disabled={currentPage === pages.length - 1}
            className="flex items-center gap-1.5 rounded-lg bg-lyp-cherry px-5 py-2 font-body text-sm font-semibold text-lyp-white transition-colors hover:bg-lyp-cherry/90 disabled:opacity-20"
          >
            Next
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  )
}

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
