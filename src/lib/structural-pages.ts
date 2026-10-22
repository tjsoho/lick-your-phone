/**
 * Pages the portal addresses by slug.
 *
 * The cover, summary, signature, payment and onboarding slides are found by
 * slug rather than by what is on them, so removing one leaves the
 * presentation without that step. They are locked for that reason.
 *
 * They also can't sell anything. The carousel asks whether a page has a
 * service attached before it asks what the page's slug is, so hanging a
 * service on the summary would quietly replace the summary with a price
 * slide.
 */
export const STRUCTURAL_SLUGS = [
  "cover",
  "summary",
  "signature",
  "payment",
  "intake",
];

export function isStructuralPage(slug: string | null | undefined) {
  return !!slug && STRUCTURAL_SLUGS.includes(slug);
}
