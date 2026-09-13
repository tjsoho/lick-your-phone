import type { CopyKind, CopyOverrides, CopySlot } from "./types";
import { COVER_COPY } from "./cover";
import { SERVICE_COPY } from "./service";
import { RESULTS_COPY } from "./results";
import { SUMMARY_COPY } from "./summary";
import { SIGNATURE_COPY } from "./signature";
import { PAYMENT_COPY } from "./payment";
import { INTAKE_COPY } from "./intake";
import { GLOBAL_COPY } from "./global";

export type { CopyKind, CopyOverrides, CopySlot } from "./types";

export const COPY_REGISTRY: Record<CopyKind, CopySlot[]> = {
  cover: COVER_COPY,
  service: SERVICE_COPY,
  results: RESULTS_COPY,
  summary: SUMMARY_COPY,
  signature: SIGNATURE_COPY,
  payment: PAYMENT_COPY,
  intake: INTAKE_COPY,
  global: GLOBAL_COPY,
};

/** Replaces {name} placeholders; unknown ones are left as written. */
export function fillCopy(
  template: string,
  vars?: Record<string, string | number>,
) {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  );
}

/**
 * The wording for one slot: the override if one is set and not blank,
 * otherwise the default. An unregistered key renders as the key itself, so a
 * typo shows up on screen instead of silently rendering nothing.
 */
export function resolveCopy(
  kind: CopyKind,
  key: string,
  overrides?: CopyOverrides | null,
  vars?: Record<string, string | number>,
) {
  const override = overrides?.[key];
  const slot = COPY_REGISTRY[kind].find((s) => s.key === key);
  const base =
    override != null && override.trim() !== "" ? override : (slot?.default ?? key);
  return fillCopy(base, vars);
}

/** The slugs the portal finds its structural pages by, keyed by kind. */
export const SLUG_KINDS: Partial<Record<string, CopyKind>> = {
  cover: "cover",
  summary: "summary",
  signature: "signature",
  payment: "payment",
  intake: "intake",
};

/** Which wording groups a page's editor offers. Global wording lives in Settings. */
export function copyKindsForPage(page: {
  slug: string | null;
  type: string | null;
  hasResultsBlock?: boolean;
}): CopyKind[] {
  const bySlug = page.slug ? SLUG_KINDS[page.slug] : undefined;
  if (bySlug) return [bySlug];
  if (page.type === "service") return ["service"];
  if (page.hasResultsBlock) return ["results"];
  return [];
}
