"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
    ArrowUpRight,
    ChevronDown,
    Facebook,
    Instagram,
    Linkedin,
    X,
    Youtube,
} from "lucide-react";
import { NavLink, defaultNavLinks } from "@/data/navigation";
import { ensureAbsoluteUrl } from "@/utils/url";

interface BubbleMenuMobileProps {
    isOpen: boolean;
    onClose: () => void;
    headerButtonText?: string;
    navItems?: NavLink[];
    socialMedia?: {
        instagram?: string;
        facebook?: string;
        youtube?: string;
        pinterest?: string;
        linkedin?: string;
        tiktok?: string;
    };
}

/* ──────────────────────────────────────────────────────────────────────────
   Mobile BubbleMenu — full-screen brand-cream sheet that slides up.
   Shares the numbered + animated-arrow design language of the desktop
   panel so the mobile UX feels like the same product.
   ────────────────────────────────────────────────────────────────────────── */

const BubbleMenuMobile = ({
    isOpen,
    onClose,
    headerButtonText = "Contact Us",
    navItems,
    socialMedia,
}: BubbleMenuMobileProps) => {
    const links: NavLink[] =
        navItems && navItems.length > 0 ? navItems : defaultNavLinks;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className="fixed inset-0 z-50 bg-brand-cream flex flex-col overflow-hidden"
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 24, transition: { duration: 0.25 } }}
                    transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                >
                    {/* Decorative radial tint */}
                    <div
                        aria-hidden
                        className="absolute inset-0 pointer-events-none"
                        style={{
                            backgroundImage:
                                "radial-gradient(ellipse at 100% 0%, rgba(146, 214, 69, 0.18) 0%, rgba(146, 214, 69, 0) 55%)",
                        }}
                    />

                    {/* Top bar */}
                    <div className="relative z-10 flex items-center justify-between px-5 py-4">
                        <Link
                            href="/"
                            aria-label="Home"
                            onClick={onClose}
                            className="flex items-center text-lg font-semibold tracking-tight text-brand-black"
                        >
                            {/* Wordmark — swap for a logo when branding */}
                            Brand
                        </Link>
                        <button
                            onClick={onClose}
                            aria-label="Close menu"
                            className="w-10 h-10 bg-brand-black text-white rounded-full flex items-center justify-center hover:bg-brand-green hover:text-white transition-colors"
                        >
                            <X className="w-5 h-5" strokeWidth={2.5} />
                        </button>
                    </div>

                    {/* Section label */}
                    <motion.div
                        className="relative z-10 px-5 pb-2"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15, duration: 0.3 }}
                    >
                        <span className="!text-[10px] !font-semibold uppercase tracking-[0.22em] text-brand-green">
                            Menu
                        </span>
                    </motion.div>

                    {/* Nav list */}
                    <nav className="relative z-10 flex-1 overflow-y-auto px-5">
                        <ul className="flex flex-col">
                            {links.map((link, i) => (
                                <MobileNavRow
                                    key={link.id}
                                    link={link}
                                    index={i}
                                    onClose={onClose}
                                />
                            ))}
                        </ul>
                    </nav>

                    {/* Footer */}
                    <motion.div
                        className="relative z-10 border-t border-brand-black/10 bg-white/50 backdrop-blur-sm px-5 py-5 flex flex-col gap-4"
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3, duration: 0.35 }}
                    >
                        <Link
                            href="#"
                            onClick={onClose}
                            className="group/cta flex items-center justify-between gap-3 w-full px-5 py-3.5 bg-brand-green text-white rounded-full font-semibold text-base hover:bg-brand-black hover:text-white transition-colors shadow-sm"
                        >
                            <span>{headerButtonText}</span>
                            <span className="w-7 h-7 flex items-center justify-center rounded-full bg-brand-black/10 group-hover/cta:bg-brand-green/15 transition-colors">
                                <ArrowUpRight
                                    className="w-4 h-4 transition-transform duration-300 group-hover/cta:translate-x-0.5 group-hover/cta:-translate-y-0.5"
                                    strokeWidth={2.5}
                                />
                            </span>
                        </Link>
                        <div className="flex items-center justify-end gap-4">
                            <SocialIcons socialMedia={socialMedia} />
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default BubbleMenuMobile;

/* ────────────────────────────────────────────────────────────────────────── */

function MobileNavRow({
    link,
    index,
    onClose,
}: {
    link: NavLink;
    index: number;
    onClose: () => void;
}) {
    const [expanded, setExpanded] = useState(false);
    const hasChildren = link.children && link.children.length > 0;

    return (
        <motion.li
            className="border-b border-brand-black/10 last:border-b-0"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
                delay: 0.1 + index * 0.05,
                duration: 0.35,
                ease: [0.22, 1, 0.36, 1],
            }}
        >
            <div className="flex items-stretch">
                {/* Main link area */}
                {link.pageSlug ? (
                    <Link
                        href={link.pageSlug}
                        onClick={onClose}
                        className="group/row flex-1 flex items-center gap-4 py-5"
                    >
                        <span className="font-poppins font-medium text-brand-black text-[26px] leading-[1.1] tracking-[-0.02em] flex-1 group-hover/row:text-brand-green/90 transition-colors">
                            {link.label}
                        </span>
                        <span className="shrink-0 w-8 h-8 rounded-full bg-brand-black/[0.06] flex items-center justify-center text-brand-black/60 group-hover/row:bg-brand-green group-hover/row:text-white transition-all duration-300">
                            <ArrowUpRight
                                className="w-3.5 h-3.5"
                                strokeWidth={2.5}
                            />
                        </span>
                    </Link>
                ) : (
                    <div className="flex-1 flex items-center gap-4 py-5">
                        <span className="font-poppins font-medium text-brand-black text-[26px] leading-[1.1] tracking-[-0.02em] flex-1">
                            {link.label}
                        </span>
                    </div>
                )}

                {/* Expand chevron */}
                {hasChildren && (
                    <button
                        type="button"
                        onClick={() => setExpanded((v) => !v)}
                        aria-label={expanded ? "Collapse" : "Expand"}
                        aria-expanded={expanded}
                        className="px-3 flex items-center justify-center text-brand-black/50 hover:text-brand-green transition-colors"
                    >
                        <ChevronDown
                            className={`w-5 h-5 transition-transform duration-300 ${expanded ? "rotate-180" : ""}`}
                        />
                    </button>
                )}
            </div>

            {/* Expanded children */}
            <AnimatePresence initial={false}>
                {hasChildren && expanded && (
                    <motion.div
                        key="children"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{
                            duration: 0.3,
                            ease: [0.4, 0, 0.2, 1],
                        }}
                        className="overflow-hidden"
                    >
                        <div className="pb-4 pl-10 pr-3 flex flex-col gap-3">
                            {link.children.map((child) => {
                                const grandchildren = child.children || [];
                                if (grandchildren.length > 0) {
                                    return (
                                        <div
                                            key={child.id}
                                            className="flex flex-col gap-1.5"
                                        >
                                            {child.pageSlug ? (
                                                <Link
                                                    href={child.pageSlug}
                                                    onClick={onClose}
                                                    className="!text-[11px] !font-semibold uppercase tracking-[0.18em] text-brand-green w-fit"
                                                >
                                                    {child.label}
                                                </Link>
                                            ) : (
                                                <span className="!text-[11px] !font-semibold uppercase tracking-[0.18em] text-brand-green">
                                                    {child.label}
                                                </span>
                                            )}
                                            <div className="flex flex-col gap-1.5">
                                                {grandchildren.map((leaf) => (
                                                    <Link
                                                        key={leaf.id}
                                                        href={
                                                            leaf.pageSlug || "#"
                                                        }
                                                        onClick={onClose}
                                                        className="group/sub inline-flex items-center gap-2 text-base font-medium text-brand-black/70 hover:text-brand-black transition-colors w-fit"
                                                    >
                                                        <span className="w-4 h-px bg-brand-black/25 group-hover/sub:w-6 group-hover/sub:bg-brand-green transition-all duration-300" />
                                                        {leaf.label}
                                                    </Link>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                }
                                return (
                                    <Link
                                        key={child.id}
                                        href={child.pageSlug || "#"}
                                        onClick={onClose}
                                        className="group/sub inline-flex items-center gap-2 text-base font-medium text-brand-black/70 hover:text-brand-black transition-colors w-fit"
                                    >
                                        <span className="w-4 h-px bg-brand-black/25 group-hover/sub:w-6 group-hover/sub:bg-brand-green transition-all duration-300" />
                                        {child.label}
                                    </Link>
                                );
                            })}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.li>
    );
}

function SocialIcons({
    socialMedia,
}: {
    socialMedia?: BubbleMenuMobileProps["socialMedia"];
}) {
    if (!socialMedia) return null;
    const items = [
        { url: socialMedia.instagram, Icon: Instagram, label: "Instagram" },
        { url: socialMedia.facebook, Icon: Facebook, label: "Facebook" },
        { url: socialMedia.youtube, Icon: Youtube, label: "YouTube" },
        { url: socialMedia.linkedin, Icon: Linkedin, label: "LinkedIn" },
    ];
    const visible = items.filter((it) => it.url && ensureAbsoluteUrl(it.url));
    if (visible.length === 0) return null;
    return (
        <div className="flex items-center gap-1.5">
            {visible.map(({ url, Icon, label }) => (
                <a
                    key={label}
                    href={ensureAbsoluteUrl(url!)}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-brand-black/[0.06] text-brand-black hover:bg-brand-green transition-colors"
                >
                    <Icon className="w-3.5 h-3.5" />
                </a>
            ))}
        </div>
    );
}
