"use client";

import { HomePageProps } from "@/app/_config";
import { motion, useInView } from "framer-motion";
import React from "react";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { RenderLineBreaks } from "@/utils/render-line-breaks";

interface Section6Props {
    content: HomePageProps["content"];
}

export default function Section6({ content }: Section6Props) {
    const ref = React.useRef(null);
    const isInView = useInView(ref, {
        amount: 0.3,
    });

    const titleVariants = {
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
                duration: 1.2,
                ease: [0.4, 0, 0.2, 1] as const,
            },
        },
    };

    const faqVariants = {
        hidden: {
            opacity: 0,
            y: 30,
            scale: 0.9,
            rotateX: -10,
        },
        show: {
            opacity: 1,
            y: 0,
            scale: 1,
            rotateX: 0,
            transition: {
                duration: 1.0,
                ease: [0.4, 0, 0.2, 1] as const,
            },
        },
    };

    const containerVariants = {
        hidden: {},
        show: {
            transition: {
                staggerChildren: 0.1,
            },
        },
    };

    const staticFaqs = [
        {
            question: content.section6faq1question,
            answer: content.section6faq1answer,
            number: "01",
            questionBold: content.section6faq1questionBold,
            answerBold: content.section6faq1answerBold,
        },
        {
            question: content.section6faq2question,
            answer: content.section6faq2answer,
            number: "02",
            questionBold: content.section6faq2questionBold,
            answerBold: content.section6faq2answerBold,
        },
        {
            question: content.section6faq3question,
            answer: content.section6faq3answer,
            number: "03",
            questionBold: content.section6faq3questionBold,
            answerBold: content.section6faq3answerBold,
        },
        {
            question: content.section6faq4question,
            answer: content.section6faq4answer,
            number: "04",
            questionBold: content.section6faq4questionBold,
            answerBold: content.section6faq4answerBold,
        },
    ];

    // Add additional FAQs with dynamic numbering
    const additionalFaqs = (content.additionalSection6Faqs || []).map(
        (faq, index) => ({
            question: faq.question,
            answer: faq.answer,
            number: String(5 + index).padStart(2, "0"),
            questionBold: faq.questionBold,
            answerBold: faq.answerBold,
        }),
    );

    const faqs = [...staticFaqs, ...additionalFaqs];

    return (
        <section className="py-16 bg-white" ref={ref}>
            <div className="max-w-4xl mx-auto px-4">
                {/* Section Title */}
                <motion.h2
                    className={`text-gray-800 mb-12 ${content.section6titleBold ? "h2-bold" : ""}`}
                    variants={titleVariants}
                    initial="hidden"
                    animate={isInView ? "show" : "hidden"}
                >
                    <RenderLineBreaks text={content.section6title} />
                </motion.h2>

                {/* FAQ Accordion */}
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate={isInView ? "show" : "hidden"}
                >
                    <Accordion type="single" collapsible className="w-full">
                        {faqs.map((faq, index) => (
                            <motion.div key={index} variants={faqVariants}>
                                <AccordionItem
                                    value={`item-${index}`}
                                    className="border-b border-gray-200 bg-white data-[state=open]:bg-brand-green/5 px-4 py-4"
                                >
                                    <AccordionTrigger className="hover:no-underline [&>svg]:bg-brand-green [&>svg]:text-white [&>svg]:rounded-full [&>svg]:border-2 [&>svg]:border-brand-green [&>svg]:p-2 [&>svg]:w-8 [&>svg]:h-8">
                                        <div className="flex items-center space-x-4 text-left">
                                            <span className="text-brand-green font-bold text-lg">
                                                {faq.number}
                                            </span>
                                            <h4
                                                className={`text-gray-800 ${faq.questionBold ? "h4-bold" : ""}`}
                                            >
                                                <RenderLineBreaks
                                                    text={faq.question}
                                                />
                                            </h4>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="text-muted-foreground">
                                        <div className="ml-12">
                                            <p
                                                className={`text-gray-600 leading-relaxed ${faq.answerBold ? "p-bold" : ""}`}
                                            >
                                                <RenderLineBreaks
                                                    text={faq.answer}
                                                />
                                            </p>
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            </motion.div>
                        ))}
                    </Accordion>
                </motion.div>
            </div>
        </section>
    );
}
