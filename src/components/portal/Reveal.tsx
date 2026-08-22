import type { CSSProperties, ElementType, HTMLAttributes, ReactNode } from "react";

/**
 * THE PORTAL'S ENTRY PRIMITIVE.
 *
 * One element, one delay. Everything visible on a proposal slide is wrapped in
 * (or carries) a `Reveal`, and the page composes the choreography by handing
 * each part an `index`: eyebrow 0, title 1, rule 2, body 3, picture 4. The
 * result is a slide that arrives in reading order.
 *
 * The animation itself is CSS (`.portal-reveal*` in globals.css) rather than
 * framer-motion, for one reason that matters here: the carousel remounts the
 * whole page subtree on every page change, and a CSS animation on a freshly
 * mounted element runs again automatically. No state, no effects, no
 * per-element JS on a page that can carry forty of these.
 *
 * `prefers-reduced-motion: reduce` kills every one of them in a single rule.
 */

export type RevealVariant =
  | "rise"
  | "fall"
  | "fade"
  | "left"
  | "right"
  | "lift"
  | "rule"
  | "pop";

const VARIANT_CLASS: Record<RevealVariant, string> = {
  rise: "",
  fall: "portal-reveal-fall",
  fade: "portal-reveal-fade",
  left: "portal-reveal-left",
  right: "portal-reveal-right",
  lift: "portal-reveal-lift",
  rule: "portal-reveal-rule",
  pop: "portal-reveal-pop",
};

/** Milliseconds between two neighbouring parts of a slide. */
export const STEP = 70;

/**
 * Milliseconds before the first part of a slide moves. Small but non-zero:
 * the page transition is still settling for the first frames, and a beat of
 * stillness is what separates "arriving" from "popping in".
 */
export const LEAD = 60;

/** The delay a part at `index` gets. Exported so pages can chain sections. */
export function revealDelay(index = 0, step: number = STEP, lead: number = LEAD) {
  return lead + index * step;
}

type RevealProps = {
  /** Element to render. Defaults to a plain div. */
  as?: ElementType;
  variant?: RevealVariant;
  /** Position in the slide's reading order. */
  index?: number;
  /** Override the interval — long lists use a tighter one. */
  step?: number;
  /** Override the offset of the whole group. */
  lead?: number;
  /** Absolute delay in ms. Wins over index/step/lead when given. */
  delay?: number;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
} & Omit<HTMLAttributes<HTMLElement>, "style" | "className" | "children">;

export default function Reveal({
  as = "div",
  variant = "rise",
  index = 0,
  step = STEP,
  lead = LEAD,
  delay,
  className = "",
  style,
  children,
  ...rest
}: RevealProps) {
  const Tag = as as ElementType;
  const ms = delay ?? revealDelay(index, step, lead);

  return (
    <Tag
      {...rest}
      className={`portal-reveal ${VARIANT_CLASS[variant]} ${className}`.trim()}
      style={{ animationDelay: `${ms}ms`, ...style }}
    >
      {children}
    </Tag>
  );
}
