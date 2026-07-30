# Admin System — Design, UX & Implementation Handoff

A self-contained spec for rebuilding the admin dashboard and per-page editors of this project in another codebase. Hand this to an AI/dev and they should be able to recreate the system end-to-end: dashboard tile grid, sidebar layout with drag-reorder + per-section visibility, in-place SEO/URL editing, and the public-page render that consumes those flags.

Stack assumptions: **Next.js App Router 14/15, React 18+, TypeScript, Tailwind, Supabase (or any Postgres + JSON store), shadcn/ui primitives, @dnd-kit for drag-and-drop, framer-motion for transitions.** If you swap any of these, the architectural patterns translate but the snippets won't drop in verbatim.

---

## 0 · Mental model

There is **one admin page per editable site page**, plus a few "system" editors (navigation, footer, site logo). Each editor:

1. Reads a row from `pages` (slug, title, description, content JSONB)
2. Renders a **two-column shell**: sidebar (left, sticky) + content (right, scrolling)
3. Sidebar lists every section of the page as a vertical pill; admin can:
   - **Click** a pill → jumps to that section's form in the right pane
   - **Drag** the grip handle → reorders sections; order persists to `content.sectionsOrder` and the **public page renders sections in that order**
   - **Click the eye icon** → toggles `content.sectionNVisible`; hidden sections don't render publicly but stay editable
4. Below the sidebar: a **Page Meta panel** with URL (editable on dynamic routes, read-only on folder routes) + Meta Title + Meta Description
5. Top of the page: a **sticky save banner** (always visible while scrolling) with the page title, "View site / Dashboard" links, and the Save button

Public pages don't render sections in a hardcoded order — they iterate `content.sectionsOrder` and look up each section's component in a `Record<SectionKey, (content) => ReactNode>` map. Hidden sections are filtered out with `content.sectionNVisible !== false`.

This separation is the load-bearing pattern: **structure (order, visibility) lives in the same JSONB as content, the admin edits both, the public template reflects both.**

---

## 1 · Design tokens

Lock these into your Tailwind config / globals.css before building components.

### Colors

| Token | Hex | Use |
|---|---|---|
| `brand-green` | `#92d645` | Primary accent — CTAs, active pills, eyebrow text, hover tints |
| `brand-black` | `#121717` | Primary text, dark surfaces, hover-invert states |
| `brand-cream` | `#fafaf7` | Page background for admin shell, footer washes |
| `brand-green/15` | — | Hover/focus tint for dropdown items, sidebar hover |
| `brand-black/[0.04]` | — | Inactive pill background (subtle grey on sidebar items) |
| `brand-black/[0.06]` | — | Subtle dividers, secondary buttons, social icon chips |
| `brand-black/[0.10]` | — | Card borders, divider lines |
| `brand-black/55` | — | Tertiary text, eyebrow caps |
| `brand-black/65` | — | Body text on neutral backgrounds |

### Typography

- **Display + headings:** Poppins, `font-medium` default, `font-bold` as toggle
- **Body:** Inter, `font-medium`/`font-semibold` weights
- **Eyebrow caps:** `text-xs font-semibold uppercase tracking-[0.18em] text-brand-green` (use `tracking-[0.22em]` for sidebar/menu section labels)
- Headings: `h1` 32px mobile → 52px desktop; `h2` 24px → 40px desktop; both `font-medium` by default
- **Tight tracking on display:** `tracking-[-0.03em]` on large titles for designed feel

### Radius

| Token | Use |
|---|---|
| `rounded-full` | Pills (nav, CTAs, sidebar nav), close buttons |
| `rounded-2xl` (16px) | Card sections, frosted glass cards |
| `rounded-xl` (12px) | Field groups, content cards in admin |
| `rounded-lg` (8px) | Inputs, sidebar items, dropdown items |
| `rounded-[24px]` | Banner card on Section 7 CTA |

### Shadows

- Sidebar / cards: `shadow-sm`
- Dropdown panels: `shadow-2xl ring-1 ring-black/5` (the ring is critical for the floating panel feel)
- Active sidebar pill: `shadow-sm`
- CTA pills: `shadow-sm` baseline, `shadow-lg` for hero CTAs

### Motion

Use framer-motion. Standard variants:

```ts
// Card / row entrance
const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] } },
};

// Title blur-rise (display headings)
const titleVariants = {
    hidden: { opacity: 0, y: 30, filter: "blur(4px)" },
    show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] } },
};

// Stagger children
const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } },
};

// Slide-in panel (desktop bubble menu, dropdowns)
const panelEase = [0.22, 1, 0.36, 1]; // decisive entry, soft settle
```

---

## 2 · Data layer

### Table

A single `pages` table backs every page.

```sql
create table pages (
  id          uuid primary key default uuid_generate_v4(),
  slug        text unique not null,
  title       text not null,            -- SEO meta title
  description text,                     -- SEO meta description
  content     jsonb not null,           -- the page's content + section flags + sectionsOrder
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);
```

System rows that aren't actual pages use underscore-prefixed slugs reserved from URL collisions:
- `__navigation` — header menu structure
- `__footer`, `__site_logo` etc.

### Content shape (per page)

```ts
type PageContent = {
  // ── page-wide section ordering + visibility ──
  sectionsOrder: SectionKey[];        // non-hero only; hero is always first
  section2Visible: boolean;
  section3Visible: boolean;
  // …one boolean per section

  // ── hero (always visible, never reordered) ──
  heroImage: string;
  heroTitle: string;
  heroTitleBold: boolean;
  heroParagraph: string;
  heroParagraphBold: boolean;

  // ── per-section fields ──
  section2subtitle: string;
  section2title: string;
  section2titleBold: boolean;
  section2cards: BenefitCard[];
  // …repeats for each section
};
```

Always pair every text field with a `boldable` toggle (`fooBold: boolean`). For arrays use stable numeric `id` for React keys + dnd-kit.

### Visibility convention

`sectionNVisible !== false` (defaulting `undefined` to visible). Lets you add new sections without migrating old rows — they render visible by default.

### Order convention

Saved order may be missing newly-added sections. On read, **always** fill in missing entries from a canonical `DEFAULT_ORDER`:

```ts
function resolveOrder(saved: SectionKey[] | undefined, fallback: SectionKey[]): SectionKey[] {
  const known = new Set(saved || []);
  return [...(saved || []), ...fallback.filter(k => !known.has(k))];
}
```

---

## 3 · The admin shell

### Route structure

```
src/app/admin/
├── layout.tsx          ← optional auth wrapper
├── page.tsx            ← dashboard tile grid
├── home/page.tsx       ← loads "home" row → HomeAdminInputs
├── about-us/page.tsx
├── navigation/page.tsx ← header menu editor
├── [page-name]/page.tsx ← one per page
```

Each admin route is a **server component** that fetches the row, builds a fallback, and passes both to a client `*AdminInputs` component. `export const dynamic = "force-dynamic"` on each so they always re-fetch after save.

```tsx
// src/app/admin/<page>/page.tsx
export const dynamic = "force-dynamic";

export default async function PageAdminRoute() {
  const fallback: PageProps = {
    title: "Page Title", description: "…",
    slug: "home", content: pageFallbackContent(),
  };
  const page = await getPage<PageProps>("home", fallback);
  return <HomeAdminInputs {...page} />;
}
```

### AdminPageShell

The wrapping layout. Pass an optional `sidebar` element to switch from centered-narrow-form to two-column sticky-sidebar layout.

```tsx
export function AdminPageShell({
  children,
  sidebar,
}: { children: ReactNode; sidebar?: ReactNode }) {
  if (!sidebar) {
    // Legacy/simple form pages without a section structure
    return (
      <div className="bg-[#fafaf7] min-h-screen px-4 py-6 md:px-6 md:py-8">
        <div className="mx-auto max-w-3xl space-y-6">{children}</div>
      </div>
    );
  }
  return (
    <div className="bg-[#fafaf7] min-h-screen px-4 py-6 md:px-6 md:py-8">
      <div className="mx-auto max-w-6xl grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)] gap-6">
        <aside className="lg:sticky lg:top-6 lg:self-start lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto">
          {sidebar}
        </aside>
        <div className="space-y-6 min-w-0">{children}</div>
      </div>
    </div>
  );
}
```

### SaveBanner

Sticky at the top of every editor. Sits above the shell content (which has its own scroll).

```tsx
interface SaveBannerProps {
  pageTitle: string;
  onSave: () => void;
  isSaving?: boolean;
  saveStatus?: "idle" | "success" | "error";
}
```

Layout:
- Left: circular monogram chip + "Editing" eyebrow + page title
- Right: **Dashboard** button (→ `/admin`), **View site** button (target=_blank, → `/`), **Save changes** primary button
- Save button label cycles: `Save changes` → `Saving…` → `Saved` → `Save changes` (auto-reset after 2.5s)
- Save tone: brand-green for success/idle, red for error
- `sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b shadow-sm`

### Dashboard (`/admin`)

A grid of **grouped tiles**, each linking to a per-page editor. Three groups:
- **Page Content** — Home, About, Who We Help, Property Managers, Corporate Teams, Services, Service Pages, Contact, etc.
- **Articles & People** — Blog, FAQs, Team
- **Site Settings** — Header Navigation, Footer, Site Logo, SEO (optional)
- **Legal** — Privacy Policy, Terms & Conditions, Terms of Use

Each tile:
- `Link` wrapping a card: `rounded-2xl border border-black/10 bg-white p-5 hover:border-brand-green/40 hover:shadow-md transition`
- Icon (lucide-react) in brand-green tint
- Title (`font-semibold text-brand-black`)
- One-line description (`text-sm text-brand-black/60`)

Group header: `text-xs uppercase tracking-[0.18em] font-semibold text-brand-black/55` + 1-line subtitle below.

---

## 4 · Form primitives (the toolbox)

One shared file (e.g. `_shared/form-primitives.tsx`) exports every reusable primitive. Below is a complete inventory — every admin editor composes from these.

### `inputClass`

The canonical input style. Reuse across every text input/textarea/select trigger.

```ts
export const inputClass =
  "w-full rounded-lg border border-black/12 bg-white px-3 py-2 text-sm text-brand-black placeholder:text-brand-black/30 focus:outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/25 transition-colors";
```

### `FieldLabel`

Standalone uppercase label, optional right-side hint slot (used for character counters).

```
[ LABEL TEXT (11px uppercase, 60% black) ]   [ hint right-aligned ]
```

```tsx
<FieldLabel hint={<span>{value.length}/60</span>}>Meta Title</FieldLabel>
```

### `TextInput`

Standard text input. Wraps the `inputClass`. Props: `label`, `value`, `onChange(string)`, `placeholder`, `hint`, `name`, `id`.

### `TextAreaInput`

Same API but renders a `<textarea>` with `rows` prop, `resize-none`, `leading-relaxed`.

### `BoldableText`

A text input with a small "Bold" toggle pill inline next to the label. Used for every editable text field that has a sibling `xxxBold: boolean`.

API:
```tsx
<BoldableText
  id="hero-title"
  label="Title"
  as="textarea"     // or omit for single-line
  rows={2}
  value={value}
  onChange={setValue}
  bold={isBold}
  onBoldChange={setIsBold}
/>
```

Renders the input + a `BoldToggle` that flips a boolean. The toggle is a small pill with bold "B" icon; active state uses `bg-brand-black text-white`.

### `BoldToggle`

The inner toggle pill — standalone in case you want it elsewhere.

### `Toggle`

Generic iOS-style switch. Used by `IconField` and section visibility toggles inline.

```tsx
<Toggle id="show-icon" label="Show icon" checked={true} onChange={(v) => …} />
```

24px tall pill, brand-green when on, neutral grey when off.

### `SelectInput`

Native `<select>` styled with `inputClass`. Use for simple enum choices. For complex picker UIs (grouped lists, custom search), use shadcn `Select` directly.

### `FieldGroup`

A bordered container that groups related fields under a title. Optional description, optional right-side `toolbar` slot (for "Add item" buttons).

```tsx
<FieldGroup
  title="Hero Copy"
  description="Centered text overlaid on the hero image."
  toolbar={<AddItemButton onClick={…}>Add CTA</AddItemButton>}
>
  <TextInput … />
  <BoldableText … />
</FieldGroup>
```

Visual: `rounded-xl border border-black/10 bg-white p-5 space-y-4`. Title in `text-sm font-semibold`, description in `text-xs text-brand-black/55`.

### `ImageInput`

Image picker. Click → opens an image library modal (your existing flow) OR a file upload. Shows the current image as a thumbnail with click-to-replace. Variants: `aspect="auto"` (default 16:9 area), `aspect="square"` (~128px), `aspect="icon"` (~64px for icon swaps). Empty state is a clickable dashed-border box that says "Click to add image" — the **entire** box clickable, not just the icon.

### `IconField`

A `Toggle` (show icon yes/no) + a small `ImageInput` with `aspect="icon"`. Used for every "card with icon" pattern across the site. When the toggle is off, the icon doesn't render on the public site even if the URL is set.

```tsx
<IconField
  id="card-icon"
  value={card.icon}
  onChange={(v) => …}
  enabled={card.showIcon !== false}
  onEnabledChange={(v) => …}
/>
```

### `ListItemCard`

Container for one item in an array list (a card in a "Cards" FieldGroup). Shows a small title (`Card 1`, `FAQ 3`) and a top-right `Remove` button.

```tsx
<ListItemCard title={`Card ${i+1}`} onRemove={() => removeCard(card.id)}>
  <IconField … />
  <BoldableText label="Title" … />
  <BoldableText label="Description" as="textarea" rows={3} … />
</ListItemCard>
```

Visual: `rounded-lg border border-black/10 bg-brand-cream/30 p-4 space-y-3`.

### `AddItemButton`

Used in `FieldGroup` toolbar. Brand-green outline button with a `+` lucide icon.

```tsx
<AddItemButton onClick={() => setCards([...cards, { id: nextId(cards), … }])}>
  Add card
</AddItemButton>
```

### `nextId(items)`

Helper that returns `Math.max(0, ...items.map(i => i.id)) + 1`. Stable, monotonic; safe for dnd-kit keys even as you add/remove.

### `updateIn` / `removeIn`

Tiny array helpers used inline next to setState calls:

```tsx
function updateIn<T extends { id: number }>(
  items: T[], id: number, patch: Partial<T>, setter: (next: T[]) => void
) {
  setter(items.map(it => it.id === id ? { ...it, ...patch } : it));
}
function removeIn<T extends { id: number }>(
  items: T[], id: number, setter: (next: T[]) => void
) {
  setter(items.filter(it => it.id !== id));
}
```

These are 90% of how you'll mutate card/FAQ/paragraph arrays.

### `SubtleButton`

Inline secondary action (e.g. "Cancel"). Variants: `default` (grey), `danger` (red text only).

### `SectionTitleHeader`

The H2-style header at the top of each section's form. Supports inline rename — click the pencil → input appears → save/cancel. This lets admins rename "Section 4" to "What to Expect" in the sidebar without code changes.

```tsx
<SectionTitleHeader
  title={titles[key]}
  isEditing={editingKey === key}
  editValue={editingValue}
  onEdit={() => { setEditingKey(key); setEditingValue(titles[key]); }}
  onSave={() => { setTitles(t => ({ ...t, [key]: editingValue })); setEditingKey(null); }}
  onCancel={() => setEditingKey(null)}
  onEditValueChange={setEditingValue}
/>
```

### `TabPills`

Original horizontal tab navigation. Use this **only** for simple flat pages without reorderable sections. Otherwise use `SectionSidebar`.

### `ColorInput`

Wrapper for `<input type="color">` styled to match `inputClass` width. Used in site-logo and theme editors.

### `CtaField`

A grouped pair: button text input + button URL/href input. Wraps both in a small bordered card.

---

## 5 · SectionSidebar (the headline primitive)

This is the load-bearing UX innovation. Vertical pill list with optional drag-reorder + visibility eye icons. Lives in the AdminPageShell `sidebar` slot.

### Visual

```
┌────────────────────────────────┐
│ SECTIONS                       │  ← uppercase eyebrow
├────────────────────────────────┤
│ ⋮⋮ Hero                        │  ← active row: bg-brand-green
├────────────────────────────────┤
│ ⋮⋮ Section 2 — Benefits     👁 │  ← inactive: bg-black/[0.04]
├────────────────────────────────┤
│ ⋮⋮ Section 3 — How We Deliver👁│
├────────────────────────────────┤
│ ⋮⋮ Section 4 — Intro       👁‍🗨 │  ← hidden: strike-through + dim
└────────────────────────────────┘
```

- `rounded-xl border border-black/10 bg-white p-2`
- Eyebrow at top: `text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-black/55`
- Items: 32–36px tall, `rounded-lg`, `text-xs font-medium`
- Active: `bg-brand-green text-brand-black shadow-sm`
- Inactive: `bg-black/[0.04] text-brand-black/70 hover:bg-black/[0.07]`
- Hidden: `opacity-50 line-through decoration-1`
- Drag handle (lucide GripVertical-like 6-dot icon) shows only when `onReorder` is provided
- Eye icon (open/closed) shows only when `visibility` + `onVisibilityChange` are provided
- Eye and handle both have `cursor-grab`/`cursor-pointer` and stop propagation so they don't trigger the section navigation

### API

```ts
interface SectionSidebarProps<T extends string> {
  tabs: { value: T; label: string }[];
  active: T;
  onChange: (v: T) => void;

  /** Provide to enable drag-and-drop reorder. */
  onReorder?: (next: T[]) => void;

  /** Map of section value → whether it's visible on the live site. */
  visibility?: Record<string, boolean>;

  /** Called when an admin clicks the eye icon. */
  onVisibilityChange?: (value: T, visible: boolean) => void;

  title?: string; // default "Sections"
}
```

### Drag-and-drop implementation (dnd-kit)

Split the sidebar into two internal components so React's rules-of-hooks aren't violated by conditional `useSortable`:

```tsx
function SectionSidebar<T extends string>(props) {
  return (
    <nav className="rounded-xl border border-black/10 bg-white p-2">
      <Header title={props.title} />
      {props.onReorder
        ? <SortableSidebarList {...props} />
        : <PlainSidebarList {...props} />
      }
    </nav>
  );
}

function SortableSidebarList<T extends string>({ tabs, active, onChange, onReorder, visibility, onVisibilityChange }) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  function handleDragEnd(e: DragEndEvent) {
    const { active: a, over } = e;
    if (!over || a.id === over.id) return;
    const oldIdx = tabs.findIndex(t => t.value === a.id);
    const newIdx = tabs.findIndex(t => t.value === over.id);
    if (oldIdx < 0 || newIdx < 0) return;
    onReorder(arrayMove(tabs, oldIdx, newIdx).map(t => t.value));
  }
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={tabs.map(t => t.value)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-1">
          {tabs.map(tab => (
            <SortableSidebarItem
              key={tab.value}
              tab={tab}
              isActive={active === tab.value}
              isVisible={visibility ? visibility[tab.value] !== false : undefined}
              onActivate={() => onChange(tab.value)}
              onToggleVisibility={onVisibilityChange ? () =>
                onVisibilityChange(tab.value, !(visibility?.[tab.value] !== false))
              : undefined}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function SortableSidebarItem(props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: props.tab.value });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  return (
    <SidebarRow
      {...props}
      innerRef={setNodeRef}
      style={style}
      isDragging={isDragging}
      dragHandle={
        <button {...attributes} {...listeners}
          className="px-1.5 cursor-grab active:cursor-grabbing flex items-center text-brand-black/40 hover:text-brand-black/80 touch-none">
          <GripVerticalIcon />
        </button>
      }
    />
  );
}
```

The plain (non-DnD) variant skips `useSortable` entirely and just renders `SidebarRow` directly. Both share the same row layout component.

### How a parent wires it up

```tsx
const [active, setActive] = useState<SectionKey>("hero");
const [sectionsOrder, setSectionsOrder] = useState<NonHeroSection[]>(/* …from content.sectionsOrder, filling defaults */);
const [section2Visible, setSection2Visible] = useState(c.section2Visible !== false);
// …one boolean per section

<SectionSidebar
  tabs={[
    { value: "hero", label: "Hero" },
    ...sectionsOrder.map(key => ({ value: key, label: titles[key] })),
  ]}
  active={active}
  onChange={setActive}
  onReorder={(next) => setSectionsOrder(next.filter(v => v !== "hero") as NonHeroSection[])}
  visibility={{
    hero: true, // always visible — no eye
    section2: section2Visible,
    section3: section3Visible,
    // …
  }}
  onVisibilityChange={(key, visible) => {
    if (key === "section2") setSection2Visible(visible);
    else if (key === "section3") setSection3Visible(visible);
    // …
  }}
/>
```

Hero is in the tabs list but should NEVER be reorderable or hideable. The filter on `onReorder` strips it from the persisted array. The visibility map fixes it to `true`.

---

## 6 · PageMetaPanel

Sits **under** the SectionSidebar in the sidebar slot. Three controls:

1. **URL Path** — editable text input if `onUrlChange` is provided (service pages with editable slugs); otherwise a read-only `<code>` chip with a small explanatory note ("Public URL is determined by the folder route — contact a developer to change it")
2. **Meta Title** — text input with live character counter `n/60`
3. **Meta Description** — textarea with live character counter `n/160`

Visual: `rounded-xl border border-black/10 bg-white p-3 space-y-3` with `"Page Meta"` eyebrow at top.

The Meta Title/Description write to the row's `title` and `description` columns directly. Your `generateMetadata` reads from those — no separate SEO table needed.

```tsx
<PageMetaPanel
  url={`/${slug}`}
  onUrlChange={canRenameSlug ? setUrlPath : undefined}
  urlLockedReason="Public URL is determined by the folder route…"
  metaTitle={metaTitle}
  onMetaTitleChange={setMetaTitle}
  metaDescription={metaDescription}
  onMetaDescriptionChange={setMetaDescription}
/>
```

---

## 7 · Save flow

The save path **must avoid** Postgres `upsert` for content edits — it has subtle bugs with JSONB + auto-generated id semantics that silently drop fields. Use an explicit `UPDATE`:

```ts
"use server";

export async function updatePage(input: {
  slug: string;
  title: string;
  description: string;
  content: PageContent;
  nextSlug?: string;
}): Promise<{ ok: true; slug: string } | { ok: false; error: string }> {
  const supabase = await createServerClient(); // cookies-aware client for RLS

  // 1. Update the row by slug — explicit columns, no upsert
  const { error } = await supabase
    .from("pages")
    .update({
      title: input.title,
      description: input.description,
      content: input.content,
      updated_at: new Date().toISOString(),
    })
    .eq("slug", input.slug);
  if (error) return { ok: false, error: error.message };

  let finalSlug = input.slug;

  // 2. Optional slug rename — only for dynamic-route pages
  if (input.nextSlug && input.nextSlug !== input.slug) {
    const clean = createSlug(input.nextSlug);
    if (!clean || isReservedSlug(clean)) return { ok: false, error: "Invalid URL" };
    const { data: clash } = await supabase.from("pages").select("slug").eq("slug", clean).maybeSingle();
    if (clash) return { ok: false, error: `URL "/${clean}" already exists` };
    const { error } = await supabase.from("pages").update({ slug: clean }).eq("slug", input.slug);
    if (error) return { ok: false, error: error.message };
    revalidatePath(`/${input.slug}`);
    finalSlug = clean;
  }

  revalidatePath("/admin/your-page");
  revalidatePath(`/${finalSlug}`);
  revalidatePath("/", "layout");
  return { ok: true, slug: finalSlug };
}
```

Client-side, after save resolves:
- On success without slug change → `router.refresh()` so the editor re-hydrates from the freshly-saved row
- On success **with** slug change → `router.replace(`/admin/<page>/${finalSlug}`)`
- On failure → `alert(result.error)` (or your toast system)

### RLS note

The admin uses a **cookies-aware Supabase client** server-side (`@supabase/ssr` `createServerClient`) so RLS lets the authenticated admin write. The public site uses the bare anon client for reads only. Never use the anon browser client for writes — it'll silently fail under RLS.

---

## 8 · The public render

The template iterates `sectionsOrder` and renders sections by lookup. Hero is hardcoded first; everything else is dynamic.

```tsx
type SectionKey = "section2" | "section3" | /* … */;

const DEFAULT_ORDER: SectionKey[] = ["section2", "section3", /* … */];

const RENDERERS: Record<SectionKey, (c: PageContent) => React.ReactNode> = {
  section2: (c) => <Section2 content={c} />,
  section3: (c) => <Section3 content={c} />,
  // …
};

const VISIBILITY_KEYS: Record<SectionKey, keyof PageContent> = {
  section2: "section2Visible",
  section3: "section3Visible",
  // …
};

export default function PageTemplate({ content }: { content: PageContent }) {
  const saved = (content.sectionsOrder || []) as SectionKey[];
  const known = new Set(saved);
  const order: SectionKey[] = [...saved, ...DEFAULT_ORDER.filter(k => !known.has(k))];

  return (
    <div className="bg-white">
      <Hero content={content} />
      {order.map((key) => {
        const visible = content[VISIBILITY_KEYS[key]] !== false;
        if (!visible) return null;
        return <div key={key}>{RENDERERS[key](content)}</div>;
      })}
    </div>
  );
}
```

This is what makes admin drag-reorder and visibility-eye changes show on the live page.

---

## 9 · Section component conventions

Every section component receives `{ content }: { content: PageContent }` and reads its own keys. Common patterns:

### Card grids that fill the row

When you have 1–4 cards, you want them to expand evenly. Don't use fixed `w-[25%]` widths — they leave a gap when a card is removed.

```tsx
function gridColsClass(count: number): string {
  switch (Math.min(count, 4)) {
    case 1: return "grid-cols-1";
    case 2: return "grid-cols-1 sm:grid-cols-2";
    case 3: return "grid-cols-1 sm:grid-cols-3";
    default: return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4";
  }
}

<motion.div className={`grid gap-4 ${gridColsClass(cards.length)}`}>
  {cards.map(c => <CardComponent key={c.id} card={c} />)}
</motion.div>
```

### Card grids that auto-center the last row

For sections where >4 cards are common (Related Pages with arbitrary counts), use flex-wrap so 5 cards render as `4 + 1 centered` instead of `4 + 1 left-aligned`:

```tsx
<motion.div className="flex flex-wrap justify-center gap-4">
  {cards.map(c => (
    <div key={c.id} className="w-full sm:w-[calc(50%-0.5rem)] lg:w-[calc(25%-0.9375rem)] max-w-[280px]">
      …
    </div>
  ))}
</motion.div>
```

The two patterns are stylistic — pick per section based on whether the design wants "fill the row" or "center the last row."

### Don't render empty sections

If `cards.length === 0` or some required data is missing, return `null` early. Public pages should never render an empty headed-but-empty section.

### Animation pattern

Each section has its own framer scroll-trigger:

```tsx
const ref = useRef(null);
const isInView = useInView(ref, { once: true, amount: 0.15 });

<motion.div initial="hidden" animate={isInView ? "show" : "hidden"} variants={containerVariants}>
  <motion.h2 variants={titleVariants}>{title}</motion.h2>
  <motion.div variants={containerVariants}>
    {cards.map(c => <motion.div key={c.id} variants={itemVariants}>…</motion.div>)}
  </motion.div>
</motion.div>
```

`once: true` means each section animates in once when scrolled to.

---

## 10 · End-to-end implementation pattern (per admin editor)

To add a new admin editor for a new page:

### 1. Define content schema

```ts
// src/app/<page>/_config.ts
export type PageSection = "hero" | "section2" | "section3";

export type PageContent = {
  sectionsOrder: Exclude<PageSection, "hero">[];
  section2Visible: boolean;
  section3Visible: boolean;
  heroImage: string;
  heroTitle: string;
  heroTitleBold: boolean;
  // … fields per section
};

export const pageFallback = (): PageContent => ({
  sectionsOrder: ["section2", "section3"],
  section2Visible: true,
  section3Visible: true,
  heroImage: "/placeholder.webp",
  heroTitle: "Welcome",
  heroTitleBold: false,
  // …
});
```

### 2. Build the public template

```tsx
// src/components/<page>/PageTemplate.tsx
export default function PageTemplate({ content }: { content: PageContent }) {
  const order = resolveOrder(content.sectionsOrder, DEFAULT_ORDER);
  return (
    <div>
      <Hero content={content} />
      {order.map(key => {
        if (content[VISIBILITY_KEYS[key]] === false) return null;
        return <div key={key}>{RENDERERS[key](content)}</div>;
      })}
    </div>
  );
}
```

### 3. Server-side admin route

```tsx
// src/app/admin/<page>/page.tsx
export const dynamic = "force-dynamic";

export default async function Route() {
  const fallback: PageProps = { title: "…", description: "…", slug: "your-slug", content: pageFallback() };
  const page = await getPage<PageProps>("your-slug", fallback);
  return <YourAdminInputs {...page} />;
}
```

### 4. Client admin inputs

```tsx
"use client";
export default function YourAdminInputs(props: PageProps) {
  const c = props.content;

  // 1. Page-level meta
  const [metaTitle, setMetaTitle] = useState(props.title);
  const [metaDescription, setMetaDescription] = useState(props.description ?? "");

  // 2. Section visibility flags
  const [section2Visible, setSection2Visible] = useState(c.section2Visible !== false);
  const [section3Visible, setSection3Visible] = useState(c.section3Visible !== false);

  // 3. Section order
  type NonHero = Exclude<PageSection, "hero">;
  const DEFAULT_ORDER: NonHero[] = ["section2", "section3"];
  const [sectionsOrder, setSectionsOrder] = useState<NonHero[]>(() =>
    resolveOrder(c.sectionsOrder as NonHero[], DEFAULT_ORDER)
  );

  // 4. Per-section content state
  const [heroImage, setHeroImage] = useState(c.heroImage || "");
  // … one per field

  // 5. Section titles (for renaming in sidebar)
  type SK = PageSection;
  const [active, setActive] = useState<SK>("hero");
  const [titles, setTitles] = useState<Record<SK, string>>({ hero: "Hero", section2: "About", section3: "Services" });

  // 6. Save
  const [isSaving, setIsSaving] = useState(false);
  const router = useRouter();

  const handleSave = async () => {
    setIsSaving(true);
    const result = await updatePage({
      slug: props.slug,
      title: metaTitle,
      description: metaDescription,
      content: {
        sectionsOrder,
        section2Visible, section3Visible,
        heroImage, /* … */
      },
    });
    setIsSaving(false);
    if (!result.ok) { alert(result.error); return; }
    router.refresh();
  };

  return (
    <>
      <SaveBanner pageTitle={props.title} onSave={handleSave} isSaving={isSaving} />
      <AdminPageShell sidebar={
        <div className="flex flex-col gap-3">
          <SectionSidebar
            tabs={[
              { value: "hero", label: titles.hero },
              ...sectionsOrder.map(k => ({ value: k, label: titles[k] })),
            ]}
            active={active}
            onChange={setActive}
            onReorder={(next) => setSectionsOrder(next.filter(v => v !== "hero") as NonHero[])}
            visibility={{ hero: true, section2: section2Visible, section3: section3Visible }}
            onVisibilityChange={(key, vis) => {
              if (key === "section2") setSection2Visible(vis);
              else if (key === "section3") setSection3Visible(vis);
            }}
          />
          <PageMetaPanel
            url={`/${props.slug}`}
            metaTitle={metaTitle} onMetaTitleChange={setMetaTitle}
            metaDescription={metaDescription} onMetaDescriptionChange={setMetaDescription}
          />
        </div>
      }>
        {/* HERO */}
        <section className={active === "hero" ? "space-y-4" : "hidden"}>
          <SectionTitleHeader title={titles.hero} /* …rename props */ />
          <FieldGroup title="Hero Image">
            <ImageInput label="Background" value={heroImage} onChange={setHeroImage} />
          </FieldGroup>
          <FieldGroup title="Hero Copy">
            <BoldableText id="hero-title" label="Title" value={heroTitle} onChange={setHeroTitle}
              bold={heroTitleBold} onBoldChange={setHeroTitleBold} />
          </FieldGroup>
        </section>

        {/* SECTION 2 */}
        <section className={active === "section2" ? "space-y-4" : "hidden"}>
          <SectionHeaderWithToggle keyName="section2" visible={section2Visible} setVisible={setSection2Visible} />
          {/* … FieldGroups */}
        </section>

        {/* SECTION 3 */}
        {/* … */}
      </AdminPageShell>
    </>
  );
}
```

The `className={active === "hero" ? "space-y-4" : "hidden"}` pattern keeps **all** sections mounted (so their state doesn't reset when admin navigates between them) but only displays the active one. This is critical — switching tabs feels instant because no remount happens.

---

## 11 · Header navigation system (bonus)

Same architecture, but the row's content is a recursive tree. Lets admins build mega-menus.

```ts
type NavLink = {
  id: number;
  label: string;
  pageSlug: string; // empty string = section header (not clickable)
  children: NavLink[];
};
```

Storage: a `pages` row with slug `__navigation` and `content = { kind: "navigation", items: NavLink[] }`.

Editor: same recursive sortable-tree pattern using `useSortable` per node. Add "Add child link" and "Add sub link" buttons. Empty `pageSlug` is shown as a "Section header" badge.

Public header consumes the same data, decides between simple dropdown vs mega-menu by inspecting whether direct children have children of their own.

Reuse `PageMetaPanel`'s shadcn `Select` for the page-picker dropdown that admins use to pick what each link points to. Group the options: Core (folder routes) / Service (dynamic pages from `pages` table) / Legal.

---

## 12 · shadcn Select fix (critical)

The default shadcn `Select` uses `bg-popover` (a CSS variable that often resolves to transparent if you haven't defined it) and `z-50`. Both fail in admin contexts where the dropdown sits over field labels.

Replace with:

```tsx
<SelectContent
  className={cn(
    "relative z-[100] max-h-96 min-w-[8rem] overflow-hidden rounded-md border border-brand-black/10 bg-white text-brand-black shadow-2xl ring-1 ring-black/5 data-[state=open]:animate-in data-[state=closed]:animate-out …",
    // existing position classes
  )}
>
```

And on `SelectItem`:

```tsx
className={cn(
  "relative flex w-full items-center rounded-sm py-1.5 pl-8 pr-2 text-sm text-brand-black outline-none focus:bg-brand-green/15 focus:text-brand-black data-[state=checked]:bg-brand-green/10 data-[disabled]:opacity-50",
  className,
)}
```

Otherwise dropdowns appear transparent and content behind them bleeds through.

---

## 13 · File structure

```
src/
├── app/
│   ├── <page-route>/
│   │   ├── page.tsx        ← public page (renders <PageTemplate>)
│   │   └── _config.ts      ← PageContent type + fallback factory
│   ├── admin/
│   │   ├── layout.tsx      ← auth + nav
│   │   ├── page.tsx        ← dashboard tile grid
│   │   ├── <page-route>/
│   │   │   └── page.tsx    ← server component: getPage → render *AdminInputs
│   │   └── navigation/
│   │       └── page.tsx
│   └── [slug]/
│       └── page.tsx        ← dynamic catch-all (e.g. service pages)
├── components/
│   ├── ui/                 ← shadcn primitives (Button, Select, Accordion, …)
│   ├── core/               ← Header, Footer, BubbleMenu, SaveBanner
│   ├── <page-name>/        ← per-page section components
│   │   ├── Hero.tsx
│   │   ├── Section2.tsx
│   │   └── Section3.tsx
│   └── admin/
│       ├── _shared/
│       │   └── form-primitives.tsx   ← every primitive in §4
│       ├── AdminTiles.tsx            ← dashboard tile grid
│       └── <page-name>-inputs.tsx    ← per-page admin editor
├── data/
│   ├── navigation.ts                 ← NavLink type + STATIC_PAGES list + defaults
│   ├── reserved-slugs.ts             ← slugs that block service-page creation
│   └── <feature>-presets.ts          ← optional content presets by slug
├── server-actions/
│   ├── page.ts                       ← getPage helper
│   ├── navigation.ts                 ← getNavigation, saveNavigation, getAvailablePages
│   └── service-pages.ts              ← updatePage, renamePage, seedPageFromDefaults
└── utils/
    ├── server.ts                     ← createServerClient (cookies-aware)
    ├── client.ts                     ← createBrowserClient
    └── hooks/
        └── useUpdatePage.ts          ← legacy upsert hook (avoid for new code)
```

---

## 14 · Implementation checklist

For each phase, complete before moving on.

### Phase 1 — Foundation
- [ ] Tailwind config has `brand-green`, `brand-black`, `brand-cream` colors
- [ ] Globals.css imports Poppins + Inter, sets `h1`/`h2` to Poppins-medium
- [ ] Supabase project with `pages` table (slug unique, content JSONB)
- [ ] RLS allows authenticated users to write; anon to read
- [ ] `createServerClient` (cookies-aware) + `createBrowserClient` set up
- [ ] shadcn installed; **Select component patched** per §12

### Phase 2 — Admin primitives
- [ ] All §4 primitives in `_shared/form-primitives.tsx`
- [ ] `AdminPageShell` with optional sidebar prop
- [ ] `SaveBanner` (sticky top, status states)
- [ ] `SectionSidebar` primitive with DnD + visibility (per §5)
- [ ] `PageMetaPanel` (per §6)

### Phase 3 — Dashboard
- [ ] `/admin/page.tsx` with grouped tile grid
- [ ] One tile per planned admin editor
- [ ] AdminTiles uses lucide icons; brand-green hover state

### Phase 4 — First page editor
- [ ] Pick simplest page (e.g. Contact). Define `ContactContent` type + fallback
- [ ] Build public `ContactTemplate` that iterates `sectionsOrder`
- [ ] Build `ContactAdminInputs` following §10 pattern
- [ ] Verify: edit → save → reload → values persist
- [ ] Verify: drag a section in sidebar → save → public page reorders
- [ ] Verify: hide a section via eye → public page omits it

### Phase 5 — Server actions
- [ ] `updatePage` server action (no upsert, explicit UPDATE) per §7
- [ ] `getPage` server action for fetching
- [ ] If supporting slug rename: add `nextSlug` handling per §7

### Phase 6 — Header navigation
- [ ] `NavLink` type + DB row at `__navigation`
- [ ] `/admin/navigation` editor with recursive sortable tree
- [ ] Page-picker dropdown (shadcn Select)
- [ ] Public Header reads nav from DB; renders dropdown or mega-menu

### Phase 7 — Rinse + repeat
- [ ] Convert every remaining page to the same editor pattern
- [ ] Each conversion should take 60–90 minutes once primitives are stable

---

## 15 · Anti-patterns (don't do these)

- **Don't use Postgres `upsert` for content edits.** Use explicit `UPDATE` by slug. Upsert can silently drop JSONB fields under certain id/conflict combinations.
- **Don't conditionally call `useSortable`.** Split into two sibling components (DnD vs plain) so hooks are unconditional.
- **Don't remount sections when switching tabs.** Use `className={active === key ? "space-y-4" : "hidden"}` — keep them all mounted so state survives navigation.
- **Don't hide reorder/visibility behind a settings drawer.** Putting them in the sidebar where admins live makes the UX click. The whole point of the sidebar redesign is that structure changes are always one click away.
- **Don't store visibility flags as `true/undefined` only.** Use explicit booleans (`true | false`), but READ as `!== false` to default undefined → visible. Lets you add new sections without migrations.
- **Don't use `bg-popover` or other shadcn-default color tokens** unless you've defined those CSS variables. They quietly render transparent.
- **Don't put `revalidatePath` inside actions called during render.** Next 15 forbids it. Only call from button-click server actions.
- **Don't render sections with `display: none` when hidden via the eye icon.** Filter them out of the iteration entirely. CSS-hiding leaves layout artifacts (gaps, scroll positioning) and ships the content to clients unnecessarily.

---

## 16 · Quick reference — common code shapes

### Reading content with safe defaults

```ts
const c = props.content;
const [section2Visible, setSection2Visible] = useState(c.section2Visible !== false);
const [cards, setCards] = useState<Card[]>(c.section2cards || []);
const [order, setOrder] = useState<SectionKey[]>(() => resolveOrder(c.sectionsOrder, DEFAULT_ORDER));
```

### Array mutation (using helpers)

```ts
// Add
setCards([...cards, { id: nextId(cards), title: "New", titleBold: false }]);

// Update
updateIn(cards, card.id, { title: newTitle }, setCards);

// Remove
removeIn(cards, card.id, setCards);
```

### Card with icon (admin)

```tsx
<ListItemCard title={`Card ${i+1}`} onRemove={() => removeIn(cards, card.id, setCards)}>
  <IconField
    id={`card-${card.id}-icon`}
    value={card.icon || ""}
    onChange={(v) => updateIn(cards, card.id, { icon: v }, setCards)}
    enabled={card.showIcon !== false}
    onEnabledChange={(v) => updateIn(cards, card.id, { showIcon: v }, setCards)}
  />
  <BoldableText
    id={`card-${card.id}-title`}
    label="Title"
    value={card.title}
    onChange={(v) => updateIn(cards, card.id, { title: v }, setCards)}
    bold={card.titleBold}
    onBoldChange={(v) => updateIn(cards, card.id, { titleBold: v }, setCards)}
  />
</ListItemCard>
```

### Card with icon (public)

```tsx
{card.showIcon !== false && card.icon && (
  <div className="w-7 h-7 relative">
    <Image src={card.icon} alt="" fill className="object-contain" />
  </div>
)}
```

The `!== false` check defaults `undefined` to true (visible), so admins adding new icon-bearing types don't need to migrate old rows.

---

## 17 · What to send to the dev

When handing this to someone else, bundle:

1. This file (`ADMIN_SYSTEM.md`)
2. Your `tailwind.config.ts` color extension (brand-green/black/cream tokens)
3. Your shadcn `select.tsx` with the §12 fix applied
4. A reference screenshot of the dashboard, one of the admin editor in 2-col layout (sidebar + form), one of a section with the visibility eye toggled hidden

Tell them: "Implement Phases 1–4 first (one simple page). Verify the drag-reorder + visibility round-trips through the database to the public page. Once that works, every other page is a copy-paste."

If anything in the above feels under-specified, the canonical reference is the source code that this doc was extracted from — point them at the `_shared/form-primitives.tsx` file as the single source of truth for visual style and component API.
