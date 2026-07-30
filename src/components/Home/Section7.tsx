"use client";

import { HomePageProps } from "@/app/_config";
import { motion, useInView, Variants } from "framer-motion";
import Image from "next/image";
import React from "react";
import { Button } from "../ui/button";

interface Section7Props {
    content: HomePageProps["content"];
}

export default function Section7({ content }: Section7Props) {
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
                delayChildren: 0.2,
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
        hidden: { opacity: 0, y: 40, filter: "blur(8px)", scale: 0.95 },
        show: {
            opacity: 1,
            y: 0,
            filter: "blur(0px)",
            scale: 1,
            transition: {
                duration: 1,
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

    const buttonsContainerVariants: Variants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.15,
                delayChildren: 0.1,
            },
        },
    };

    const buttonVariants: Variants = {
        hidden: { opacity: 0, y: 20, scale: 0.95 },
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

    const backgroundVariants: Variants = {
        hidden: { opacity: 0, scale: 1.1 },
        show: {
            opacity: 1,
            scale: 1,
            transition: {
                duration: 1.2,
                ease: [0.25, 0.46, 0.45, 0.94],
            },
        },
    };

    return (
        <section
            className="py-8 md:py-16 px-4 overflow-hidden relative min-h-[70vh] md:h-[65vh]"
            ref={ref}
        >
            <motion.div
                className="absolute inset-0"
                variants={backgroundVariants}
                initial="hidden"
                animate={isInView ? "show" : "hidden"}
            >
                <Image
                    src={content.section7backgroundImage}
                    alt={content.section7title}
                    fill
                    className="object-cover object-[50%_70%]"
                />

                {/* Black Overlay */}
                <div className="absolute inset-0 bg-black/40" />
                {/* White Overlay */}
                <div className="absolute w-full h-2/3 bg-gradient-to-b from-white to-transparent" />
            </motion.div>

            <motion.div
                className="absolute inset-0 flex flex-col gap-3 md:gap-4 items-center justify-center px-4 md:px-8 text-center max-w-3xl mx-auto"
                variants={containerVariants}
                initial="hidden"
                animate={isInView ? "show" : "hidden"}
            >
                <motion.p
                    className="!text-xs md:!text-sm text-white tracking-wider font-semibold"
                    variants={subtitleVariants}
                >
                    {content.section7subtitle}
                </motion.p>
                <motion.h2
                    variants={titleVariants}
                    className={`mt-2 md:mt-4 text-white px-4 ${content.section7titleBold ? "!font-bold" : ""}`}
                >
                    {content.section7title}
                </motion.h2>
                <motion.p
                    className={`mt-3 md:mt-4 text-sm md:text-base font-medium text-white/80 px-4 ${content.section7descriptionBold ? "!font-bold" : ""}`}
                    variants={paragraphVariants}
                >
                    {content.section7description}
                </motion.p>

                <motion.div
                    className="flex flex-col sm:flex-row items-center gap-3 md:gap-4 mt-4 md:mt-6 w-full sm:w-auto px-4"
                    variants={buttonsContainerVariants}
                >
                    <motion.div variants={buttonVariants}>
                        <Button className="rounded-full w-full sm:w-auto">
                            {content.section7button1Text}
                        </Button>
                    </motion.div>

                    <motion.div variants={buttonVariants}>
                        <Button
                            variant="secondary"
                            className="rounded-full w-full sm:w-auto"
                        >
                            {content.section7button2Text}
                        </Button>
                    </motion.div>
                </motion.div>
            </motion.div>
        </section>
    );
}
