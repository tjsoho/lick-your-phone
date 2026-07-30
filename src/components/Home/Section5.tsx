"use client";

import { HomePageProps } from "@/app/_config";
import { motion, useInView, Variants } from "framer-motion";
import React from "react";
import Image from "next/image";
import { RenderLineBreaks } from "@/utils/render-line-breaks";

interface Section5Props {
    content: HomePageProps["content"];
}

export default function Section5({ content }: Section5Props) {
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
        hidden: { opacity: 0, x: -20 },
        show: {
            opacity: 1,
            x: 0,
            transition: {
                duration: 0.6,
                ease: [0.25, 0.46, 0.45, 0.94],
            },
        },
    };

    const titleVariants: Variants = {
        hidden: { opacity: 0, y: 30, filter: "blur(4px)" },
        show: {
            opacity: 1,
            y: 0,
            filter: "blur(0px)",
            transition: {
                duration: 0.8,
                ease: [0.25, 0.46, 0.45, 0.94],
            },
        },
    };

    const paragraphVariants: Variants = {
        hidden: { opacity: 0, y: 20 },
        show: {
            opacity: 1,
            y: 0,
            transition: {
                duration: 0.7,
                ease: [0.25, 0.46, 0.45, 0.94],
            },
        },
    };

    const imageContainerVariants: Variants = {
        hidden: { opacity: 0, scale: 0.95 },
        show: {
            opacity: 1,
            scale: 1,
            transition: {
                duration: 0.8,
                ease: [0.25, 0.46, 0.45, 0.94],
            },
        },
    };

    const cardsContainerVariants: Variants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1,
                delayChildren: 0.4,
            },
        },
    };

    const cardVariants: Variants = {
        hidden: { opacity: 0, y: 30, scale: 0.95 },
        show: {
            opacity: 1,
            y: 0,
            scale: 1,
            transition: {
                duration: 0.6,
                ease: [0.25, 0.46, 0.45, 0.94],
            },
        },
    };

    return (
        <section className="py-6 px-4 overflow-hidden" ref={ref}>
            <div className="rounded-2xl min-h-[50vh] lg:min-h-[30vh] relative overflow-hidden grid grid-cols-1 lg:grid-cols-5 border border-black">
                {/*content */}
                <motion.div
                    className="lg:col-span-2 p-6 md:p-10 lg:p-16 flex flex-col"
                    variants={containerVariants}
                    initial="hidden"
                    animate={isInView ? "show" : "hidden"}
                >
                    <motion.p
                        className="!text-xs md:!text-sm font-semibold tracking-wider"
                        variants={subtitleVariants}
                    >
                        {content.section5subtitle}
                    </motion.p>
                    <motion.h2
                        variants={titleVariants}
                        className={`mt-4 font-medium text-brand-green text-2xl md:text-3xl lg:text-4xl ${content.section5titleBold ? "!font-bold" : ""}`}
                    >
                        {content.section5title}
                    </motion.h2>
                    <motion.p
                        className={`mt-6 text-sm md:text-base text-black font-medium ${content.section5descriptionBold ? "!font-bold" : ""}`}
                        variants={paragraphVariants}
                    >
                        {content.section5description}
                    </motion.p>
                </motion.div>

                <motion.div
                    className="relative lg:col-span-3 lg:rounded-r-2xl overflow-hidden min-h-[500px] lg:min-h-0"
                    variants={imageContainerVariants}
                    initial="hidden"
                    animate={isInView ? "show" : "hidden"}
                >
                    <Image
                        src={content.section5backgroundImage}
                        alt={content.section5title}
                        fill
                        className="w-full h-auto object-cover "
                    />
                    <div className="absolute inset-0 bg-black/30"></div>

                    {/* approachPoints */}
                    <motion.div
                        className="relative inset-0 px-4 py-6 md:px-6 md:py-10 lg:px-10 lg:py-20 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-3 lg:gap-4"
                        variants={cardsContainerVariants}
                        initial="hidden"
                        animate={isInView ? "show" : "hidden"}
                    >
                        {content.section5approachCards.map((card) => (
                            <motion.div
                                key={card.id}
                                className="bg-white/[43%] shadow-md rounded-xl md:rounded-2xl p-3 md:p-4 backdrop-blur-xl flex flex-col transition-colors duration-300 cursor-pointer"
                                variants={cardVariants}
                            >
                                {/*icon*/}
                                {card.showIcon !== false && card.icon && (
                                    <div className="w-6 h-6 md:w-7 md:h-7 relative mb-3 md:mb-4">
                                        <Image
                                            src={card.icon}
                                            alt={`${card.title} icon`}
                                            fill
                                            className="object-contain"
                                        />
                                    </div>
                                )}

                                <h6
                                    className={`font-medium text-xl md:text-xl mb-2 md:mb-3 min-h-[60px] ${card.titleBold ? "!font-bold" : ""}`}
                                >
                                    {card.title}
                                </h6>
                                <p
                                    className={`font-medium text-sm md:text-base text-white/70 ${card.descriptionBold ? "!font-bold" : ""}`}
                                >
                                    <RenderLineBreaks text={card.description} />
                                </p>
                            </motion.div>
                        ))}
                    </motion.div>
                </motion.div>
            </div>
        </section>
    );
}
