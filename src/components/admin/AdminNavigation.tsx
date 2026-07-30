/* ************************************************************
                        NOTES
************************************************************ */
// Admin navigation component with back to home button and dropdown
// Features quick navigation to all site pages
// Modular design for easy link management
/* ************************************************************
                        IMPORTS
************************************************************ */
"use client";

import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import React, { useState } from "react";

/* ************************************************************
                        INTERFACES
************************************************************ */
interface NavigationLink {
    href: string;
    label: string;
    description: string;
}

/* ************************************************************
                        COMPONENTS
************************************************************ */
const AdminNavigation = () => {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    /* ************************************************************
                            NAVIGATION DATA
    ************************************************************ */
    const navigationLinks: NavigationLink[] = [
        {
            href: "/",
            label: "Home",
            description: "Main homepage"
        },
        // {
        //     href: "/about-us",
        //     label: "About Us",
        //     description: "Company information"
        // },
        // {
        //     href: "/services",
        //     label: "Services",
        //     description: "Our offerings"
        // },
        // {
        //     href: "/work",
        //     label: "Work",
        //     description: "Portfolio and cases"
        // },
        // {
        //     href: "/team",
        //     label: "Team",
        //     description: "Meet our team"
        // },
        {
            href: "/blog",
            label: "Blog",
            description: "Latest articles"
        },
        {
            href: "/faqs",
            label: "FAQs",
            description: "Frequently asked questions"
        },
        {
            href: "/privacy-policy",
            label: "Privacy Policy",
            description: "Privacy policy and terms"
        },
        {
            href: "/terms-and-conditions",
            label: "Terms & Conditions",
            description: "Terms and conditions"
        },
        {
            href: "/terms-of-use",
            label: "Terms of Use",
            description: "Website terms of use"
        }
    ];

    /* ************************************************************
                            ANIMATION VARIANTS
    ************************************************************ */
    const dropdownVariants = {
        hidden: {
            opacity: 0,
            y: -10,
            scale: 0.95
        },
        show: {
            opacity: 1,
            y: 0,
            scale: 1,
            transition: {
                duration: 0.2,
                ease: [0.4, 0, 0.2, 1] as const
            }
        },
        exit: {
            opacity: 0,
            y: -10,
            scale: 0.95,
            transition: {
                duration: 0.15,
                ease: [0.4, 0, 0.2, 1] as const
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, x: -10 },
        show: {
            opacity: 1,
            x: 0,
            transition: {
                duration: 0.2,
                ease: [0.4, 0, 0.2, 1] as const
            }
        }
    };

    /* ************************************************************
                            RENDER
    ************************************************************ */
    return (
        <div className="relative">
            {/* ************************************************************
                BACK TO HOME BUTTON WITH DROPDOWN
            ************************************************************ */}
            <div className="flex items-center gap-2">
                <Link
                    href="/"
                    className="bg-brand-green text-white px-6 py-3 rounded-full font-semibold hover:bg-brand-green/90 transition-colors duration-300 flex items-center gap-2"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                    Back to Home
                </Link>

                
            </div>

            {/* ************************************************************
                DROPDOWN MENU
            ************************************************************ */}
            <AnimatePresence>
                {isDropdownOpen && (
                    <motion.div
                        variants={dropdownVariants}
                        initial="hidden"
                        animate="show"
                        exit="exit"
                        className="absolute top-full left-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-gray-200 py-2 z-50"
                    >
                        {navigationLinks.map((link, index) => (
                            <motion.div
                                key={link.href}
                                variants={itemVariants}
                                initial="hidden"
                                animate="show"
                                transition={{ delay: index * 0.05 }}
                            >
                                <Link
                                    href={link.href}
                                    className="block px-4 py-3 hover:bg-gray-100 transition-colors duration-200 group"
                                    onClick={() => setIsDropdownOpen(false)}
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-semibold text-brand-black group-hover:text-brand-green transition-colors">
                                                {link.label}
                                            </p>
                                            <p className="text-sm text-gray-600">
                                                {link.description}
                                            </p>
                                        </div>
                                        <svg className="w-4 h-4 text-gray-400 group-hover:text-brand-green transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </div>
                                </Link>
                            </motion.div>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AdminNavigation;
