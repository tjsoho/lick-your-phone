/**
 * Navigation types + defaults.
 *
 * Lives outside the "use server" actions file because Next forbids
 * non-async-function exports from server-action modules. Both server and
 * client code import from here.
 */

export type NavLink = {
    /** Stable id used as the dnd-kit sortable key and to track items across drags. */
    id: number;
    /** Display text shown in the header. */
    label: string;
    /** Path the link points to (e.g. "/about", "/corporate-yoga", "/"). */
    pageSlug: string;
    /** Up to one level of children — renders as a hover dropdown. */
    children: NavLink[];
};

export type NavigationContent = {
    kind: "navigation";
    items: NavLink[];
};

export type AvailablePage = {
    path: string;
    label: string;
    group: "Core" | "Service" | "Legal";
};

/**
 * Default nav used as a fallback when no DB row exists yet.
 * Placeholder links (pageSlug "#") demonstrate the top-level + dropdown
 * structure without 404ing — point them at real pages as you build them.
 */
export const defaultNavLinks: NavLink[] = [
    { id: 1, label: "Home", pageSlug: "/", children: [] },
    {
        id: 2,
        label: "Pages",
        pageSlug: "#",
        children: [
            { id: 21, label: "Page One", pageSlug: "#", children: [] },
            { id: 22, label: "Page Two", pageSlug: "#", children: [] },
            { id: 23, label: "Page Three", pageSlug: "#", children: [] },
        ],
    },
    { id: 3, label: "Contact", pageSlug: "#", children: [] },
];

/**
 * Static (folder-route) pages — the routes that always exist as folder
 * routes under src/app/, with admin-friendly labels. Only Home ships in
 * the template; add an entry here whenever you add a new folder route.
 */
export const STATIC_PAGES: AvailablePage[] = [
    { path: "/", label: "Home", group: "Core" },
];
