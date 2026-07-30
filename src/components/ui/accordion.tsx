"use client";

import * as AccordionPrimitive from "@radix-ui/react-accordion";
import * as React from "react";

import { cn } from "@/lib/utils";
import { Plus, Minus } from "lucide-react";

const Accordion = AccordionPrimitive.Root;

const AccordionItem = React.forwardRef<
    React.ElementRef<typeof AccordionPrimitive.Item>,
    React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Item>
>(({ className, ...props }, ref) => (
    <AccordionPrimitive.Item
        ref={ref}
        className={cn("border-b border-border", className)}
        {...props}
    />
));
AccordionItem.displayName = "AccordionItem";

interface AccordionTriggerProps extends React.ComponentPropsWithoutRef<
    typeof AccordionPrimitive.Trigger
> {
    editIcon?: React.ReactNode;
}

const AccordionTrigger = React.forwardRef<
    React.ElementRef<typeof AccordionPrimitive.Trigger>,
    AccordionTriggerProps
>(({ className, children, editIcon, ...props }, ref) => {
    const [isOpen, setIsOpen] = React.useState(false);

    return (
        <AccordionPrimitive.Header className="flex">
            <AccordionPrimitive.Trigger
                ref={ref}
                className={cn(
                    "flex flex-1 items-center justify-between py-2 text-left text-[15px] font-semibold leading-6 transition-all [&>svg]:transition-all [&>svg]:duration-500 [&>svg]:ease-[cubic-bezier(0.4,0,0.2,1)] hover:[&>svg]:rotate-90",
                    className,
                )}
                onPointerDown={() => setIsOpen(!isOpen)}
                {...props}
            >
                {children}
                <div className="flex items-center gap-2">
                    {editIcon}
                    <div className="relative group">
                        <Plus
                            size={20}
                            strokeWidth={2.5}
                            className={cn(
                                "shrink-0 transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] group-hover:rotate-90 text-lyp-cherry rounded-full border border-lyp-cherry p-2 w-8 h-8",
                                isOpen
                                    ? "opacity-0 rotate-90"
                                    : "opacity-100 rotate-0",
                            )}
                            aria-hidden="true"
                        />
                        <Minus
                            size={20}
                            strokeWidth={2.5}
                            className={cn(
                                "shrink-0 transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] absolute top-0 left-0 group-hover:rotate-90 text-lyp-cherry rounded-full border border-lyp-cherry p-2 w-8 h-8",
                                isOpen
                                    ? "opacity-100 rotate-0"
                                    : "opacity-0 rotate-90",
                            )}
                            aria-hidden="true"
                        />
                    </div>
                </div>
            </AccordionPrimitive.Trigger>
        </AccordionPrimitive.Header>
    );
});
AccordionTrigger.displayName = AccordionPrimitive.Trigger.displayName;

const AccordionContent = React.forwardRef<
    React.ElementRef<typeof AccordionPrimitive.Content>,
    React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Content>
>(({ className, children, ...props }, ref) => (
    <AccordionPrimitive.Content
        ref={ref}
        className="overflow-hidden text-sm transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down"
        {...props}
    >
        <div className={cn("pb-2 pt-0", className)}>{children}</div>
    </AccordionPrimitive.Content>
));

AccordionContent.displayName = AccordionPrimitive.Content.displayName;

export { Accordion, AccordionContent, AccordionItem, AccordionTrigger };
