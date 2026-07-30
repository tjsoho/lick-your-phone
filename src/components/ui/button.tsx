import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { motion } from "framer-motion";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
    "relative inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-semibold ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 group",
    {
        variants: {
            variant: {
                default: "text-primary-foreground",
                destructive:
                    "bg-destructive text-destructive-foreground hover:bg-destructive/90 hover:border-brand-green hover:text-brand-green border border-transparent",
                outline:
                    "border-gray-300 bg-background hover:bg-accent hover:text-accent-foreground hover:border-brand-green hover:text-brand-green border",
                secondary:
                    "bg-black text-white hover:bg-black backdrop-blur-lg hover:border-white hover:text-white border border-transparent",
                ghost: "hover:bg-accent hover:text-accent-foreground hover:border-brand-green hover:text-brand-green border border-transparent",
                link: "text-primary underline-offset-4 hover:underline hover:border-brand-green hover:text-brand-green border border-transparent",
                white: "bg-white text-black hover:bg-gray-100 hover:border-brand-green hover:text-brand-green border border-transparent",
            },
            size: {
                default: "px-6 py-2",
                sm: "h-9 rounded-md px-3",
                lg: "h-11 rounded-md px-8",
                icon: "h-10 w-10",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    },
);

export interface ButtonProps
    extends
        React.ButtonHTMLAttributes<HTMLButtonElement>,
        VariantProps<typeof buttonVariants> {
    asChild?: boolean;
}

const MotionSlot = motion(Slot);

/* eslint-disable @typescript-eslint/no-explicit-any -- Button spreads props to motion.button/Slot which have incompatible prop types */
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    (
        { className, variant, size, asChild = false, children, ...props },
        ref,
    ) => {
        const isDefault = variant === "default" || !variant;

        if (isDefault && !asChild) {
            return (
                <motion.button
                    ref={ref}
                    className={cn(buttonVariants({ variant, size, className }))}
                    initial="initial"
                    whileHover="hover"
                    whileTap="tap"
                    animate="idle"
                    {...(props as any)}
                >
                    <motion.div
                        className="absolute inset-0 z-0 bg-primary/50 blur-xl"
                        variants={{
                            idle: {
                                scale: [1, 1.1, 1],
                                opacity: [0.4, 0.7, 0.4],
                                transition: {
                                    duration: 3,
                                    repeat: Infinity,
                                    ease: "easeInOut",
                                },
                            },
                            hover: {
                                scale: 1.15,
                                opacity: 0.8,
                                transition: { duration: 0.3 },
                            },
                        }}
                    />
                    <div className="absolute inset-0 z-10 rounded-full bg-primary border border-white/10 transition-all duration-300 group-hover:brightness-110 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)]" />

                    <div className="absolute inset-0 z-20 overflow-hidden rounded-full pointer-events-none">
                        <motion.div
                            className="absolute top-0 bottom-0 z-20 w-[40%] bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-[-25deg]"
                            variants={{
                                initial: { left: "-100%" },
                                hover: { left: "200%" },
                            }}
                            transition={{ duration: 0.5, ease: "easeOut" }}
                        />
                    </div>

                    <span className="relative z-30 flex items-center justify-center gap-2">
                        <motion.span
                            variants={{
                                initial: { x: 8 },
                                hover: { x: 0 },
                            }}
                            transition={{
                                type: "spring",
                                stiffness: 300,
                                damping: 20,
                            }}
                        >
                            {children}
                        </motion.span>

                        <motion.span
                            className="flex items-center overflow-hidden"
                            variants={{
                                initial: { width: 0, opacity: 0, x: -10 },
                                hover: { width: "auto", opacity: 1, x: 0 },
                            }}
                            transition={{
                                type: "spring",
                                stiffness: 300,
                                damping: 20,
                            }}
                        >
                            <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <path d="M5 12h14" />
                                <path d="m12 5 7 7-7 7" />
                            </svg>
                        </motion.span>
                    </span>
                </motion.button>
            );
        }

        const Comp = asChild ? MotionSlot : motion.button;
        return (
            <Comp
                className={cn(
                    buttonVariants({ variant, size, className }),
                    "border",
                )}
                ref={ref}
                whileTap={{ scale: 0.97 }}
                {...(props as any)}
            >
                {children}
            </Comp>
        );
    },
);
/* eslint-enable @typescript-eslint/no-explicit-any */
Button.displayName = "Button";

export { Button, buttonVariants };
