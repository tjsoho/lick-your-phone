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
import {
  DISCOUNT_GRACE_MS,
  isDiscountLive,
  priceServices,
} from "@/lib/pricing";

/* ------------------------------------------------------------------ */
/*  Types coming from the server component                            */
/* ------------------------------------------------------------------ */

export interface ContentBlock {
  id: string;
  type:
    | "heading"
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
  venueName: string;
}

/* ------------------------------------------------------------------ */
/*  Selection state                                                   */
/* ------------------------------------------------------------------ */

/** Workspace-wide agreement copy, shared by every proposal. */
export interface AgreementCopy {
  termsClauses: string[];
  postSignatureText: string;
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

  totalListCents: number;
  totalTargetCents: number;
  totalDiscountCents: number;
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
/*  Price helpers                                                     */
/* ------------------------------------------------------------------ */

function listFromTarget(
  targetCents: number,
  discountPct: number | null,
): number {
  if (discountPct == null || discountPct === 0) return targetCents;
  return Math.round(targetCents / (1 - discountPct));
}

/** Monthly-equivalent cents for totalling */
function monthlyTarget(service: Service, tierTarget: number): number {
  if (service.price_display_period === "week") {
    return Math.round((tierTarget * 52) / 12);
  }
  return tierTarget;
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
   * Wording overrides for the structural pages, keyed by slug. Separate from
   * `pages` because some of those pages (payment, onboarding) aren't in the
   * slide deck at every stage but their wording is still needed.
   */
  pageCopy?: Record<string, CopyOverrides>;
  children: ReactNode;
}

const NO_OVERRIDES: Record<string, number> = {};
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
  pageCopy = NO_PAGE_COPY,
}: ProviderProps) {
  const [proposal, setProposal] = useState<ProposalData>(initialProposal);

  // Full price unless the timer is running. Once signed, the price is fixed
  // by whether the discount was running when they signed.
  const timerLive = useDiscountTimerLive(
    proposal.discountTimerActive,
    proposal.discountExpiresAt,
  );
  const discountLive = proposal.signedAt
    ? isDiscountLive({
        active: proposal.discountTimerActive,
        expiresAt: proposal.discountExpiresAt,
        at: new Date(proposal.signedAt).getTime() - DISCOUNT_GRACE_MS,
      })
    : timerLive;

  const services = useMemo(
    () => priceServices(rawServices, discountOverrides, discountLive),
    [rawServices, discountOverrides, discountLive],
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

  const [currentPage, setCurrentPage] = useState(0);
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

  // Computed totals
  const {
    totalListCents,
    totalTargetCents,
    totalDiscountCents,
    selectedCount,
  } = useMemo(() => {
    let listTotal = 0;
    let targetTotal = 0;
    let count = 0;

    for (const sel of selections) {
      const svc = serviceMap[sel.serviceId];
      if (!svc) continue;

      if (svc.billing === "in_kind") {
        count++;
        continue;
      }

      let target: number;
      if (sel.tierId) {
        const tier = svc.service_tiers.find((t) => t.id === sel.tierId);
        target = tier ? tier.target_price_cents : svc.target_price_cents;
      } else {
        target = svc.target_price_cents;
      }

      const monthlyT = monthlyTarget(svc, target);
      const list = listFromTarget(monthlyT, svc.discount_pct);

      targetTotal += monthlyT;
      listTotal += list;
      count++;
    }

    return {
      totalListCents: listTotal,
      totalTargetCents: targetTotal,
      totalDiscountCents: listTotal - targetTotal,
      selectedCount: count,
    };
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
    totalListCents,
    totalTargetCents,
    totalDiscountCents,
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
