"use client";

import { HomePageProps } from "@/app/_config";
import { motion, useInView, Variants } from "framer-motion";
import React from "react";
import { RenderLineBreaks } from "@/utils/render-line-breaks";
import { Button } from "../ui/button";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface Section2Props {
    content: HomePageProps["content"];
}

export default function Section2({ content }: Section2Props) {
    const ref = React.useRef(null);
    const isInView = useInView(ref, {
        once: true, // Trigger animation only once
        amount: 0.2, // Trigger when 20% of the element is in view
    });
    const [hoveredIndex, setHoveredIndex] = React.useState<number | null>(0);
    const containerRef = React.useRef<HTMLDivElement>(null);
    const [containerWidth, setContainerWidth] = React.useState(
        typeof window !== "undefined" ? window.innerWidth - 100 : 1200,
    );

    React.useEffect(() => {
        const updateWidth = () => {
            if (containerRef.current) {
                setContainerWidth(containerRef.current.offsetWidth);
            }
        };
        // Small delay to ensure DOM is ready
        setTimeout(updateWidth, 0);
        window.addEventListener("resize", updateWidth);
        return () => window.removeEventListener("resize", updateWidth);
    }, []);

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

    const headerVariants: Variants = {
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

    const contentVariants: Variants = {
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

    const buttonVariants: Variants = {
        hidden: { opacity: 0, scale: 0.95 },
        show: {
            opacity: 1,
            scale: 1,
            transition: {
                duration: 0.6,
                ease: [0.25, 0.46, 0.45, 0.94],
            },
        },
    };

    const cardsContainerVariants: Variants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.12,
                delayChildren: 0.3,
            },
        },
    };

    const cardVariants: Variants = {
        hidden: { opacity: 0, y: 40, scale: 0.95 },
        show: {
            opacity: 1,
            y: 0,
            scale: 1,
            transition: {
                duration: 0.7,
                ease: [0.25, 0.46, 0.45, 0.94],
            },
        },
    };

    /* ************************************************************
							RENDER
	************************************************************ */
    return (
        <section className="py-16 px-4" ref={ref}>
            <motion.p
                className="uppercase !text-xs !font-semibold text-brand-green mb-2.5 tracking-wider"
                variants={subtitleVariants}
            >
                {content.section2subtitle}
            </motion.p>
            <motion.div
                className="grid lg:grid-cols-2 gap-10"
                variants={containerVariants}
                initial="hidden"
                animate={isInView ? "show" : "hidden"}
            >
                <div className="">
                    <motion.h2
                        className="!font-medium"
                        variants={headerVariants}
                    >
                        {content.section2title}
                    </motion.h2>
                </div>
                <div className="">
                    <motion.p
                        variants={contentVariants}
                        className={cn("mt-2 font-medium text-black/60", {
                            "font-bold": content.section2paragraphBold,
                        })}
                    >
                        <RenderLineBreaks text={content.section2paragraph} />
                    </motion.p>

                    <motion.div variants={buttonVariants}>
                        <Button className="rounded-full mt-5">
                            {content.section2buttonText}
                        </Button>
                    </motion.div>
                </div>
            </motion.div>

            <motion.div
                ref={containerRef}
                className="flex flex-col md:flex-row mt-16 gap-4"
                variants={cardsContainerVariants}
                initial="hidden"
                animate={isInView ? "show" : "hidden"}
            >
                {content.section2JourneyCards.map((card, index) => {
                    const active =
                        hoveredIndex !== null
                            ? hoveredIndex === index
                            : index === 0;

                    // Calculate inactive width based on actual container width
                    // Calculate widths based on number of cards
                    const numCards = content.section2JourneyCards.length;
                    const gapTotal = (numCards - 1) * 16; // gaps of 16px each
                    const activeWidth = Math.min(500, containerWidth * 0.4);
                    const inactiveWidth =
                        (containerWidth - activeWidth - gapTotal) /
                        (numCards - 1);

                    return (
                        <motion.div
                            key={card.id}
                            onMouseEnter={() => setHoveredIndex(index)}
                            variants={cardVariants}
                            animate={{
                                width:
                                    containerWidth > 768
                                        ? active
                                            ? activeWidth
                                            : inactiveWidth
                                        : "100%",
                            }}
                            transition={{
                                duration: 0.6,
                                ease: [0.4, 0, 0.2, 1],
                            }}
                            className={cn(
                                "relative h-48 bg-black/25 rounded-lg text-black/60 cursor-pointer border md:flex-shrink-0",
                                {
                                    "border-brand-green": active,
                                    "text-black": active,
                                },
                            )}
                        >
                            <div className="absolute inset-0 -z-1">
                                <Image
                                    src={card.image}
                                    alt={card.title}
                                    fill
                                    className="w-full h-full object-cover rounded-lg"
                                />

                                {/* overlay */}
                                <motion.div
                                    animate={{
                                        opacity: active ? 0.5 : 0.9,
                                    }}
                                    transition={{
                                        duration: 0.6,
                                        ease: [0.4, 0, 0.2, 1],
                                    }}
                                    className={cn(
                                        "absolute inset-0 bg-gradient-to-r from-white to-white/80 rounded-lg",
                                        {
                                            "to-white/50": active,
                                        },
                                    )}
                                ></motion.div>
                            </div>

                            {/*  content */}
                            <div className="absolute inset-0 flex flex-col justify-center px-4 py-8">
                                {/*icon*/}
                                {card.showIcon !== false && card.icon && (
                                    <div className="w-7 h-7 relative">
                                        <Image
                                            src={card.icon}
                                            alt={`${card.title} icon`}
                                            fill
                                            className="object-contain"
                                        />
                                    </div>
                                )}

                                {/* text */}
                                <div className="mt-6 max-w-[250px]">
                                    <h6
                                        className={`!font-medium text-black !text-2xl ${card.titleBold ? "!font-bold" : ""}`}
                                    >
                                        {card.title}
                                    </h6>
                                    <p
                                        className={`font-medium !text-sm ${card.descriptionBold ? "!font-bold" : ""}`}
                                    >
                                        <RenderLineBreaks
                                            text={card.description}
                                        />
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </motion.div>
        </section>
    );
}
