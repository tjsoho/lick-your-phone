"use client";

import { HomePageProps } from "@/app/_config";
import {
    motion,
    useInView,
    useScroll,
    useTransform,
    Variants,
} from "framer-motion";
import React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { RenderLineBreaks } from "@/utils/render-line-breaks";
import { Button } from "../ui/button";
import { ImageCarousel } from "@/components/carousel";

interface HeroProps {
    content: HomePageProps["content"];
}

export default function Hero({ content }: HeroProps) {
    const ref = React.useRef(null);
    const router = useRouter();
    // Track pointerdown position so we can distinguish a click/tap from a
    // carousel drag. Framer-motion's drag on the carousel container swallows
    // ordinary <Link> clicks even when no drag actually occurs, so we
    // navigate programmatically only when pointer movement < 6px.
    const tapStart = React.useRef<{ x: number; y: number } | null>(null);
    const isInView = useInView(ref, {
        once: true, // Trigger animation only once
        amount: 0.2, // Trigger when 20% of the element is in view
    });

    // Scroll-based scale and rounded corners for hero image
    const { scrollYProgress } = useScroll({
        target: ref,
        offset: ["start start", "end start"],
    });
    const imageScale = useTransform(scrollYProgress, [0, 0.4], [1, 0.97]);
    const imageRadius = useTransform(
        scrollYProgress,
        [0, 0.4],
        ["0px", "24px"],
    );

    // Carousel data from content
    const carouselItems = content.heroCarousel;

    // Track hovered card
    const [hoveredIndex, setHoveredIndex] = React.useState<number | null>(null);

    const containerVariants: Variants = {
        initial: {},
        animate: {
            transition: {
                staggerChildren: 0.15,
                delayChildren: 0.2,
            },
        },
    };

    const titleVariants: Variants = {
        initial: { opacity: 0, y: 30, filter: "blur(4px)" },
        animate: {
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
        initial: { opacity: 0, y: 30, filter: "blur(4px)" },
        animate: {
            opacity: 1,
            y: 0,
            filter: "blur(0px)",
            transition: {
                duration: 0.8,
                ease: [0.25, 0.46, 0.45, 0.94],
            },
        },
    };

    const buttonContainerVariants: Variants = {
        initial: { opacity: 0 },
        animate: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1,
            },
        },
    };

    const buttonVariants: Variants = {
        initial: { opacity: 0, y: 20, scale: 0.95 },
        animate: {
            opacity: 1,
            y: 0,
            scale: 1,
            transition: {
                duration: 0.6,
                ease: [0.25, 0.46, 0.45, 0.94],
            },
        },
    };

    const carouselContainerVariants: Variants = {
        initial: { opacity: 0, y: 40 },
        animate: {
            opacity: 1,
            y: 0,
            transition: {
                duration: 0.8,
                ease: [0.25, 0.46, 0.45, 0.94],
                staggerChildren: 0.1,
                delayChildren: 0.4,
            },
        },
    };

    const imageVariants: Variants = {
        initial: { opacity: 0, scale: 0.9, y: 20 },
        animate: (custom: number) => ({
            opacity: 1,
            scale: 1,
            y: 0,
            transition: {
                duration: 0.7,
                ease: [0.25, 0.46, 0.45, 0.94],
                delay: custom * 0.08,
            },
        }),
    };

    return (
        <section
            className="min-h-screen mt-0 relative flex items-center"
            ref={ref}
        >
            {/* Background: full-size container, image shrinks and rounds on scroll */}
            <div className="absolute -z-1 inset-0 bg-white overflow-hidden">
                <motion.div
                    className="absolute inset-0 origin-center overflow-hidden"
                    style={{
                        scale: imageScale,
                        borderRadius: imageRadius,
                    }}
                >
                    <Image
                        src={content.heroImage || "/images/placeholder.svg"}
                        alt="Background image for hero section"
                        fill
                        className="object-cover object-center "
                        priority
                        sizes="100vw"
                    />

                    {/* Black Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />

                    {/* White Overlay */}
                    <div className="absolute w-full h-[35%] bottom-0 left-0 bg-gradient-to-t from-white/80 to-transparent" />
                </motion.div>
            </div>

            <div className="relative mt-auto bottom-0 z-10 w-full">
                <div className="grid lg:grid-cols-2 gap-12 lg:gap-40 max-w-[1540px] mx-auto px-4 md:px-8 py-20">
                    <motion.div
                        className=""
                        variants={containerVariants}
                        initial="initial"
                        animate={isInView ? "animate" : "initial"}
                    >
                        <motion.h1
                            className="text-white mb-4 leading-[55px]"
                            variants={titleVariants}
                        >
                            {content.heroTitle}
                        </motion.h1>
                        <motion.p
                            className="font-medium text-white/80 mb-9 max-w-2xl"
                            variants={paragraphVariants}
                        >
                            <RenderLineBreaks text={content.heroParagraph} />
                        </motion.p>

                        <motion.div
                            className="flex items-center gap-4"
                            variants={buttonContainerVariants}
                        >
                            <motion.div variants={buttonVariants}>
                                <Button className="rounded-full">
                                    {content.heroButton1Text}
                                </Button>
                            </motion.div>

                            <motion.div variants={buttonVariants}>
                                <Button
                                    variant="secondary"
                                    className="rounded-full"
                                >
                                    {content.heroButton2Text}
                                </Button>
                            </motion.div>
                        </motion.div>
                    </motion.div>

                    <motion.div
                        className="mt-8 lg:mt-auto pb-4 lg:-mb-12 min-w-0 max-w-[340px] sm:max-w-[420px] lg:max-w-none mx-auto w-full"
                        variants={carouselContainerVariants}
                        initial="initial"
                        animate={isInView ? "animate" : "initial"}
                    >
                        <ImageCarousel
                            items={carouselItems}
                            visibleItems={3}
                            gap={5}
                            showArrows={true}
                            showDots={false}
                            arrowPosition="below"
                            autoPlay={true}
                            autoPlayInterval={1000 * 2} // 2 seconds
                            renderItem={(item, index, highlightedIndex) => {
                                const isActive = index === highlightedIndex;
                                const isHovered = hoveredIndex === index;
                                // Show green border if: this card is hovered OR (this card is active AND no other card is hovered)
                                const showGreenBorder =
                                    isHovered ||
                                    (isActive && hoveredIndex === null);
                                const slide = (
                                    <motion.div
                                        className={`shadow-md rounded-xl aspect-[9/11] overflow-hidden relative transition-all duration-300 h-full w-full ${
                                            showGreenBorder
                                                ? "border border-brand-green"
                                                : "border border-white"
                                        }`}
                                        variants={imageVariants}
                                        custom={index}
                                        onMouseEnter={() =>
                                            setHoveredIndex(index)
                                        }
                                        onMouseLeave={() =>
                                            setHoveredIndex(null)
                                        }
                                    >
                                        <div className="">
                                            <Image
                                                src={item.image}
                                                alt={item.title}
                                                fill
                                                className="w-full h-full object-cover object-center"
                                            />
                                            {/* Overlay */}
                                            <div className="absolute inset-0 bg-black/30" />
                                        </div>

                                        <div className="absolute z-10 py-4 px-5 inset-0 flex flex-col">
                                            {/*Icon*/}
                                            {item.showIcon !== false && item.icon && (
                                                <div className="w-6 h-6 relative">
                                                    <Image
                                                        src={item.icon}
                                                        alt={`${item.title} icon`}
                                                        fill
                                                        className="object-contain"
                                                    />
                                                </div>
                                            )}

                                            <div className="mt-auto">
                                                <h3 className="text-white !text-xl !font-medium">
                                                    {item.title}
                                                </h3>
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                                if (!item.pageSlug) {
                                    return (
                                        <div className="p-1 h-full w-full">
                                            {slide}
                                        </div>
                                    );
                                }
                                return (
                                    <div
                                        className="p-1 h-full w-full cursor-pointer"
                                        role="link"
                                        tabIndex={0}
                                        aria-label={item.title}
                                        onPointerDown={(e) => {
                                            tapStart.current = {
                                                x: e.clientX,
                                                y: e.clientY,
                                            };
                                        }}
                                        onPointerUp={(e) => {
                                            const start = tapStart.current;
                                            tapStart.current = null;
                                            if (!start) return;
                                            const dx = Math.abs(
                                                e.clientX - start.x,
                                            );
                                            const dy = Math.abs(
                                                e.clientY - start.y,
                                            );
                                            // Treat as a tap only if pointer
                                            // barely moved. Anything bigger is
                                            // a carousel drag — let the
                                            // carousel handle it.
                                            if (
                                                dx < 6 &&
                                                dy < 6 &&
                                                item.pageSlug
                                            ) {
                                                router.push(item.pageSlug);
                                            }
                                        }}
                                        onKeyDown={(e) => {
                                            if (
                                                (e.key === "Enter" ||
                                                    e.key === " ") &&
                                                item.pageSlug
                                            ) {
                                                e.preventDefault();
                                                router.push(item.pageSlug);
                                            }
                                        }}
                                    >
                                        {slide}
                                    </div>
                                );
                            }}
                        />
                    </motion.div>
                </div>
            </div>

            {/* Scroll down — forever animated lux indicator */}
            <div className="absolute bottom-6 z-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
                <motion.div
                    className="flex flex-col items-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.2, duration: 0.6 }}
                >
                    <motion.div
                        className="relative w-6 h-10 rounded-full border-2 border-white/70 flex justify-center pt-2"
                        initial={{ opacity: 0.9 }}
                        animate={{
                            opacity: [0.9, 0.5, 0.9],
                            scale: [1, 1.02, 1],
                        }}
                        transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: "easeInOut",
                        }}
                    >
                        <motion.span
                            className="absolute top-1.5 left-1/2 -translate-x-1/2 w-1 h-2 rounded-full -ml-[2px] bg-white/90"
                            animate={{
                                y: [0, 6, 0],
                                opacity: [1, 0.3, 1],
                            }}
                            transition={{
                                duration: 1.8,
                                repeat: Infinity,
                                ease: [0, 0, 0.6, 1],
                            }}
                        />
                    </motion.div>
                </motion.div>
                <motion.span
                    className="text-white/80 text-xs font-medium tracking-widest uppercase"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.4, duration: 0.5 }}
                >
                    Scroll
                </motion.span>
            </div>
        </section>
    );
}
