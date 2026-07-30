"use client";

import { motion, PanInfo, useAnimation } from "framer-motion";
import React, { useEffect, useState, useRef, useCallback } from "react";

export interface CarouselItem {
    id: string | number;
    [key: string]: unknown;
}

interface ImageCarouselProps<T extends CarouselItem> {
    items: T[];
    visibleItems?: number;
    gap?: number;
    renderItem: (
        item: T,
        index: number,
        currentSlide: number,
    ) => React.ReactNode;
    className?: string;
    showArrows?: boolean;
    arrowPosition?: "overlay" | "below";
    showDots?: boolean;
    autoPlay?: boolean;
    autoPlayInterval?: number;
}

export function ImageCarousel<T extends CarouselItem>({
    items,
    visibleItems = 3,
    gap = 5,
    renderItem,
    className = "",
    showArrows = true,
    arrowPosition = "overlay",
    showDots = true,
    autoPlay = false,
    autoPlayInterval = 3000,
}: ImageCarouselProps<T>) {
    const totalItems = items.length;

    // Duplicating items to create an infinite scroll illusion.
    // We use a high multiplier so it rarely needs to reset.
    const MULTIPLIER = 5;
    const initialGlobalIndex = totalItems * MULTIPLIER;
    const [globalIndex, setGlobalIndex] = useState(initialGlobalIndex);
    const [isDragging, setIsDragging] = useState(false);
    const [activeVisibleItems, setActiveVisibleItems] = useState(visibleItems);
    const [isPaused, setIsPaused] = useState(false);
    const [containerWidth, setContainerWidth] = useState(0);

    // We handle custom animation controls to force zero-duration jumps precisely
    const controls = useAnimation();

    const containerRef = useRef<HTMLDivElement>(null);
    const pauseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isTransitioning = useRef(false);
    // Set true right before a silent reset so the next position-sync
    // skips the spring and snaps instantly. Without this, the spring
    // useEffect can race with controls.set and visually rewind through
    // every duplicated tile.
    const skipTransitionRef = useRef(false);
    const resetTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const centerOffset = Math.floor(activeVisibleItems / 2);
    // currentSlide is the visual offset applied to the container
    const currentSlide = globalIndex - centerOffset;
    // highlightedIndex is the true logical index of the centered item (0 to totalItems - 1)
    const highlightedIndex =
        ((globalIndex % totalItems) + totalItems) % totalItems;
    // Total number of items rendered
    const totalExtendedItems = totalItems * (MULTIPLIER * 2 + 1);

    // Responsive: Force 1 item visible on mobile
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth < 768) {
                setActiveVisibleItems(1);
            } else {
                setActiveVisibleItems(visibleItems);
            }

            if (containerRef.current) {
                setContainerWidth(
                    containerRef.current.getBoundingClientRect().width,
                );
            }
        };

        handleResize();
        // Force update to capture ref after render
        setTimeout(handleResize, 100);

        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, [visibleItems]);

    // Pause autoplay temporarily on interaction
    const pauseAutoplay = useCallback(() => {
        if (!autoPlay) return;

        setIsPaused(true);

        if (pauseTimeoutRef.current) {
            clearTimeout(pauseTimeoutRef.current);
        }

        pauseTimeoutRef.current = setTimeout(() => {
            setIsPaused(false);
        }, 5000);
    }, [autoPlay]);

    // Calculate layout metrics required for precise pixel movements
    // We use pixels for everything to ensure the flex gap matches the movement calculations perfectly
    const gapInPx = activeVisibleItems === 1 ? 0 : gap * 4;
    const itemWidth = `calc((100% - ${(activeVisibleItems - 1) * gapInPx}px) / ${activeVisibleItems})`;

    const itemWidthPx =
        containerWidth > 0
            ? (containerWidth - gapInPx * (activeVisibleItems - 1)) /
              activeVisibleItems
            : 0;

    const itemWithGap = itemWidthPx + gapInPx;
    const maxDragDistance = Math.max(
        0,
        (totalExtendedItems - activeVisibleItems) * itemWithGap,
    );

    const checkAndResetBounds = useCallback(
        (newIndex: number) => {
            // Safe zone boundaries
            const minGlobalIndex = totalItems * 2;
            const maxGlobalIndex = totalItems * (MULTIPLIER * 2 - 1);

            // If we move too far from center, queue a silent jump back to the center.
            // Skip if a reset is already pending — otherwise rapid clicks queue
            // multiple resets that fire in a flurry and look like a speed-up.
            if (
                (newIndex < minGlobalIndex || newIndex > maxGlobalIndex) &&
                resetTimeoutRef.current === null
            ) {
                // Pick the equivalent globalIndex (same logical mod) closest to the
                // initial center. Because every rendered slot displays
                // items[slot % totalItems], jumping by a multiple of totalItems
                // shows the exact same items in the exact same visible positions —
                // so the snap is visually invisible.
                const resetGlobalIndex =
                    newIndex -
                    Math.round((newIndex - initialGlobalIndex) / totalItems) *
                        totalItems;

                // Allow current animation to finish, then snap instantly.
                // The skip-transition flag tells the position-sync effect to
                // jump without spring physics, avoiding any visible rewind.
                resetTimeoutRef.current = setTimeout(() => {
                    skipTransitionRef.current = true;
                    setGlobalIndex(resetGlobalIndex);
                    resetTimeoutRef.current = null;
                }, 600);
            }
        },
        [totalItems, initialGlobalIndex],
    );

    const changeSlide = useCallback(
        (delta: number) => {
            if (isTransitioning.current) return;

            pauseAutoplay();
            setGlobalIndex((prev) => {
                const next = prev + delta;
                checkAndResetBounds(next);
                return next;
            });
        },
        [pauseAutoplay, checkAndResetBounds],
    );

    const nextSlide = () => changeSlide(1);
    const prevSlide = () => changeSlide(-1);

    const goToSlide = useCallback(
        (targetLogicalIndex: number) => {
            pauseAutoplay();
            // Find the shortest path to the target logical index from current
            const diff =
                (targetLogicalIndex - highlightedIndex + totalItems) %
                totalItems;
            const shortestDiff =
                diff > totalItems / 2 ? diff - totalItems : diff;

            setGlobalIndex((prev) => {
                const next = prev + shortestDiff;
                checkAndResetBounds(next);
                return next;
            });
        },
        [highlightedIndex, totalItems, pauseAutoplay, checkAndResetBounds],
    );

    // Auto play functionality
    useEffect(() => {
        if (!autoPlay || isPaused) return;

        const interval = setInterval(() => {
            setGlobalIndex((prev) => {
                const next = prev + 1;
                checkAndResetBounds(next);
                return next;
            });
        }, autoPlayInterval);

        return () => clearInterval(interval);
    }, [autoPlay, autoPlayInterval, isPaused, checkAndResetBounds]);

    // Handle drag interaction
    const handleDragStart = useCallback(() => {
        pauseAutoplay();
        setIsDragging(false);
    }, [pauseAutoplay]);

    const handleDrag = useCallback(
        (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
            if (Math.abs(info.offset.x) > 5 || Math.abs(info.offset.y) > 5) {
                setIsDragging(true);
            }
        },
        [],
    );

    const handleDragEnd = useCallback(
        (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
            if (!containerRef.current || itemWithGap === 0) return;

            const swipeVelocity = info.velocity.x;
            const swipeThreshold = 500; // pixels per second

            let targetCurrentSlide = currentSlide;

            if (Math.abs(swipeVelocity) > swipeThreshold) {
                targetCurrentSlide =
                    swipeVelocity > 0 ? currentSlide - 1 : currentSlide + 1;
            } else {
                const dragDistance = -info.offset.x;
                targetCurrentSlide = Math.round(
                    currentSlide + dragDistance / itemWithGap,
                );
            }

            const nextGlobalIndex = targetCurrentSlide + centerOffset;
            setGlobalIndex(nextGlobalIndex);
            checkAndResetBounds(nextGlobalIndex);

            setTimeout(() => {
                setIsDragging(false);
            }, 50);
        },
        [currentSlide, itemWithGap, centerOffset, checkAndResetBounds],
    );

    // Sync Framer controls with state. When skipTransitionRef is set
    // (silent reset to keep the carousel cycling), snap without spring
    // physics so the user never sees the jump.
    useEffect(() => {
        const skip = skipTransitionRef.current;
        skipTransitionRef.current = false;
        const targetX = -(currentSlide * itemWithGap);
        if (skip) {
            controls.set({ x: targetX });
        } else {
            controls.start({
                x: targetX,
                transition: {
                    type: "spring",
                    stiffness: 300,
                    damping: 30,
                    mass: 0.8,
                },
            });
        }
    }, [currentSlide, itemWithGap, controls]);

    // Clean up any pending reset timeout on unmount
    useEffect(() => {
        return () => {
            if (resetTimeoutRef.current) {
                clearTimeout(resetTimeoutRef.current);
            }
        };
    }, []);

    if (totalItems === 0) return null;

    return (
        <div className={`relative ${className} group`}>
            {/* Carousel Container */}
            <div
                ref={containerRef}
                className="overflow-hidden cursor-grab active:cursor-grabbing select-none"
                style={{ touchAction: "pan-y" }} // Prevent scrolling issues on mobile
            >
                <motion.div
                    className="flex will-change-transform" // Hardware acceleration
                    style={{ gap: `${gapInPx}px` }}
                    drag="x"
                    dragConstraints={{
                        left: -maxDragDistance,
                        right: 0,
                    }}
                    dragElastic={0.1}
                    dragMomentum={false}
                    dragDirectionLock
                    onDragStart={handleDragStart}
                    onDrag={handleDrag}
                    onDragEnd={handleDragEnd}
                    animate={controls}
                    initial={{ x: -(currentSlide * itemWithGap) }}
                >
                    {Array.from({ length: totalExtendedItems }).map(
                        (_, index) => {
                            const logicalIndex = index % totalItems;
                            const item = items[logicalIndex];
                            return (
                                <div
                                    key={`${item.id}-${index}`}
                                    className="flex-shrink-0"
                                    style={{
                                        width: itemWidth,
                                        pointerEvents: isDragging
                                            ? "none"
                                            : "auto",
                                        userSelect: isDragging
                                            ? "none"
                                            : "auto",
                                    }}
                                >
                                    {renderItem(
                                        item,
                                        logicalIndex,
                                        highlightedIndex,
                                    )}
                                </div>
                            );
                        },
                    )}
                </motion.div>
            </div>

            {/* Navigation Arrows (overlay) */}
            {showArrows &&
                totalItems > activeVisibleItems &&
                arrowPosition === "overlay" && (
                    <>
                        <motion.button
                            onClick={prevSlide}
                            whileTap={{ scale: 0.94 }}
                            className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-brand-green text-white backdrop-blur-sm rounded-full p-2 transition-all disabled:opacity-50 opacity-0 group-hover:opacity-100 focus:opacity-100 md:opacity-100" // Hide on mobile till hover/focus
                            aria-label="Previous slide"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={2}
                                stroke="currentColor"
                                className="w-6 h-6"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M15.75 19.5L8.25 12l7.5-7.5"
                                />
                            </svg>
                        </motion.button>
                        <motion.button
                            onClick={nextSlide}
                            whileTap={{ scale: 0.94 }}
                            className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-brand-green text-white backdrop-blur-sm rounded-full p-2 transition-all disabled:opacity-50 opacity-0 group-hover:opacity-100 focus:opacity-100 md:opacity-100"
                            aria-label="Next slide"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={2}
                                stroke="currentColor"
                                className="w-6 h-6"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M8.25 4.5l7.5 7.5-7.5 7.5"
                                />
                            </svg>
                        </motion.button>
                    </>
                )}

            {/* Navigation Arrows (below, centered) */}
            {showArrows &&
                totalItems > activeVisibleItems &&
                arrowPosition === "below" && (
                    <div className="mt-4 flex justify-center">
                        <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 p-1">
                            <motion.button
                                onClick={prevSlide}
                                whileTap={{ scale: 0.94 }}
                                className="bg-white/20 hover:bg-brand-green text-white rounded-full p-2 transition-all disabled:opacity-50"
                                aria-label="Previous slide"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth={2}
                                    stroke="currentColor"
                                    className="w-5 h-5"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M15.75 19.5L8.25 12l7.5-7.5"
                                    />
                                </svg>
                            </motion.button>
                            <motion.button
                                onClick={nextSlide}
                                whileTap={{ scale: 0.94 }}
                                className="bg-white/20 hover:bg-brand-green text-white rounded-full p-2 transition-all disabled:opacity-50"
                                aria-label="Next slide"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth={2}
                                    stroke="currentColor"
                                    className="w-5 h-5"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M8.25 4.5l7.5 7.5-7.5 7.5"
                                    />
                                </svg>
                            </motion.button>
                        </div>
                    </div>
                )}

            {/* Dot Indicators */}
            {showDots && totalItems > 1 && (
                <div className="flex justify-center gap-2 mt-6">
                    {items.map((item, index) => (
                        <button
                            key={item.id}
                            onClick={() => goToSlide(index)}
                            className={`transition-all duration-300 rounded-full ${
                                index === highlightedIndex
                                    ? "w-8 h-2 bg-brand-green"
                                    : "w-2 h-2 bg-white/50 hover:bg-white/70"
                            }`}
                            aria-label={`Go to card ${index + 1}`}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
