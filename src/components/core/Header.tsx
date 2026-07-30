"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import BubbleMenu from "./BubbleMenu";
import BubbleMenuMobile from "./BubbleMenuMobile";
import { Button } from "../ui/button";
import { NavLink, defaultNavLinks } from "@/data/navigation";

interface HeaderProps {
    headerButtonText?: string;
    socialMedia?: {
        instagram?: string;
        facebook?: string;
        youtube?: string;
        pinterest?: string;
        linkedin?: string;
        tiktok?: string;
    };
    /**
     * Header navigation tree from the DB. Falls back to a sensible default
     * if not supplied so the component is still usable standalone.
     */
    navItems?: NavLink[];
}

const Header = ({
    headerButtonText = "Contact Us",
    socialMedia,
    navItems,
}: HeaderProps) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);
    const [openDropdown, setOpenDropdown] = useState<number | null>(null);
    const pathname = usePathname();

    const links: NavLink[] =
        navItems && navItems.length > 0 ? navItems : defaultNavLinks;

    useEffect(() => {
        setIsLoaded(true);
    }, []);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 50);
        };

        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    // Don't render header on admin pages
    if (pathname?.startsWith("/admin")) {
        return null;
    }

    return (
        <header className="fixed top-5 left-0 right-0 z-50">
            <div className="max-w-[1540px] mx-auto px-4 lg:px-6 relative">
                <motion.div
                    className="rounded-full ml-auto"
                    initial={false}
                    animate={{
                        width: isScrolled ? "200px" : "100%",
                    }}
                    transition={{
                        duration: 0.6,
                        ease: [0.4, 0, 0.2, 1],
                        delay: isScrolled ? 0.3 : 0,
                    }}
                >
                    {/* Inner pill — keeps overflow:visible so hover dropdowns
                        from the nav escape the rounded navbar bounds. The
                        inner `rounded-full` preserves the pill shape; the
                        outer width animation is the only thing that needed
                        overflow:hidden, and the contents that shrink already
                        fade to opacity:0 in lockstep with the width. */}
                    <div className="py-2 bg-white border border-brand-green backdrop-blur rounded-full px-4 lg:px-4 w-full">
                        <motion.div
                            className="flex items-center justify-between"
                            initial={{ opacity: 0, y: -20 }}
                            animate={
                                isLoaded
                                    ? { opacity: 1, y: 0 }
                                    : { opacity: 0, y: -20 }
                            }
                            transition={{ duration: 0.5, ease: "easeOut" }}
                        >
                            {/* ************************************************************
						LEFT: Logo
					************************************************************/}
                            <div className="flex items-center">
                                <Link
                                    href="/"
                                    aria-label="Home"
                                    className="flex items-center text-lg font-semibold tracking-tight text-brand-black"
                                >
                                    {/* Wordmark — swap for a logo when branding */}
                                    Brand
                                </Link>
                            </div>

                            {/* ************************************************************
						CENTER: Navigation Links (Hidden on mobile)
					************************************************************/}
                            <motion.nav
                                className="hidden lg:flex items-center gap-1"
                                animate={{
                                    opacity: isScrolled ? 0 : 1,
                                    width: isScrolled ? 0 : "auto",
                                }}
                                transition={{
                                    duration: 0.4,
                                    ease: [0.4, 0, 0.2, 1],
                                    delay: isScrolled ? 0 : 0.3,
                                }}
                            >
                                {links.map((link) => (
                                    <NavTopLevelItem
                                        key={link.id}
                                        link={link}
                                        isOpen={openDropdown === link.id}
                                        onOpen={() => setOpenDropdown(link.id)}
                                        onClose={() => setOpenDropdown(null)}
                                    />
                                ))}
                            </motion.nav>

                            {/* ************************************************************
						RIGHT: Contact & Menu Buttons (Absolute positioned)
					************************************************************/}
                            <div className="hidden lg:flex items-center relative h-10">
                                <motion.div
                                    className="absolute right-0"
                                    animate={{
                                        opacity: isScrolled ? 0 : 1,
                                        scale: isScrolled ? 0.9 : 1,
                                    }}
                                    transition={{
                                        duration: 0.4,
                                        ease: [0.4, 0, 0.2, 1],
                                        delay: isScrolled ? 0 : 0.3,
                                    }}
                                    style={{
                                        pointerEvents: isScrolled
                                            ? "none"
                                            : "auto",
                                    }}
                                >
                                    <Button className="rounded-full whitespace-nowrap">
                                        Contact
                                    </Button>
                                </motion.div>

                                <motion.div
                                    className="absolute right-0"
                                    animate={{
                                        opacity: isScrolled ? 1 : 0,
                                        scale: isScrolled ? 1 : 0.9,
                                    }}
                                    transition={{
                                        duration: 0.4,
                                        ease: [0.4, 0, 0.2, 1],
                                        delay: isScrolled ? 0.3 : 0,
                                    }}
                                    style={{
                                        pointerEvents: isScrolled
                                            ? "auto"
                                            : "none",
                                    }}
                                >
                                    <button
                                        onClick={() =>
                                            setIsMenuOpen(!isMenuOpen)
                                        }
                                        className="p-2 rounded-md flex items-center justify-center hover:bg-white/10 transition-colors"
                                        aria-label="Open navigation menu"
                                        aria-expanded={isMenuOpen}
                                    >
                                        <svg
                                            className="w-6 h-6 text-brand-green"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                            aria-hidden="true"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M3 8h18M3 16h26"
                                            />
                                        </svg>
                                    </button>
                                </motion.div>
                            </div>

                            {/* ************************************************************
						RIGHT: Mobile Menu Button (Always visible on mobile)
					************************************************************/}
                            <div className="lg:hidden flex items-center gap-3">
                                <button
                                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                                    className="p-2 rounded-md flex items-center justify-center hover:bg-white/10 transition-colors"
                                    aria-label="Open mobile navigation menu"
                                    aria-expanded={isMenuOpen}
                                >
                                    <svg
                                        className="w-6 h-6 text-brand-green"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                        aria-hidden="true"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M3 8h18M3 16h26"
                                        />
                                    </svg>
                                </button>
                            </div>
                        </motion.div>
                    </div>
                </motion.div>
            </div>

            {/* ************************************************************
				Desktop Bubble Menu
			************************************************************/}
            <div className="hidden lg:block">
                <BubbleMenu
                    isOpen={isMenuOpen}
                    onClose={() => setIsMenuOpen(false)}
                    headerButtonText={headerButtonText}
                    socialMedia={socialMedia}
                    navItems={navItems}
                />
            </div>

            {/* ************************************************************
				Mobile Bubble Menu
			************************************************************/}
            <div className="lg:hidden">
                <BubbleMenuMobile
                    isOpen={isMenuOpen}
                    onClose={() => setIsMenuOpen(false)}
                    headerButtonText={headerButtonText}
                    socialMedia={socialMedia}
                    navItems={navItems}
                />
            </div>
        </header>
    );
};

export default Header;

/* ──────────────────────────────────────────────────────────────────────────
   NavTopLevelItem — a single top-bar link, with an optional dropdown panel
   that auto-switches between single-column and mega-menu layouts based on
   whether any direct child has its own children (section header pattern).
   ────────────────────────────────────────────────────────────────────────── */

interface NavTopLevelItemProps {
    link: NavLink;
    isOpen: boolean;
    onOpen: () => void;
    onClose: () => void;
}

function NavTopLevelItem({ link, isOpen, onOpen, onClose }: NavTopLevelItemProps) {
    const hasChildren = link.children && link.children.length > 0;
    // If ANY direct child has children of its own, the dropdown is a
    // mega-menu (multi-column with section headers). Otherwise simple list.
    const isMegaMenu =
        hasChildren && link.children.some((c) => c.children && c.children.length > 0);

    return (
        <div
            className="relative"
            onMouseEnter={hasChildren ? onOpen : undefined}
            onMouseLeave={hasChildren ? onClose : undefined}
        >
            {link.pageSlug ? (
                <Link
                    href={link.pageSlug}
                    className="px-3 py-2 text-sm font-medium transition-colors rounded-md hover:text-brand-green/80 whitespace-nowrap inline-flex items-center gap-1"
                >
                    {link.label}
                    {hasChildren && (
                        <ChevronDown
                            className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                            aria-hidden
                        />
                    )}
                </Link>
            ) : (
                // No pageSlug → unclickable section trigger (rare at top level)
                <span className="px-3 py-2 text-sm font-medium whitespace-nowrap inline-flex items-center gap-1 cursor-default">
                    {link.label}
                    {hasChildren && (
                        <ChevronDown
                            className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                            aria-hidden
                        />
                    )}
                </span>
            )}

            <AnimatePresence>
                {hasChildren && isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
                        className={`absolute top-full pt-2 z-50 ${
                            isMegaMenu
                                ? "left-1/2 -translate-x-1/2"
                                : "left-1/2 -translate-x-1/2"
                        }`}
                    >
                        {isMegaMenu ? (
                            <MegaMenuPanel sections={link.children} />
                        ) : (
                            <SimpleDropdownPanel items={link.children} />
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

/* Single-column dropdown — used when no section headers are present */
function SimpleDropdownPanel({ items }: { items: NavLink[] }) {
    return (
        <div className="rounded-xl bg-white backdrop-blur-xl border border-brand-black/10 ring-1 ring-black/5 shadow-2xl overflow-hidden min-w-[240px] p-1.5">
            {items.map((item) => (
                <Link
                    key={item.id}
                    href={item.pageSlug || "#"}
                    className="block px-3.5 py-2.5 rounded-lg text-sm font-medium text-brand-black hover:bg-brand-green/15 hover:text-brand-black transition-colors whitespace-nowrap"
                >
                    {item.label}
                </Link>
            ))}
        </div>
    );
}

/* Mega-menu — multi-column layout. Each child renders as a column:
   - If the child has its own children (section header), render label as a
     header at the top + a stack of its children as links below.
   - If the child is a simple link, render as a single-link column. */
function MegaMenuPanel({ sections }: { sections: NavLink[] }) {
    return (
        <div className="rounded-xl bg-white backdrop-blur-xl border border-brand-black/10 ring-1 ring-black/5 shadow-2xl overflow-hidden p-3">
            <div className="grid grid-flow-col auto-cols-[minmax(190px,1fr)] gap-2">
                {sections.map((section) => {
                    const isSectionHeader =
                        section.children && section.children.length > 0;
                    if (isSectionHeader) {
                        return (
                            <div key={section.id} className="px-3 py-2">
                                {section.pageSlug ? (
                                    <Link
                                        href={section.pageSlug}
                                        className="block text-xs font-semibold uppercase tracking-wider text-brand-green mb-2 hover:underline"
                                    >
                                        {section.label}
                                    </Link>
                                ) : (
                                    <p className="text-xs font-semibold uppercase tracking-wider text-brand-green mb-2">
                                        {section.label}
                                    </p>
                                )}
                                <div className="flex flex-col">
                                    {section.children.map((leaf) => (
                                        <Link
                                            key={leaf.id}
                                            href={leaf.pageSlug || "#"}
                                            className="block py-1.5 px-2 -mx-1 rounded text-sm font-medium text-brand-black hover:bg-brand-green/10 hover:text-brand-green transition-colors whitespace-nowrap"
                                        >
                                            {leaf.label}
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        );
                    }
                    // Single-link column (sits alongside section columns)
                    return (
                        <div key={section.id} className="px-3 py-2">
                            <Link
                                href={section.pageSlug || "#"}
                                className="block py-1.5 px-2 -mx-1 rounded text-sm font-medium text-brand-black hover:bg-brand-green/10 hover:text-brand-green transition-colors whitespace-nowrap"
                            >
                                {section.label}
                            </Link>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
