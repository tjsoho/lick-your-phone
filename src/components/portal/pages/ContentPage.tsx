"use client";

import Image from "next/image";
import { useProposal, type PageData } from "../ProposalContext";
import ContentBlockRenderer from "./ContentBlockRenderer";
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
      <div className="flex h-full flex-col items-center justify-center px-6 text-center">
        <div className="mb-10">
          <h1 className="font-heading text-6xl md:text-8xl text-lyp-white tracking-tight uppercase">
            Lick<span className="text-lyp-cherry">Your</span>Phone
          </h1>
          <div className="mt-3 h-1 w-32 mx-auto bg-lyp-cherry rounded-full" />
        </div>
        <p className="font-body text-sm text-lyp-white/60 mb-3 tracking-[0.3em] uppercase">
          Proposal prepared for
        </p>
        <h2 className="font-heading text-4xl md:text-5xl text-lyp-white mb-2">
          {proposal.clientName}
        </h2>
        <p className="font-body text-xl text-lyp-white/50">
          {proposal.venueName}
        </p>
        {proposal.status === "signed" && (
          <div className="mt-8 flex flex-col items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full bg-green-500/15 px-4 py-1.5 font-body text-sm text-green-400 ring-1 ring-green-500/30">
              <span className="h-2 w-2 rounded-full bg-green-400" />
              Proposal signed
            </span>
            <button
              onClick={() => {
                const idx = pages.findIndex((p) => p.slug === "summary");
                if (idx !== -1) setCurrentPage(idx);
              }}
              className="rounded-lg bg-lyp-cherry px-6 py-2.5 font-body text-sm font-semibold text-lyp-white transition-colors hover:bg-lyp-cherry/90"
            >
              View Summary
            </button>
          </div>
        )}
      </div>
    );
  }

  if (slug === "signature") return <SignaturePage />;
  if (slug === "payment") return <PaymentPage />;
  // if (slug === "intake") return <IntakeFormWrapper />
  if (slug === "summary") return null;

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="flex-1 px-8 py-12 md:px-16 lg:px-24">
        {page.title && (
          <h1 className="font-heading text-4xl md:text-6xl text-lyp-white mb-10 uppercase tracking-tight">
            {page.title}
          </h1>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* Kiri: Konten Teks (mengambil 7 kolom) */}
          <div className="lg:col-span-7">
            <ContentBlockRenderer blocks={page.contentBlocks} />
          </div>

          {/* Kanan: Gambar (mengambil 5 kolom) */}
          {page.featuredImage && (
            <div className="lg:col-span-5 relative">
              {/* Opsi 'sticky' agar gambar tetap terlihat saat teks di-scroll (hapus 'sticky top-10' jika tidak suka efeknya) */}
              <div className="sticky top-10 overflow-hidden rounded-2xl border border-lyp-white/10 shadow-xl">
                <Image
                  src={page.featuredImage}
                  alt={page.title || "Page illustration"}
                  className="w-full h-auto object-cover aspect-[4/3] md:aspect-auto"
                  width={800}
                  height={600}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
