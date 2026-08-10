"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";

/* ------------------------------------------------------------------ */
/*  Types coming from the server component                            */
/* ------------------------------------------------------------------ */

export interface ServiceTier {
  id: string;
  slug: string;
  name: string;
  targetPriceCents: number;
  sequence: number;
  billingCycleMonths: number;
}

export interface ServiceInclusion {
  id: string;
  text: string;
  sequence: number | null;
}

export interface ServiceObligation {
  id: string;
  text: string;
  sequence: number | null;
}

export interface ServiceDisclaimer {
  id: string;
  text: string;
  sequence: number | null;
}

export interface Service {
  id: string;
  slug: string;
  name: string;
  billing: "one_off" | "recurring_monthly" | "in_kind";
  term: string | null;
  targetPriceCents: number;
  discountPct: number | null;
  discountWindowHours: number | null;
  priceDisplayPeriod: string | null;
  requiresOtherService: boolean;
  sequence: number;
  tiers: ServiceTier[];
  inclusions: ServiceInclusion[];
  clientObligations: ServiceObligation[];
  disclaimers: ServiceDisclaimer[];
  billingCycleMonths: number;
}

export interface ContentBlock {
  id: string;
  type: "heading" | "paragraph" | "image" | "list" | "custom" | null;
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
  contentBlocks: ContentBlock[];
}

export interface ProposalData {
  id: string;
  token: string;
  status: string | null;
  discountExpiresAt: string | null;
  clientName: string;
  venueName: string;
}

/* ------------------------------------------------------------------ */
/*  Selection state                                                   */
/* ------------------------------------------------------------------ */

export interface Selection {
  serviceId: string;
  tierId: string | null; // null = non-tiered, selected at service level
}

interface ProposalContextValue {
  proposal: ProposalData;
  updateProposal: (updates: Partial<ProposalData>) => void;
  pages: PageData[];
  services: Service[];
  serviceMap: Record<string, Service>;

  currentPage: number;
  setCurrentPage: (i: number) => void;

  selections: Selection[];
  isSelected: (serviceId: string) => boolean;
  selectedTierId: (serviceId: string) => string | null;
  toggleService: (serviceId: string) => void;
  selectTier: (serviceId: string, tierId: string) => void;
  deselectService: (serviceId: string) => void;

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
  if (service.priceDisplayPeriod === "week") {
    return Math.round((tierTarget * 52) / 12);
  }
  return tierTarget;
}

/* ------------------------------------------------------------------ */
/*  Provider                                                          */
/* ------------------------------------------------------------------ */

interface ProviderProps {
  proposal: ProposalData;
  pages: PageData[];
  services: Service[];
  initialSelections?: Selection[];
  paymentCaptured?: boolean;
  children: ReactNode;
}

export function ProposalProvider({
  proposal: initialProposal,
  pages,
  services,
  initialSelections,
  children,
  paymentCaptured = false,
}: ProviderProps) {
  const [proposal, setProposal] = useState<ProposalData>(initialProposal);

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
            return svc && !svc.requiresOtherService;
          });
          if (!hasNonRequires) {
            return next.filter((sel) => {
              const svc = serviceMap[sel.serviceId];
              return svc && !svc.requiresOtherService;
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
          return svc && !svc.requiresOtherService;
        });
        if (!hasNonRequires) {
          return next.filter((sel) => {
            const svc = serviceMap[sel.serviceId];
            return svc && !svc.requiresOtherService;
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
        const tier = svc.tiers.find((t) => t.id === sel.tierId);
        target = tier ? tier.targetPriceCents : svc.targetPriceCents;
      } else {
        target = svc.targetPriceCents;
      }

      const monthlyT = monthlyTarget(svc, target);
      const list = listFromTarget(monthlyT, svc.discountPct);

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
