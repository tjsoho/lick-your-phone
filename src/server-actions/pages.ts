"use server";

import { createClient } from "@/utils/server";
import { revalidatePath } from "next/cache";
import type { CopyOverrides } from "@/lib/portal-copy";

export async function togglePageVisibility(id: string, visible: boolean) {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("pages")
      .update({ visible })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    revalidatePath("/admin/pages");
    return { data, error: null };
  } catch (error) {
    return { data: null, error: (error as Error).message };
  }
}

/**
 * Persist a new page order.
 *
 * Takes the full list of page ids in their intended order and writes
 * sequence 0..n-1. The portal renders dynamically and already sorts by
 * sequence, so the new order shows up there on the next request.
 */
export async function reorderPages(orderedIds: string[]) {
  try {
    if (orderedIds.length === 0) return { error: null };

    const supabase = await createClient();

    const results = await Promise.all(
      orderedIds.map((id, index) =>
        supabase.from("pages").update({ sequence: index }).eq("id", id),
      ),
    );

    const failed = results.find((r) => r.error);
    if (failed?.error) throw failed.error;

    revalidatePath("/admin/pages");
    return { error: null };
  } catch (error) {
    return { error: (error as Error).message };
  }
}

export async function createPage(fields: {
  title: string;
  slug: string;
  type: string;
  sequence: number;
}) {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("pages")
      .insert({
        title: fields.title,
        slug: fields.slug,
        type: fields.type,
        sequence: fields.sequence,
        visible: true,
      })
      .select("id, slug, title, type, sequence, visible")
      .single();

    if (error) throw error;
    revalidatePath("/admin/pages");
    return { data, error: null };
  } catch (error) {
    return { data: null, error: (error as Error).message };
  }
}

/**
 * Partial update. Only the keys actually passed are written.
 *
 * This used to spread `featured_image: fields.featured_image ?? null`, so any
 * caller that edited just the title — the inline row editor on the pages list
 * did exactly that — silently wiped the page's featured image and reset its
 * image position.
 */
export async function updatePage(
  id: string,
  fields: {
    title?: string;
    slug?: string;
    type?: string;
    sequence?: number;
    featured_image?: string | null;
    image_position?: string;
  },
) {
  try {
    const supabase = await createClient();

    const patch: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (fields.title !== undefined) patch.title = fields.title;
    if (fields.slug !== undefined) patch.slug = fields.slug;
    if (fields.type !== undefined) patch.type = fields.type;
    if (fields.sequence !== undefined) patch.sequence = fields.sequence;
    if (fields.featured_image !== undefined)
      patch.featured_image = fields.featured_image;
    if (fields.image_position !== undefined)
      patch.image_position = fields.image_position;

    const { data, error } = await supabase
      .from("pages")
      .update(patch)
      .eq("id", id)
      .select("id, slug, title, type, sequence, visible, featured_image, image_position")
      .single();

    if (error) throw error;
    revalidatePath("/admin/pages");
    return { data, error: null };
  } catch (error) {
    return { data: null, error: (error as Error).message };
  }
}

export async function getPageWithBlocks(id: string) {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("pages")
      .select(
        `id, slug, title, type, sequence, visible, service_id, featured_image, image_position, copy,
         content_blocks ( id, type, content, sequence )`
      )
      .eq("id", id)
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error: (error as Error).message };
  }
}

export async function upsertContentBlock(
  block: {
    id?: string;
    page_id: string;
    type: string;
    content: unknown;
    sequence: number;
  },
) {
  try {
    const supabase = await createClient();
    const now = new Date().toISOString();

    if (block.id) {
      // update
      const { data, error } = await supabase
        .from("content_blocks")
        .update({
          type: block.type,
          content: block.content,
          sequence: block.sequence,
          updated_at: now,
        })
        .eq("id", block.id)
        .select("id, type, content, sequence")
        .single();
      if (error) throw error;
      revalidatePath(`/admin/pages/${block.page_id}`);
      return { data, error: null };
    } else {
      // insert
      const { data, error } = await supabase
        .from("content_blocks")
        .insert({
          page_id: block.page_id,
          type: block.type,
          content: block.content,
          sequence: block.sequence,
        })
        .select("id, type, content, sequence")
        .single();
      if (error) throw error;
      revalidatePath(`/admin/pages/${block.page_id}`);
      return { data, error: null };
    }
  } catch (error) {
    return { data: null, error: (error as Error).message };
  }
}

export async function deleteContentBlock(id: string, pageId: string) {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("content_blocks")
      .delete()
      .eq("id", id);
    if (error) throw error;
    revalidatePath(`/admin/pages/${pageId}`);
    return { error: null };
  } catch (error) {
    return { error: (error as Error).message };
  }
}

export async function updatePageImage(
  id: string,
  fields: { featured_image: string | null; image_position: string },
) {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("pages")
      .update({
        featured_image: fields.featured_image,
        image_position: fields.image_position,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("id, featured_image, image_position")
      .single();

    if (error) throw error;
    revalidatePath(`/admin/pages/${id}`);
    return { data, error: null };
  } catch (error) {
    return { data: null, error: (error as Error).message };
  }
}

/**
 * Replace a page's wording overrides.
 *
 * Blank values are dropped rather than stored, so clearing a field falls back
 * to the default instead of rendering nothing.
 */
export async function updatePageCopy(pageId: string, copy: CopyOverrides) {
  try {
    const cleaned = Object.fromEntries(
      Object.entries(copy).filter(
        ([, value]) => typeof value === "string" && value.trim() !== "",
      ),
    );

    const supabase = await createClient();
    const { error } = await supabase
      .from("pages")
      .update({ copy: cleaned, updated_at: new Date().toISOString() })
      .eq("id", pageId);

    if (error) throw error;
    revalidatePath(`/admin/pages/${pageId}`);
    return { error: null };
  } catch (error) {
    return { error: (error as Error).message };
  }
}

/**
 * Pages the portal addresses by slug. Removing one leaves the presentation
 * without a cover, summary, signing step or payment step, so they are locked.
 */
const STRUCTURAL_SLUGS = [
  "cover",
  "summary",
  "signature",
  "payment",
  "intake",
];

export async function deletePage(id: string) {
  try {
    const supabase = await createClient();

    const { data: page, error: readError } = await supabase
      .from("pages")
      .select("id, slug, title")
      .eq("id", id)
      .single();

    if (readError) throw readError;
    if (!page) return { error: "Page not found" };

    if (page.slug && STRUCTURAL_SLUGS.includes(page.slug)) {
      return {
        error: `"${page.title ?? page.slug}" is part of the proposal flow and can't be deleted. Hide it instead.`,
      };
    }

    // content_blocks.page_id has no cascade, so clear the children first.
    const { error: blocksError } = await supabase
      .from("content_blocks")
      .delete()
      .eq("page_id", id);

    if (blocksError) throw blocksError;

    const { error } = await supabase.from("pages").delete().eq("id", id);
    if (error) throw error;

    revalidatePath("/admin/pages");
    return { error: null };
  } catch (error) {
    return { error: (error as Error).message };
  }
}
