/* ************************************************************
                        NOTES
************************************************************ */
// LinkModal component for rich text editor link management
// Features: Modal for adding/editing links with text and URL inputs
// Layout: Clean modal with form inputs and action buttons
/* ************************************************************
                        IMPORTS
************************************************************ */
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

/* ************************************************************
                        INTERFACES
************************************************************ */
interface LinkModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (displayText: string, url: string) => void;
    initialText?: string;
    initialUrl?: string;
}

/* ************************************************************
                        COMPONENTS
************************************************************ */
export default function LinkModal({
    isOpen,
    onClose,
    onSubmit,
    initialText = "",
    initialUrl = ""
}: LinkModalProps) {
    /* ************************************************************
                            HOOKS
    ************************************************************ */
    const [displayText, setDisplayText] = useState("");
    const [url, setUrl] = useState("");

    /* ************************************************************
                            FUNCTIONS
    ************************************************************ */
    useEffect(() => {
        if (isOpen) {
            setDisplayText(initialText);
            setUrl(initialUrl);
        }
    }, [isOpen, initialText, initialUrl]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(displayText, url);
        onClose();
    };

    const handleClose = () => {
        setDisplayText("");
        setUrl("");
        onClose();
    };

    /* ************************************************************
                            ANIMATION VARIANTS
    ************************************************************ */
    const modalVariants = {
        hidden: {
            opacity: 0,
            scale: 0.95,
            y: 20
        },
        show: {
            opacity: 1,
            scale: 1,
            y: 0,
            transition: {
                duration: 0.2,
                ease: [0.4, 0, 0.2, 1] as const
            }
        },
        exit: {
            opacity: 0,
            scale: 0.95,
            y: 20,
            transition: {
                duration: 0.15,
                ease: [0.4, 0, 0.2, 1] as const
            }
        }
    };

    const backdropVariants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: { duration: 0.2 }
        },
        exit: {
            opacity: 0,
            transition: { duration: 0.15 }
        }
    };

    /* ************************************************************
                            RENDER
    ************************************************************ */
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* ************************************************************
              BACKDROP
          ************************************************************ */}
                    <motion.div
                        variants={backdropVariants}
                        initial="hidden"
                        animate="show"
                        exit="exit"
                        className="absolute inset-0 bg-black/50"
                        onClick={handleClose}
                    />

                    {/* ************************************************************
              MODAL CONTENT
          ************************************************************ */}
                    <motion.div
                        variants={modalVariants}
                        initial="hidden"
                        animate="show"
                        exit="exit"
                        className="relative bg-white rounded-2xl shadow-xl max-w-md w-full p-6"
                    >
                        {/* ************************************************************
                HEADER
            ************************************************************ */}
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-semibold text-brand-black">
                                Add Link
                            </h3>
                            <button
                                onClick={handleClose}
                                className="text-brand-black/60 hover:text-brand-black transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* ************************************************************
                FORM
            ************************************************************ */}
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* ************************************************************
                  DISPLAY TEXT INPUT
              ************************************************************ */}
                            <div>
                                <label htmlFor="displayText" className="block text-sm font-medium text-brand-black mb-2">
                                    Display Text
                                </label>
                                <input
                                    type="text"
                                    id="displayText"
                                    value={displayText}
                                    onChange={(e) => setDisplayText(e.target.value)}
                                    className="w-full px-4 py-3 border border-brand-black/20 rounded-xl focus:border-brand-teal focus:outline-none bg-white text-brand-black transition-colors"
                                    placeholder="Enter link text"
                                    required
                                />
                            </div>

                            {/* ************************************************************
                  URL INPUT
              ************************************************************ */}
                            <div>
                                <label htmlFor="url" className="block text-sm font-medium text-brand-black mb-2">
                                    URL
                                </label>
                                <input
                                    type="url"
                                    id="url"
                                    value={url}
                                    onChange={(e) => setUrl(e.target.value)}
                                    className="w-full px-4 py-3 border border-brand-black/20 rounded-xl focus:border-brand-teal focus:outline-none bg-white text-brand-black transition-colors"
                                    placeholder="https://example.com"
                                    required
                                />
                            </div>

                            {/* ************************************************************
                  ACTION BUTTONS
              ************************************************************ */}
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={handleClose}
                                    className="flex-1 px-4 py-3 border border-brand-black/20 text-brand-black rounded-xl hover:bg-brand-cream/50 transition-colors font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-3 bg-brand-teal text-white rounded-xl hover:bg-brand-teal/90 transition-colors font-medium"
                                >
                                    Add Link
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}

/* ************************************************************
                        EXPORTS
************************************************************ */
// Default export is already declared above
