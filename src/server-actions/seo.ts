"use server";

import { saveSeoEntry } from "@/data/seo";
import { revalidatePath } from "next/cache";
import { seoPages } from "@/config/seo-pages";

export interface UpsertSeoPayload {
  slug: string;
  metaTitle: string;
  metaDescription: string;
  keywords?: string;
}

export async function upsertSeoEntryAction(payload: UpsertSeoPayload) {
  const result = await saveSeoEntry(
    payload.slug,
    payload.metaTitle,
    payload.metaDescription,
    payload.keywords
  );

  if (result.success) {
    // Revalidate the affected page
    const pageConfig = seoPages.find((p) => p.slug === payload.slug);

    if (pageConfig?.path) {
      revalidatePath(pageConfig.path);
    }

    // Also revalidate the admin SEO page
    revalidatePath("/admin/seo");
  }

  return result;
}



