import { createClient } from "@/utils/server";

export interface SeoMetadataRecord {
  id: string;
  slug: string;
  meta_title: string;
  meta_description: string | null;
  keywords: string | null;
  created_at: string;
  updated_at: string;
}

export async function fetchSeoEntries(): Promise<SeoMetadataRecord[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("seo_metadata")
      .select("*")
      .order("slug");

    if (error) {
      // Gracefully handle if table doesn't exist yet
      if (error.code === "42P01") {
        console.warn("seo_metadata table does not exist yet");
        return [];
      }
      console.error("Failed to fetch SEO entries", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Failed to fetch SEO entries", error);
    return [];
  }
}

export async function fetchSeoEntry(
  slug: string
): Promise<SeoMetadataRecord | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("seo_metadata")
      .select("*")
      .eq("slug", slug)
      .single();

    if (error) {
      // Gracefully handle if table doesn't exist yet
      if (error.code === "42P01") {
        return null;
      }
      // Not found is okay - return null
      if (error.code === "PGRST116") {
        return null;
      }
      console.error(`Failed to fetch SEO entry for ${slug}:`, error);
      return null;
    }

    return data;
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : typeof error === "object" && error !== null && "message" in error
          ? String((error as { message: unknown }).message)
          : String(error);
    console.error(`Failed to fetch SEO entry for ${slug}:`, message, error);
    return null;
  }
}

export async function saveSeoEntry(
  slug: string,
  metaTitle: string,
  metaDescription: string,
  keywords?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("seo_metadata").upsert(
      {
        slug,
        meta_title: metaTitle,
        meta_description: metaDescription,
        keywords: keywords || null,
      },
      {
        onConflict: "slug",
      }
    );

    if (error) {
      console.error("Failed to save SEO entry:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error("Failed to save SEO entry:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}



