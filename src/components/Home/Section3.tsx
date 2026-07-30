/* ************************************************************
						NOTES
************************************************************ */
// Section3 component with carousel cards, pagination, and navigation
// Features: Three brand-colored cards with smooth transitions
// Layout: Heading positioned at top, cards in carousel, pagination below
/* ************************************************************
						IMPORTS
************************************************************ */
"use client";

import { HomePageProps } from "@/app/_config";
import { motion, useInView, Variants } from "framer-motion";
import React from "react";
import Image from "next/image";
import { Button } from "../ui/button";

/* ************************************************************
						INTERFACES
************************************************************ */
interface Section3Props {
    content: HomePageProps["content"];
}

/* ************************************************************
						COMPONENTS
************************************************************ */
export default function Section3({ content }: Section3Props) {
    /* ************************************************************
							HOOKS
	************************************************************ */
    const ref = React.useRef(null);
    const isInView = useInView(ref, {
        once: true, // Trigger animation only once
        amount: 0.2, // Trigger when 20% of the element is in view
    });

    /* ************************************************************
							ANIMATION VARIANTS
	************************************************************ */
    const containerVariants: Variants = {
        hidden: {},
        show: {
            transition: {
                staggerChildren: 0.15,
                delayChildren: 0.1,
            },
        },
    };

    const subtitleVariants: Variants = {
        hidden: { opacity: 0, y: 20 },
        show: {
            opacity: 1,
            y: 0,
            transition: {
                duration: 0.6,
                ease: [0.25, 0.46, 0.45, 0.94],
            },
        },
    };

    const titleVariants: Variants = {
        hidden: {
            opacity: 0,
            y: 40,
            filter: "blur(4px)",
        },
        show: {
            opacity: 1,
            y: 0,
            filter: "blur(0px)",
            transition: {
                duration: 0.9,
                ease: [0.25, 0.46, 0.45, 0.94],
            },
        },
    };

    const paragraphVariants: Variants = {
        hidden: {
            opacity: 0,
            y: 20,
        },
        show: {
            opacity: 1,
            y: 0,
            transition: {
                duration: 0.7,
                ease: [0.25, 0.46, 0.45, 0.94],
            },
        },
    };

    const cardsContainerVariants: Variants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.2,
                delayChildren: 0.2,
            },
        },
    };

    const cardVariants: Variants = {
        hidden: {
            opacity: 0,
            y: 40,
            scale: 0.95,
        },
        show: {
            opacity: 1,
            y: 0,
            scale: 1,
            transition: {
                duration: 0.8,
                ease: [0.25, 0.46, 0.45, 0.94],
            },
        },
    };

    /* ************************************************************
							RENDER
	************************************************************ */
    return (
        <section className="py-8 md:py-16 px-4 overflow-hidden" ref={ref}>
            <div className="rounded-2xl min-h-[55vh] relative overflow-hidden">
                <Image
                    src={content.section3backgroundImage}
                    alt={content.section3title}
                    fill
                    className="w-full h-auto object-cover rounded-2xl"
                />
                <div className="absolute inset-0 bg-black/30"></div>

                {/*content */}

                <motion.div
                    className="relative inset-0 flex flex-col items-center justify-center px-4 md:px-8 text-center py-10"
                    variants={containerVariants}
                    initial="hidden"
                    animate={isInView ? "show" : "hidden"}
                >
                    <motion.p
                        className="uppercase mb-4 !text-xs !font-semibold text-white tracking-wider"
                        variants={subtitleVariants}
                    >
                        {content.section3subtitle}
                    </motion.p>
                    <motion.h2
                        variants={titleVariants}
                        className={`text-white max-w-3xl ${content.section3titleBold ? "!font-bold" : ""}`}
                    >
                        {content.section3title}
                    </motion.h2>
                    <motion.p
                        className={`mt-4 max-w-2xl text-sm md:text-base text-white/80 font-medium px-4 ${content.section3descriptionBold ? "!font-bold" : ""}`}
                        variants={paragraphVariants}
                    >
                        {content.section3description}
                    </motion.p>

                    <motion.div
                        className="mt-8 md:mt-12 lg:mt-20 flex flex-col md:flex-row items-stretch gap-4 md:gap-6 text-left px-4 md:px-8 w-full max-w-6xl"
                        variants={cardsContainerVariants}
                    >
                        {content.section3cards.map((card) => (
                            <motion.div
                                key={card.id}
                                className="shadow-md flex-1 bg-white/[43%] rounded-xl md:rounded-2xl p-4 md:p-6 backdrop-blur-lg border border-white/30 hover:border-brand-green transition-colors duration-300"
                                variants={cardVariants}
                            >
                                <h6
                                    className={`!font-medium !text-xl md:!text-2xl mb-3 ${card.titleBold ? "!font-bold" : ""}`}
                                >
                                    {card.title}
                                </h6>
                                <p
                                    className={`font-medium mb-6 ${card.descriptionBold ? "!font-bold" : ""}`}
                                >
                                    {card.description}
                                </p>
                                <Button className="rounded-full">
                                    {card.buttonText}
                                </Button>
                            </motion.div>
                        ))}
                    </motion.div>
                </motion.div>
            </div>
        </section>
    );
}

/* ************************************************************
						EXPORTS
************************************************************ */
// Default export is already declared above
