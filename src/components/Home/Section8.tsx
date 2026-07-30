"use client";

import { HomePageProps, Section8Stat } from "@/app/_config";
import { animate, motion, useInView, Variants } from "framer-motion";
import Image from "next/image";
import React from "react";
import { RenderLineBreaks } from "@/utils/render-line-breaks";

interface Section8Props {
    content: HomePageProps["content"];
}

/**
 * Split a stat string like "10+", "5,000+", "$1.2M" into a numeric target
 * plus a prefix/suffix to wrap around the animated number.
 *
 * "10+"      → { value: 10, prefix: "",  suffix: "+" }
 * "5,000+"   → { value: 5000, prefix: "",  suffix: "+" }
 * "$1.2M"    → { value: 1.2, prefix: "$", suffix: "M" }
 *
 * Falls back to a static value if no digits are present.
 */
function parseStatNumber(input: string): {
    value: number;
    prefix: string;
    suffix: string;
} {
    const match = input.match(/^([^\d-]*)([\d.,]+)(.*)$/);
    if (!match) return { value: 0, prefix: input, suffix: "" };
    const prefix = match[1];
    const raw = match[2].replace(/,/g, "");
    const value = parseFloat(raw) || 0;
    const suffix = match[3];
    return { value, prefix, suffix };
}

/**
 * Single stat card with a count-up animation. The number races from 0
 * to its target when the parent section first enters the viewport, and
 * the card lifts + greens-up on hover for a small "interactive" payoff.
 */
function AnimatedStat({
    stat,
    inView,
    delay,
}: {
    stat: Section8Stat;
    inView: boolean;
    delay: number;
}) {
    const { value, prefix, suffix } = parseStatNumber(stat.number);
    const [display, setDisplay] = React.useState<string>(
        `${prefix}0${suffix}`,
    );

    React.useEffect(() => {
        if (!inView) return;
        const controls = animate(0, value, {
            duration: 1.8,
            delay,
            ease: [0.16, 1, 0.3, 1],
            onUpdate: (latest) => {
                // Preserve thousands separators while counting (5,000 not 5000).
                const rounded = Math.round(latest);
                const formatted = rounded.toLocaleString();
                setDisplay(`${prefix}${formatted}${suffix}`);
            },
        });
        return () => controls.stop();
    }, [inView, value, prefix, suffix, delay]);

    return (
        <motion.div
            className="group relative rounded-2xl border border-black/10 bg-white p-8 md:p-10 flex flex-col items-center text-center overflow-hidden transition-all duration-500 hover:border-brand-green hover:shadow-xl hover:-translate-y-1"
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={
                inView
                    ? { opacity: 1, y: 0, scale: 1 }
                    : { opacity: 0, y: 30, scale: 0.95 }
            }
            transition={{
                duration: 0.7,
                delay,
                ease: [0.25, 0.46, 0.45, 0.94],
            }}
        >
            {/* Soft green wash that fades in on hover */}
            <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-gradient-to-br from-brand-green/0 via-brand-green/0 to-brand-green/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
            />

            <div className="relative">
                <span className="block text-5xl md:text-6xl lg:text-7xl !font-medium text-brand-green leading-none tracking-tight tabular-nums">
                    {display}
                </span>
                {stat.unit && (
                    <span className="block mt-3 text-base md:text-lg !font-semibold uppercase tracking-[0.18em] text-black/70">
                        {stat.unit}
                    </span>
                )}
            </div>

            <div
                aria-hidden
                className="relative mt-6 mb-5 w-12 h-px bg-brand-green/40 group-hover:bg-brand-green group-hover:w-16 transition-all duration-500"
            />

            <p className="relative text-sm md:text-base text-black/70 font-medium max-w-xs">
                {stat.description}
            </p>
        </motion.div>
    );
}

const containerVariants: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
};

const subtitleVariants: Variants = {
    hidden: { opacity: 0, x: -20 },
    show: {
        opacity: 1,
        x: 0,
        transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] },
    },
};

const headerVariants: Variants = {
    hidden: { opacity: 0, y: 30, filter: "blur(4px)" },
    show: {
        opacity: 1,
        y: 0,
        filter: "blur(0px)",
        transition: { duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] },
    },
};

const itemVariants: Variants = {
    hidden: { opacity: 0, y: 30, scale: 0.95 },
    show: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: { duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] },
    },
};

export default function Section8({ content }: Section8Props) {
    const ref = React.useRef(null);
    const isInView = useInView(ref, { once: true, amount: 0.15 });

    const stats = content.section8stats ?? [];
    const logos = content.section8clientLogos ?? [];
    const testimonials = content.section8testimonials ?? [];

    return (
        <section
            ref={ref}
            className="py-16 md:py-24 px-4 overflow-hidden"
        >
            {/* Heading + paragraph */}
            <motion.div
                className="flex flex-col items-center text-center max-w-4xl mx-auto"
                variants={containerVariants}
                initial="hidden"
                animate={isInView ? "show" : "hidden"}
            >
                <motion.p
                    className="uppercase !text-xs !font-semibold text-brand-green tracking-wider mb-3"
                    variants={subtitleVariants}
                >
                    {content.section8subtitle}
                </motion.p>
                <motion.h2
                    className={`mb-6 ${content.section8titleBold ? "!font-bold" : "!font-medium"}`}
                    variants={headerVariants}
                >
                    {content.section8title}
                </motion.h2>
                <motion.p
                    className={`text-black/70 ${content.section8paragraphBold ? "font-bold" : "font-medium"}`}
                    variants={headerVariants}
                >
                    <RenderLineBreaks text={content.section8paragraph} />
                </motion.p>
            </motion.div>

            {/* Stats — animated count-up cards */}
            {stats.length > 0 && (
                <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6 max-w-6xl mx-auto">
                    {stats.map((stat, i) => (
                        <AnimatedStat
                            key={stat.id}
                            stat={stat}
                            inView={isInView}
                            delay={0.15 + i * 0.15}
                        />
                    ))}
                </div>
            )}

            {/* Client logos */}
            {logos.length > 0 && (
                <motion.div
                    className="mt-16 md:mt-20 max-w-6xl mx-auto"
                    initial={{ opacity: 0, y: 20 }}
                    animate={
                        isInView
                            ? { opacity: 1, y: 0 }
                            : { opacity: 0, y: 20 }
                    }
                    transition={{ duration: 0.8, delay: 0.4 }}
                >
                    <p className="text-center text-xs !font-semibold uppercase tracking-wider text-black/40 mb-6">
                        Some of the teams we work with
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-6 md:gap-x-14">
                        {logos.map((logo) => (
                            <div
                                key={logo.id}
                                className="relative w-24 h-12 md:w-32 md:h-14 grayscale opacity-60 hover:opacity-100 hover:grayscale-0 transition-all duration-300"
                            >
                                <Image
                                    src={logo.image}
                                    alt={logo.alt}
                                    fill
                                    className="object-contain"
                                />
                            </div>
                        ))}
                    </div>
                </motion.div>
            )}

            {/* Testimonials */}
            {testimonials.length > 0 && (
                <motion.div
                    className="mt-16 md:mt-24 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto"
                    variants={containerVariants}
                    initial="hidden"
                    animate={isInView ? "show" : "hidden"}
                >
                    {testimonials.map((t) => (
                        <motion.figure
                            key={t.id}
                            className="rounded-2xl border border-black/15 bg-white p-6 md:p-7 flex flex-col gap-6 hover:border-brand-green hover:shadow-lg transition-all duration-300"
                            variants={itemVariants}
                        >
                            <svg
                                aria-hidden
                                className="w-7 h-7 text-brand-green shrink-0"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                            >
                                <path d="M9 7H6a2 2 0 00-2 2v3a2 2 0 002 2h2v3a2 2 0 01-2 2H5v2h1a4 4 0 004-4V9a2 2 0 00-1-2zm10 0h-3a2 2 0 00-2 2v3a2 2 0 002 2h2v3a2 2 0 01-2 2h-1v2h1a4 4 0 004-4V9a2 2 0 00-1-2z" />
                            </svg>
                            <blockquote className="text-base md:text-[17px] text-black/80 leading-relaxed font-medium flex-1">
                                <RenderLineBreaks text={t.quote} />
                            </blockquote>
                            <figcaption className="border-t border-black/10 pt-4">
                                <div className="font-semibold text-black">
                                    {t.author}
                                </div>
                                <div className="text-sm text-black/60">
                                    {[t.role, t.company]
                                        .filter(Boolean)
                                        .join(" · ")}
                                </div>
                            </figcaption>
                        </motion.figure>
                    ))}
                </motion.div>
            )}
        </section>
    );
}
