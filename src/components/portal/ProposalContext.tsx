"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import { useDiscountTimerLive } from "./DiscountCountdown";
import {
  resolveCopy,
  type CopyKind,
  type CopyOverrides,
} from "@/lib/portal-copy";
import type { TermsKind } from "@/lib/terms";
import {
  applyComplimentary,
  DISCOUNT_GRACE_MS,
  isDiscountLive,
  priceServices,
} from "@/lib/pricing";
import {
  buildSelectionLines,
  totalSelection,
  type SelectionTotals,
} from "@/lib/selection-pricing";

/* ------------------------------------------------------------------ */
/*  Types coming from the server component                            */
/* ------------------------------------------------------------------ */

export interface ContentBlock {
  id: string;
  type:
    | "heading"
    /** A line that titles a passage inside a section, under a heading. */
    | "subheading"
    | "paragraph"
    | "image"
    | "list"
    | "custom"
    | "logos"
    | "media_carousel"
    | "collage"
    /** `{ url, alt, text }[]` — client logo + result copy, laid out two across. */
    | "results"
    /**
     * `{ url, alt }[]` — the image that overlaps the page's featured image to
     * form the offset pair in the page's image column. Consumed by ContentPage,
     * never rendered inline in the text column.
     */
    | "offset_image"
    | null;
  content: unknown;
  sequence: number | null;
}

export interface PageData {
  id: string;
  type: "service" | "content" | null;
  slug: string | null;
  title: string | null;
  sequence: number;
  serviceId: string | null;
  featuredImage: string | null;
  imagePosition: "left" | "right" | null;
  contentBlocks: ContentBlock[];
  /** Overrides for this page's fixed wording, keyed by slot. See src/lib/portal-copy. */
  copy?: CopyOverrides;
}

export interface ProposalData {
  id: string;
  token: string;
  status: string | null;
  discountExpiresAt: string | null;
  /** Show the client a countdown to discountExpiresAt. */
  discountTimerActive: boolean;
  /** The slide this client was last on, or null if never opened. */
  lastPage: number | null;
  /** The furthest slide this client has reached, or null if never opened. */
  furthestPage: number | null;
  /** When a scheduled discount window opens. Null means "as soon as it is on". */
  discountStartsAt?: string | null;
  /** When the client signed; the discount is judged at that moment from then on. */
  signedAt: string | null;
  clientName: string;
  /** The person signing, which is not the venue's own name. */
  contactName: string | null;
  /**
   * The email this proposal was sent to — the signer's if they have signed,
   * the client record's otherwise. The onboarding form opens its email
   * questions with it so nobody retypes what we already know. Absent in the
   * dashboard's page previews, which have no real proposal behind them.
   */
  clientEmail?: string | null;
  /**
   * The client's own logo, shown on the cover in place of the LickYourPhone
   * mark. Optional: absent in the dashboard's page previews, and null for a
   * client who has not uploaded one. `resolveCoverLogo` in
   * `src/lib/client-logo` decides what the cover actually draws.
   */
  clientLogoUrl?: string | null;
  /**
   * This venue's own logo, which the cover prefers over the client's — one
   * client can hold several restaurants, each with its own branding. Null for
   * a venue that has none, which is when the client's is used.
   */
  venueLogoUrl?: string | null;
  venueName: string;
}

/* ------------------------------------------------------------------ */
/*  Selection state                                                   */
/* ------------------------------------------------------------------ */

/** Workspace-wide agreement copy, shared by every proposal. */
export interface AgreementCopy {
  termsClauses: string[];
  postSignatureText: string;
  /**
   * What the full-terms control actually opens — the agency's uploaded
   * document, their own link, the clauses rendered as a PDF, or nothing.
   * Decided by `resolveTermsTarget`; the slide only reads it to pick its
   * wording, because the address is `/api/terms/<token>` either way.
   */
  termsKind?: TermsKind;
  /** Workspace-wide wording shown on every slide (the `global` copy kind). */
  portalCopy?: CopyOverrides;
}

export interface Selection {
  serviceId: string;
  tierId: string | null; // null = non-tiered, selected at service level
}

interface ProposalContextValue {
  proposal: ProposalData;
  updateProposal: (updates: Partial<ProposalData>) => void;
  pages: PageData[];
  services: ServiceWithTiersWithInclusionsWithObligationsWithDisclaimers[];
  serviceMap: Record<
    string,
    ServiceWithTiersWithInclusionsWithObligationsWithDisclaimers
  >;

  currentPage: number;
  setCurrentPage: (i: number) => void;

  /** Terms and confirmation wording, authored in Agreement Settings. */
  agreement: AgreementCopy;

  /** Wording overrides for the structural pages, keyed by slug (cover, summary, …). */
  pageCopy: Record<string, CopyOverrides>;

  selections: Selection[];
  isSelected: (serviceId: string) => boolean;
  selectedTierId: (serviceId: string) => string | null;
  toggleService: (serviceId: string) => void;
  selectTier: (serviceId: string, tierId: string) => void;
  deselectService: (serviceId: string) => void;

  /** Whether discounted prices apply right now. Full price otherwise. */
  discountLive: boolean;

  /**
   * The basket added up, in both cadences and with single payments kept
   * apart. Worked out by `src/lib/selection-pricing` so the price bar, the
   * basket, the summary slide and the signing card cannot disagree.
   */
  totals: SelectionTotals;
  selectedCount: number;
  paymentCaptured: boolean;
}

const ProposalContext = createContext<ProposalContextValue | null>(null);

export function useProposal() {
  const ctx = useContext(ProposalContext);
  if (!ctx) throw new Error("useProposal must be used inside ProposalProvider");
  return ctx;
}

/* ------------------------------------------------------------------ */
/*  Provider                                                          */
/* ------------------------------------------------------------------ */

interface ProviderProps {
  proposal: ProposalData;
  agreement?: AgreementCopy;
  pages: PageData[];
  services: ServiceWithTiersWithInclusionsWithObligationsWithDisclaimers[];
  initialSelections?: Selection[];
  paymentCaptured?: boolean;
  /** Per-proposal discounts by service id, set in the dashboard's Presentation section. */
  discountOverrides?: Record<string, number>;
  /**
   * Services given away on this proposal, set in the same place. Nothing to
   * do with the discount: these are free whether or not the offer is running.
   */
  complimentaryServiceIds?: string[];
  /**
   * Wording overrides for the structural pages, keyed by slug. Separate from
   * `pages` because some of those pages (payment, onboarding) aren't in the
   * slide deck at every stage but their wording is still needed.
   */
  pageCopy?: Record<string, CopyOverrides>;
  children: ReactNode;
}

const NO_OVERRIDES: Record<string, number> = {};
const NO_COMPLIMENTARY: string[] = [];
const NO_PAGE_COPY: Record<string, CopyOverrides> = {};

export function ProposalProvider({
  proposal: initialProposal,
  agreement,
  pages,
  services: rawServices,
  initialSelections,
  children,
  paymentCaptured = false,
  discountOverrides = NO_OVERRIDES,
  complimentaryServiceIds = NO_COMPLIMENTARY,
  pageCopy = NO_PAGE_COPY,
}: ProviderProps) {
  const [proposal, setProposal] = useState<ProposalData>(initialProposal);

  // Full price unless the timer is running. Once signed, the price is fixed
  // by whether the discount was running when they signed.
  const timerLive = useDiscountTimerLive(
    proposal.discountTimerActive,
    proposal.discountExpiresAt,
    proposal.discountStartsAt,
  );
  const discountLive = proposal.signedAt
    ? isDiscountLive({
        active: proposal.discountTimerActive,
        startsAt: proposal.discountStartsAt,
        expiresAt: proposal.discountExpiresAt,
        at: new Date(proposal.signedAt).getTime(),
        graceMs: DISCOUNT_GRACE_MS,
      })
    : timerLive;

  // Priced first, then anything given away is overwritten outright. The
  // order matters: a gift is not a discounted price, it is no price at all.
  const services = useMemo(
    () =>
      applyComplimentary(
        priceServices(rawServices, discountOverrides, discountLive),
        complimentaryServiceIds,
      ),
    [rawServices, discountOverrides, discountLive, complimentaryServiceIds],
  );

  const updateProposal = useCallback((updates: Partial<ProposalData>) => {
    setProposal((prev) => ({ ...prev, ...updates }));
  }, []);

  const filteredPages = useMemo(() => {
    return pages.filter((p) => {
      if (p.slug !== "payment") return true;
      if (paymentCaptured) return false; // already paid
      if (proposal.status !== "signed") return false; // must sign first
      return true;
    });
  }, [pages, paymentCaptured, proposal.status]);

  /**
   * Opens where the client left off, not back at the cover.
   *
   * `lastPage` is recorded in this same index space by `api/portal/viewed`,
   * so it can be used as-is. It moves in both directions, so a client who
   * pages back to the pricing and closes the tab returns to the pricing. It is clamped because the
   * deck can change between visits — a page switched off, or the payment slide
   * appearing once they sign — and a stale index must never strand anyone on a
   * slide that no longer exists.
   *
   * A client who has never opened it, or who stopped on the cover, starts at
   * the cover, which is the same as before.
   */
  const [currentPage, setCurrentPage] = useState(() => {
    // Where they actually left, falling back to how far they got for anyone
    // whose last visit predates `last_page` being recorded.
    const saved = proposal.lastPage ?? proposal.furthestPage;
    if (saved == null || saved <= 0) return 0;
    return Math.min(saved, filteredPages.length - 1);
  });
  const [selections, setSelections] = useState<Selection[]>(
    initialSelections ?? [],
  );

  const serviceMap = useMemo(
    () => Object.fromEntries(services.map((s) => [s.id, s])),
    [services],
  );

  const isSelected = useCallback(
    (serviceId: string) => selections.some((s) => s.serviceId === serviceId),
    [selections],
  );

  const selectedTierId = useCallback(
    (serviceId: string) =>
      selections.find((s) => s.serviceId === serviceId)?.tierId ?? null,
    [selections],
  );

  const toggleService = useCallback(
    (serviceId: string) => {
      setSelections((prev) => {
        const exists = prev.find((s) => s.serviceId === serviceId);
        if (exists) {
          const next = prev.filter((s) => s.serviceId !== serviceId);
          // If we just removed a service, auto-remove any requiresOtherService items
          // that no longer have a non-requires companion
          const hasNonRequires = next.some((sel) => {
            const svc = serviceMap[sel.serviceId];
            return svc && !svc.requires_other_service;
          });
          if (!hasNonRequires) {
            return next.filter((sel) => {
              const svc = serviceMap[sel.serviceId];
              return svc && !svc.requires_other_service;
            });
          }
          return next;
        }
        return [...prev, { serviceId, tierId: null }];
      });
    },
    [serviceMap],
  );

  const selectTier = useCallback((serviceId: string, tierId: string) => {
    setSelections((prev) => {
      const exists = prev.find((s) => s.serviceId === serviceId);
      if (exists) {
        return prev.map((s) =>
          s.serviceId === serviceId ? { ...s, tierId } : s,
        );
      }
      return [...prev, { serviceId, tierId }];
    });
  }, []);

  const deselectService = useCallback(
    (serviceId: string) => {
      setSelections((prev) => {
        const next = prev.filter((s) => s.serviceId !== serviceId);
        const hasNonRequires = next.some((sel) => {
          const svc = serviceMap[sel.serviceId];
          return svc && !svc.requires_other_service;
        });
        if (!hasNonRequires) {
          return next.filter((sel) => {
            const svc = serviceMap[sel.serviceId];
            return svc && !svc.requires_other_service;
          });
        }
        return next;
      });
    },
    [serviceMap],
  );

  // Computed totals. The lines are built once and summed once, from the same
  // module every other screen uses.
  const { totals, selectedCount } = useMemo(() => {
    const lines = buildSelectionLines(selections, serviceMap);
    return { totals: totalSelection(lines), selectedCount: lines.length };
  }, [selections, serviceMap]);

  const value: ProposalContextValue = {
    proposal,
    updateProposal,
    pages: filteredPages,
    services,
    serviceMap,
    currentPage,
    setCurrentPage,
    selections,
    agreement: agreement ?? { termsClauses: [], postSignatureText: "" },
    pageCopy,
    discountLive,
    isSelected,
    selectedTierId,
    toggleService,
    selectTier,
    deselectService,
    totals,
    selectedCount,
    paymentCaptured,
  };

  return (
    <ProposalContext.Provider value={value}>
      {children}
    </ProposalContext.Provider>
  );
}

/**
 * Editable wording for a part of the portal.
 *
 * - `global`: workspace-wide wording (Settings).
 * - `service` / `results`: pass the page, since each page has its own wording.
 * - `cover`, `summary`, `signature`, `payment`, `intake`: found by slug, so
 *   the page argument is optional.
 *
 * Returns `t(key, vars?)`, which falls back to the registered default. Works
 * outside a provider too, returning defaults.
 */
export function useCopy(
  kind: CopyKind,
  page?: { copy?: CopyOverrides } | null,
) {
  const ctx = useContext(ProposalContext);
  const overrides =
    kind === "global"
      ? ctx?.agreement.portalCopy
      : page
        ? page.copy
        : ctx?.pageCopy[kind];

  return useCallback(
    (key: string, vars?: Record<string, string | number>) =>
      resolveCopy(kind, key, overrides, vars),
    [kind, overrides],
  );
}
