"use server";

import { createClient } from "@/utils/server";
import { revalidatePath } from "next/cache";

export type PresentationPage = {
  pageId: string;
  title: string | null;
  slug: string | null;
  type: string | null;
  sequence: number;
  serviceId: string | null;
  serviceName: string | null;
  /** Global settings from Content Pages / Services. */
  globalVisible: boolean;
  globalDiscountPct: number | null;
  /** Per-proposal overrides. null means "follow the global setting". */
  overrideVisible: boolean | null;
  overrideDiscountPct: number | null;
};

type PageRow = {
  id: string;
  title: string | null;
  slug: string | null;
  type: string | null;
  sequence: number;
  visible: boolean | null;
  service_id: string | null;
};

type OverrideRow = {
  page_id: string;
  visible: boolean | null;
  discount_pct: number | null;
};

type ServiceRow = {
  id: string;
  name: string | null;
  discount_pct: number | null;
};

/**
 * Every page in the deck, with the global setting and this proposal's
 * override side by side so the editor can show what is inherited and what
 * has been tailored.
 */
export async function getProposalPresentation(proposalId: string) {
  try {
    const supabase = await createClient();

    const [pagesRes, overridesRes, servicesRes] = await Promise.all([
      supabase
        .from("pages")
        .select("id, title, slug, type, sequence, visible, service_id")
        .order("sequence", { ascending: true }),
      supabase
        .from("proposal_page_settings")
        .select("page_id, visible, discount_pct")
        .eq("proposal_id", proposalId),
      supabase.from("services").select("id, name, discount_pct"),
    ]);

    if (pagesRes.error) throw pagesRes.error;
    if (overridesRes.error) throw overridesRes.error;
    if (servicesRes.error) throw servicesRes.error;

    const overrides = new Map(
      ((overridesRes.data ?? []) as OverrideRow[]).map((o) => [o.page_id, o]),
    );
    const services = new Map(
      ((servicesRes.data ?? []) as ServiceRow[]).map((s) => [s.id, s]),
    );

    const data: PresentationPage[] = ((pagesRes.data ?? []) as PageRow[]).map(
      (page) => {
        const override = overrides.get(page.id);
        const service = page.service_id
          ? services.get(page.service_id)
          : undefined;

        return {
          pageId: page.id,
          title: page.title,
          slug: page.slug,
          type: page.type,
          sequence: page.sequence,
          serviceId: page.service_id,
          serviceName: service?.name ?? null,
          globalVisible: page.visible ?? true,
          globalDiscountPct: service?.discount_pct ?? null,
          overrideVisible: override?.visible ?? null,
          overrideDiscountPct: override?.discount_pct ?? null,
        };
      },
    );

    return { data, error: null };
  } catch (error) {
    return { data: null, error: (error as Error).message };
  }
}

/**
 * Writes one page's override for one proposal.
 *
 * Passing null for a field clears that override so the page follows the
 * global setting again; when both end up null the row is removed entirely,
 * which keeps "no rows" meaning "identical to the standard deck".
 */
export async function setProposalPageOverride(
  proposalId: string,
  pageId: string,
  patch: { visible?: boolean | null; discountPct?: number | null },
) {
  try {
    const supabase = await createClient();

    const { data: existing, error: readError } = await supabase
      .from("proposal_page_settings")
      .select("id, visible, discount_pct")
      .eq("proposal_id", proposalId)
      .eq("page_id", pageId)
      .maybeSingle();

    if (readError) throw readError;

    const nextVisible =
      patch.visible !== undefined ? patch.visible : (existing?.visible ?? null);
    const nextDiscount =
      patch.discountPct !== undefined
        ? patch.discountPct
        : (existing?.discount_pct ?? null);

    if (nextVisible === null && nextDiscount === null) {
      if (existing) {
        const { error } = await supabase
          .from("proposal_page_settings")
          .delete()
          .eq("id", existing.id);
        if (error) throw error;
      }
      revalidatePath(`/admin/proposals/${proposalId}`);
      return { error: null };
    }

    if (existing) {
      const { error } = await supabase
        .from("proposal_page_settings")
        .update({
          visible: nextVisible,
          discount_pct: nextDiscount,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from("proposal_page_settings").insert({
        proposal_id: proposalId,
        page_id: pageId,
        visible: nextVisible,
        discount_pct: nextDiscount,
      });
      if (error) throw error;
    }

    revalidatePath(`/admin/proposals/${proposalId}`);
    return { error: null };
  } catch (error) {
    return { error: (error as Error).message };
  }
}

/** Drops every override so the proposal renders the standard deck again. */
export async function resetProposalPresentation(proposalId: string) {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("proposal_page_settings")
      .delete()
      .eq("proposal_id", proposalId);
    if (error) throw error;

    revalidatePath(`/admin/proposals/${proposalId}`);
    return { error: null };
  } catch (error) {
    return { error: (error as Error).message };
  }
}
