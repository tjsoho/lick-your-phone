"use server";

import { createClient } from "@/utils/server";
import { revalidatePath } from "next/cache";
import {
    AvailablePage,
    NavLink,
    NavigationContent,
    STATIC_PAGES,
    defaultNavLinks,
} from "@/data/navigation";

/* ──────────────────────────────────────────────────────────────────────────
   Header navigation — admin-managed menu structure.

   Stored as a single row in the `pages` table with slug `__navigation` and
   content shape `{ kind: "navigation", items: NavLink[] }`. Using the same
   table keeps the persistence layer consistent (no new tables / migrations)
   and lets us reuse the existing cookies-aware Supabase client for RLS.

   Supports one level of nesting: a top-level link's `children[]` renders as
   a hover dropdown in the header. Grandchildren are intentionally not
   rendered — keeps the admin tree simple and matches the design system.

   This file is "use server" — Next forbids non-async-function exports here,
   so types and the default tree live in @/data/navigation.
   ────────────────────────────────────────────────────────────────────────── */

const NAV_SLUG = "__navigation";

/**
 * Load the current header navigation. Returns the default tree if the
 * `__navigation` row doesn't exist yet — so a fresh install renders
 * a sensible menu before an admin saves anything.
 */
export async function getNavigation(): Promise<NavLink[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("pages")
        .select("content")
        .eq("slug", NAV_SLUG)
        .maybeSingle();

    if (error) {
        console.error("getNavigation error:", error);
        return defaultNavLinks;
    }
    const content = data?.content as NavigationContent | undefined;
    if (!content || content.kind !== "navigation" || !Array.isArray(content.items)) {
        return defaultNavLinks;
    }
    return content.items;
}

/**
 * Save the header navigation. Upserts the `__navigation` row in the pages
 * table. Called from an admin button click — server-action context, so
 * revalidatePath() is safe here.
 */
export async function saveNavigation(items: NavLink[]): Promise<{ ok: boolean; error?: string }> {
    const supabase = await createClient();

    // Recursively sanitise — trim label/pageSlug, keep arbitrary nesting depth
    // so admins can build mega-menus (Services → "Movement Services" section
    // → Corporate Yoga, HIIT, …).
    const sanitise = (item: NavLink): NavLink => ({
        id: item.id,
        label: (item.label || "").trim(),
        pageSlug: (item.pageSlug || "").trim(),
        children: (item.children || []).map(sanitise),
    });
    const sanitised: NavLink[] = items.map(sanitise);

    const content: NavigationContent = {
        kind: "navigation",
        items: sanitised,
    };

    const { data: existing } = await supabase
        .from("pages")
        .select("slug")
        .eq("slug", NAV_SLUG)
        .maybeSingle();

    if (existing) {
        const { error } = await supabase
            .from("pages")
            .update({ content })
            .eq("slug", NAV_SLUG);
        if (error) return { ok: false, error: error.message };
    } else {
        const { error } = await supabase.from("pages").insert({
            slug: NAV_SLUG,
            title: "Header Navigation",
            description: "Admin-managed header menu structure",
            content,
        });
        if (error) return { ok: false, error: error.message };
    }

    revalidatePath("/", "layout"); // refresh the header everywhere
    revalidatePath("/admin/navigation");
    return { ok: true };
}

/**
 * Enumerate every page the admin can link to from the menu. Returns the
 * static folder routes. The template ships with just Home — extend
 * STATIC_PAGES in @/data/navigation as you add new pages.
 */
export async function getAvailablePages(): Promise<AvailablePage[]> {
    return [...STATIC_PAGES];
}
