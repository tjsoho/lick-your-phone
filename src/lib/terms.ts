/**
 * WHICH TERMS THE CLIENT ACTUALLY GETS.
 *
 * Three things can stand as the full terms, and the agency may have set any
 * combination of them in Settings → Agreement:
 *
 *   1. a document they uploaded,
 *   2. a link to the T&Cs they host themselves,
 *   3. the clause list, rendered to a PDF on request.
 *
 * The order above is the rule, and this is the only place it is written down.
 * `GET /api/terms/<token>` applies it to serve the thing; the portal reads the
 * `kind` off it to say which one the client is about to open. Adding a fourth
 * source means editing this function and nothing else.
 */

export type TermsTarget =
  /** An uploaded file. Downloaded, because it is theirs to keep. */
  | { kind: "document"; href: string; fileName: string | null }
  /** A page the agency hosts. Opened in a new tab, because it is a website. */
  | { kind: "link"; href: string }
  /** Nothing uploaded or linked, but there are clauses to render. */
  | { kind: "generated" }
  /** Nothing at all — the portal offers no full-terms control. */
  | { kind: "none" };

export type TermsKind = TermsTarget["kind"];

export type TermsSources = {
  termsDocumentUrl: string | null;
  termsDocumentName: string | null;
  termsUrl: string | null;
  /** How many clauses the summary has to fall back on. */
  clauseCount: number;
};

export function resolveTermsTarget({
  termsDocumentUrl,
  termsDocumentName,
  termsUrl,
  clauseCount,
}: TermsSources): TermsTarget {
  const document = termsDocumentUrl?.trim();
  if (document) {
    return {
      kind: "document",
      href: document,
      fileName: termsDocumentName?.trim() || null,
    };
  }

  const link = termsUrl?.trim();
  if (link) return { kind: "link", href: link };

  return clauseCount > 0 ? { kind: "generated" } : { kind: "none" };
}

/**
 * Is this a link we are willing to send a client to?
 *
 * Deliberately narrow: an absolute http(s) address with a host in it. A typo
 * like "wwwlickyourphone.com" or a stray "mailto:" is refused in Settings
 * rather than shipped to every signing page as a dead link.
 */
export function isValidTermsUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  try {
    const url = new URL(trimmed);
    return (
      (url.protocol === "https:" || url.protocol === "http:") &&
      // "https://foo" has a hostname but no dot — almost always a typo.
      url.hostname.includes(".")
    );
  } catch {
    return false;
  }
}
