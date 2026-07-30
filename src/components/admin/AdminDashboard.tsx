"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import AdminTiles from "@/components/admin/AdminTiles";
import { ExternalLink } from "lucide-react";

const tabFade = {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] as const },
};

export default function AdminDashboard() {
    return (
        <main className="min-h-screen bg-gradient-to-br from-brand-cream/40 via-white to-brand-green/5">
            {/* Header */}
            <header className="border-b border-[rgba(18,23,23,0.10)] bg-white/70 backdrop-blur-sm sticky top-0 z-30">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                        <span className="text-lg font-semibold tracking-tight text-brand-black">
                            Brand
                        </span>
                        <div className="hidden sm:block min-w-0 border-l border-[rgba(18,23,23,0.10)] pl-3">
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-brand-black/50 leading-none">
                                Admin
                            </p>
                            <p className="text-sm font-semibold text-brand-black leading-tight">
                                Content Management
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Link
                            href="/"
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(18,23,23,0.12)] bg-white px-3 py-1.5 text-xs font-semibold text-brand-black/75 hover:bg-[#f5f5f3] hover:text-brand-black transition-colors"
                        >
                            <ExternalLink className="w-3.5 h-3.5" />
                            View site
                        </Link>
                    </div>
                </div>
            </header>

            {/* Body */}
            <motion.div
                className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10"
                {...tabFade}
            >
                <div className="mb-10">
                    <span className="inline-block border border-brand-green/40 text-brand-green px-3 py-1 rounded-full text-xs font-semibold mb-4">
                        Website Content
                    </span>
                    <h1 className="text-3xl md:text-4xl font-medium text-brand-black mb-2 tracking-tight">
                        Edit any page in seconds.
                    </h1>
                    <p className="text-brand-black/65 text-base max-w-2xl">
                        Pick a page below to update copy, swap imagery, or
                        manage cards and CTAs. Changes are saved instantly and
                        appear live as soon as you hit save.
                    </p>
                </div>

                <AdminTiles />
            </motion.div>
        </main>
    );
}
