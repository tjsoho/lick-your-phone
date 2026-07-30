"use client";

import { HomePageProps } from "@/app/_config";
import { motion, useInView, Variants } from "framer-motion";
import React from "react";
import Image from "next/image";

interface Section4Props {
    content: HomePageProps["content"];
}

export default function Section4({ content }: Section4Props) {
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

    const servicesContainerVariants: Variants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.08,
                delayChildren: 0.3,
            },
        },
    };

    const serviceCardVariants: Variants = {
        hidden: { opacity: 0, y: 20, scale: 0.9 },
        show: {
            opacity: 1,
            y: 0,
            scale: 1,
            transition: {
                duration: 0.5,
                ease: [0.25, 0.46, 0.45, 0.94],
            },
        },
    };

    return (
        <section className="py-4 md:py-6 px-4" ref={ref}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-10 max-w-[1540px] mx-auto lg:px-8">
                <motion.div
                    className="max-w-xl"
                    variants={containerVariants}
                    initial="hidden"
                    animate={isInView ? "show" : "hidden"}
                >
                    <motion.p
                        className="uppercase mb-4 !text-xs !font-semibold text-brand-green tracking-wider"
                        variants={subtitleVariants}
                    >
                        {content.section4subtitle}
                    </motion.p>
                    <motion.h2
                        className={`!font-medium mb-4 md:mb-6 text-2xl md:text-3xl lg:text-4xl ${content.section4titleBold ? "!font-bold" : ""}`}
                        variants={titleVariants}
                    >
                        {content.section4title}
                    </motion.h2>
                    <motion.p
                        className={`font-medium !text-black/60 ${content.section4descriptionBold ? "!font-bold" : ""}`}
                        variants={paragraphVariants}
                    >
                        {content.section4description}
                    </motion.p>
                </motion.div>
                <motion.div
                    className=""
                    variants={servicesContainerVariants}
                    initial="hidden"
                    animate={isInView ? "show" : "hidden"}
                >
                    <div className="flex flex-wrap justify-center gap-2 md:gap-4">
                        {content.section4services.map((service) => (
                            <motion.div
                                key={service.id}
                                className="bg-white/[24%] hover:bg-brand-green border border-brand-green hover:text-white rounded-full text-center shadow px-3 md:px-5 py-2 md:py-2.5 flex items-center gap-2 whitespace-nowrap font-medium text-sm md:text-base cursor-pointer transition-colors duration-300"
                                variants={serviceCardVariants}
                                whileHover={{
                                    scale: 1.1,
                                }}
                                transition={{
                                    duration: 0.3,
                                    ease: "easeInOut",
                                }}
                            >
                                {/*Icon*/}
                                {service.icon ? (
                                    <div className="w-5 h-5 md:w-6 md:h-6 relative flex-shrink-0">
                                        <Image
                                            src={service.icon}
                                            alt={`${service.name} icon`}
                                            fill
                                            className="object-contain"
                                        />
                                    </div>
                                ) : (
                                    <div className="w-5 h-5 md:w-6 md:h-6 bg-gray-300 rounded-lg flex-shrink-0"></div>
                                )}
                                <span
                                    className={
                                        service.nameBold ? "!font-bold" : ""
                                    }
                                >
                                    {service.name}
                                </span>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>
            </div>
        </section>
    );
}
