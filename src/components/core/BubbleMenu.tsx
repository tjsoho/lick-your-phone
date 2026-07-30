"use client";

import { motion, AnimatePresence, useInView, Variants } from "framer-motion";
import Link from "next/link";
import {
    ArrowUpRight,
    Facebook,
    Instagram,
    Linkedin,
    X,
    Youtube,
} from "lucide-react";
import React, { useRef } from "react";
import { NavLink, defaultNavLinks } from "@/data/navigation";
import { ensureAbsoluteUrl } from "@/utils/url";

interface BubbleMenuProps {
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
   Desktop BubbleMenu — half-width slide-in panel.

   - Slides in from the right at ~50vw (max 640px)
   - Brand-cream background with subtle radial green tint at top-right
   - Each top-level item rendered as a numbered display row: "01 — Home"
     with an animated arrow on the right and a brand-green underline that
     grows from the left on hover
   - Children render inline as section groups (mega-menu aware)
   - Sticky footer: solid green CTA + Privacy + socials
   ────────────────────────────────────────────────────────────────────────── */

const BubbleMenu = ({
    isOpen,
    onClose,
    headerButtonText = "Contact Us",
    navItems,
    socialMedia,
}: BubbleMenuProps) => {
    const links: NavLink[] =
        navItems && navItems.length > 0 ? navItems : defaultNavLinks;

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        className="fixed inset-0 z-40 bg-brand-black/55 backdrop-blur-md"
                        onClick={onClose}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                    />

                    {/* Slide-in panel */}
                    <motion.aside
                        className="fixed top-0 right-0 bottom-0 z-50 w-full sm:w-[560px] lg:w-[640px] bg-brand-cream shadow-2xl flex flex-col overflow-hidden"
                        initial={{ x: "100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "100%" }}
                        transition={{
                            duration: 0.5,
                            ease: [0.22, 1, 0.36, 1],
                        }}
                    >
                        {/* Decorative tint — sits behind everything */}
                        <div
                            aria-hidden
                            className="absolute inset-0 pointer-events-none"
                            style={{
                                backgroundImage:
                                    "radial-gradient(ellipse at 100% 0%, rgba(146, 214, 69, 0.18) 0%, rgba(146, 214, 69, 0) 55%)",
                            }}
                        />
                        {/* Subtle grain overlay (low-opacity SVG noise) for texture */}
                        <div
                            aria-hidden
                            className="absolute inset-0 pointer-events-none opacity-[0.04] mix-blend-multiply"
                            style={{
                                backgroundImage:
                                    "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/></filter><rect width='200' height='200' filter='url(%23n)'/></svg>\")",
                            }}
                        />

                        {/* Top bar */}
                        <div className="relative z-10 flex items-center justify-between px-8 lg:px-10 py-6">
                            <Link
                                href="/"
                                aria-label="Home"
                                onClick={onClose}
                                className="flex items-center text-xl font-semibold tracking-tight text-brand-black"
                            >
                                {/* Wordmark — swap for a logo when branding */}
                                Brand
                            </Link>
                            <button
                                onClick={onClose}
                                aria-label="Close menu"
                                className="w-11 h-11 bg-brand-black text-white rounded-full flex items-center justify-center hover:bg-brand-green hover:text-white transition-colors"
                            >
                                <X className="w-5 h-5" strokeWidth={2.5} />
                            </button>
                        </div>

                        {/* Section label */}
                        <motion.div
                            className="relative z-10 px-8 lg:px-10 pb-3"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2, duration: 0.4 }}
                        >
                            <span className="!text-[10px] !font-semibold uppercase tracking-[0.22em] text-brand-green">
                                Menu
                            </span>
                        </motion.div>

                        {/* Nav list */}
                        <nav className="relative z-10 flex-1 overflow-y-auto px-8 lg:px-10 pb-6">
                            <ul className="flex flex-col">
                                {links.map((link, i) => (
                                    <NavRow
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
                            className="relative z-10 border-t border-brand-black/10 bg-white/50 backdrop-blur-sm px-8 lg:px-10 py-5 flex flex-col gap-4"
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4, duration: 0.4 }}
                        >
                            <Link
                                href="#"
                                onClick={onClose}
                                className="group/cta flex items-center justify-between gap-3 w-full px-6 py-4 bg-brand-green text-white rounded-full font-semibold text-base hover:bg-brand-black hover:text-white transition-colors shadow-sm"
                            >
                                <span>{headerButtonText}</span>
                                <span className="w-8 h-8 flex items-center justify-center rounded-full bg-brand-black/10 group-hover/cta:bg-brand-green/15 transition-colors">
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
                    </motion.aside>
                </>
            )}
        </AnimatePresence>
    );
};

export default BubbleMenu;

/* ────────────────────────────────────────────────────────────────────────── */

const rowVariants: Variants = {
    hidden: { opacity: 0, y: 16 },
    show: (i: number) => ({
        opacity: 1,
        y: 0,
        transition: {
            delay: 0.15 + i * 0.06,
            duration: 0.5,
            ease: [0.22, 1, 0.36, 1] as const,
        },
    }),
};

/** A single top-level menu row with number prefix + animated underline +
    arrow that slides in on hover. Renders children inline beneath. */
function NavRow({
    link,
    index,
    onClose,
}: {
    link: NavLink;
    index: number;
    onClose: () => void;
}) {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, amount: 0.1 });
    const hasChildren = link.children && link.children.length > 0;
    const hasNested =
        hasChildren &&
        link.children.some((c) => c.children && c.children.length > 0);

    return (
        <motion.li
            ref={ref}
            custom={index}
            initial="hidden"
            animate={isInView ? "show" : "hidden"}
            variants={rowVariants}
            className="border-b border-brand-black/10 last:border-b-0"
        >
            {/* Top-level row */}
            {link.pageSlug ? (
                <Link
                    href={link.pageSlug}
                    onClick={onClose}
                    className="group/row relative flex items-center gap-5 py-5 lg:py-6"
                >
                    {/* Underline that grows from left on hover */}
                    <span
                        aria-hidden
                        className="absolute bottom-0 left-0 h-0.5 w-0 bg-brand-green transition-all duration-500 group-hover/row:w-full"
                    />
                    <span className="font-poppins font-medium text-brand-black text-[32px] lg:text-[40px] leading-[1.05] tracking-[-0.02em] flex-1 group-hover/row:text-brand-green/90 transition-colors">
                        {link.label}
                    </span>
                    <span className="shrink-0 w-9 h-9 lg:w-10 lg:h-10 rounded-full bg-brand-black/[0.06] flex items-center justify-center text-brand-black/60 group-hover/row:bg-brand-green group-hover/row:text-white transition-all duration-300 group-hover/row:rotate-[35deg]">
                        <ArrowUpRight
                            className="w-4 h-4 lg:w-5 lg:h-5"
                            strokeWidth={2.5}
                        />
                    </span>
                </Link>
            ) : (
                <div className="flex items-center gap-5 py-5 lg:py-6">
                    <span className="font-poppins font-medium text-brand-black text-[32px] lg:text-[40px] leading-[1.05] tracking-[-0.02em] flex-1">
                        {link.label}
                    </span>
                </div>
            )}

            {/* Children */}
            {hasChildren && (
                <div className="pl-12 pb-5 lg:pb-6 flex flex-col gap-3">
                    {hasNested
                        ? link.children.map((group) => (
                              <NavGroup
                                  key={group.id}
                                  group={group}
                                  onClose={onClose}
                              />
                          ))
                        : link.children.map((child) => (
                              <Link
                                  key={child.id}
                                  href={child.pageSlug || "#"}
                                  onClick={onClose}
                                  className="group/sub inline-flex items-center gap-2 text-base font-medium text-brand-black/60 hover:text-brand-black transition-colors w-fit"
                              >
                                  <span className="w-4 h-px bg-brand-black/25 group-hover/sub:w-6 group-hover/sub:bg-brand-green transition-all duration-300" />
                                  {child.label}
                              </Link>
                          ))}
                </div>
            )}
        </motion.li>
    );
}

/** A nested group inside a mega-menu — section header + leaf links. */
function NavGroup({
    group,
    onClose,
}: {
    group: NavLink;
    onClose: () => void;
}) {
    const hasChildren = group.children && group.children.length > 0;
    return (
        <div className="flex flex-col gap-2">
            {group.pageSlug ? (
                <Link
                    href={group.pageSlug}
                    onClick={onClose}
                    className="!text-[11px] !font-semibold uppercase tracking-[0.18em] text-brand-green w-fit hover:text-brand-green/80 transition-colors"
                >
                    {group.label}
                </Link>
            ) : (
                <span className="!text-[11px] !font-semibold uppercase tracking-[0.18em] text-brand-green">
                    {group.label}
                </span>
            )}
            {hasChildren && (
                <div className="flex flex-col gap-1.5">
                    {group.children.map((leaf) => (
                        <Link
                            key={leaf.id}
                            href={leaf.pageSlug || "#"}
                            onClick={onClose}
                            className="group/sub inline-flex items-center gap-2 text-base font-medium text-brand-black/65 hover:text-brand-black transition-colors w-fit"
                        >
                            <span className="w-4 h-px bg-brand-black/25 group-hover/sub:w-6 group-hover/sub:bg-brand-green transition-all duration-300" />
                            {leaf.label}
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}

function SocialIcons({
    socialMedia,
}: {
    socialMedia?: BubbleMenuProps["socialMedia"];
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
