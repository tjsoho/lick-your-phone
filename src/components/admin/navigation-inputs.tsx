"use client";

import { useState, useTransition } from "react";
import {
    DndContext,
    DragEndEvent,
    KeyboardSensor,
    PointerSensor,
    closestCenter,
    useSensor,
    useSensors,
} from "@dnd-kit/core";
import {
    SortableContext,
    arrayMove,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
    ChevronDown,
    ChevronRight,
    GripVertical,
    Plus,
    Trash2,
} from "lucide-react";
import { SaveBanner } from "@/components/core/save-banner";
import {
    AddItemButton,
    AdminPageShell,
    FieldGroup,
    FieldLabel,
    TextInput,
} from "@/components/admin/_shared/form-primitives";
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { AvailablePage, NavLink } from "@/data/navigation";
import { saveNavigation } from "@/server-actions/navigation";

const SECTION_HEADER_VALUE = "__section_header__";

interface NavigationInputsProps {
    initialItems: NavLink[];
    availablePages: AvailablePage[];
}

/**
 * Header navigation editor — recursive tree with drag-and-drop.
 *
 * Nesting is unlimited in the data model. Items where `pageSlug` is empty
 * render as section headers in the live mega-menu (label only, not
 * clickable). The Header component decides single-column vs mega-menu
 * based on whether any direct child of a top-level item has its own
 * children.
 *
 * Drag scope: items can be reordered within their sibling list. To move an
 * item to a different parent, remove and re-add — full cross-parent tree
 * drag is intentionally out of scope (needs SortableTree + custom collision
 * logic).
 */
export default function NavigationInputs({
    initialItems,
    availablePages,
}: NavigationInputsProps) {
    const [items, setItems] = useState<NavLink[]>(initialItems);
    const [isPending, startTransition] = useTransition();
    const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">(
        "idle",
    );

    /* ─── ID generation ─── */
    function getMaxId(nodes: NavLink[]): number {
        let max = 0;
        const walk = (node: NavLink) => {
            if (node.id > max) max = node.id;
            for (const child of node.children) walk(child);
        };
        for (const node of nodes) walk(node);
        return max;
    }
    function nextId(): number {
        return getMaxId(items) + 1;
    }

    /* ─── Tree mutations ─── */
    // Each mutation walks the tree and replaces only the affected path,
    // keeping React happy about immutability.

    function updateItem(itemId: number, patch: Partial<NavLink>) {
        const walk = (node: NavLink): NavLink =>
            node.id === itemId
                ? { ...node, ...patch }
                : { ...node, children: node.children.map(walk) };
        setItems((current) => current.map(walk));
    }

    function removeItem(itemId: number) {
        const walk = (nodes: NavLink[]): NavLink[] =>
            nodes
                .filter((n) => n.id !== itemId)
                .map((n) => ({ ...n, children: walk(n.children) }));
        setItems((current) => walk(current));
    }

    function addChild(parentId: number) {
        const newChild: NavLink = {
            id: nextId(),
            label: "New link",
            pageSlug: "/",
            children: [],
        };
        const walk = (node: NavLink): NavLink =>
            node.id === parentId
                ? { ...node, children: [...node.children, newChild] }
                : { ...node, children: node.children.map(walk) };
        setItems((current) => current.map(walk));
    }

    function addTopLevel() {
        setItems((current) => [
            ...current,
            { id: nextId(), label: "New link", pageSlug: "/", children: [] },
        ]);
    }

    /* ─── Drag-and-drop ─── */
    const sensors = useSensors(
        // 6px activation distance prevents drag from hijacking input clicks.
        useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        }),
    );

    function handleTopLevelDragEnd(event: DragEndEvent) {
        const { active, over } = event;
        if (!over || active.id === over.id) return;
        setItems((current) => {
            const oldIndex = current.findIndex((it) => it.id === active.id);
            const newIndex = current.findIndex((it) => it.id === over.id);
            if (oldIndex < 0 || newIndex < 0) return current;
            return arrayMove(current, oldIndex, newIndex);
        });
    }

    function handleChildrenDragEnd(parentId: number, event: DragEndEvent) {
        const { active, over } = event;
        if (!over || active.id === over.id) return;
        const walk = (node: NavLink): NavLink => {
            if (node.id === parentId) {
                const oldIndex = node.children.findIndex(
                    (c) => c.id === active.id,
                );
                const newIndex = node.children.findIndex(
                    (c) => c.id === over.id,
                );
                if (oldIndex < 0 || newIndex < 0) return node;
                return {
                    ...node,
                    children: arrayMove(node.children, oldIndex, newIndex),
                };
            }
            return { ...node, children: node.children.map(walk) };
        };
        setItems((current) => current.map(walk));
    }

    /* ─── Save ─── */
    function handleSave() {
        startTransition(async () => {
            const result = await saveNavigation(items);
            setSaveStatus(result.ok ? "success" : "error");
            setTimeout(() => setSaveStatus("idle"), 2500);
        });
    }

    return (
        <>
            <SaveBanner
                pageTitle="Header Navigation"
                onSave={handleSave}
                isSaving={isPending}
                saveStatus={saveStatus}
            />
            <AdminPageShell>
                <div className="rounded-xl border border-[rgba(18,23,23,0.10)] bg-brand-cream/40 p-4 space-y-2">
                    <p className="text-sm text-brand-black/70 leading-relaxed">
                        Drag the grip handle{" "}
                        <GripVertical className="inline w-3.5 h-3.5 align-middle" />{" "}
                        to reorder. Add child links to create dropdowns. Set a
                        child&apos;s page to <em>Section header</em> to make it
                        a non-clickable group label in a mega-menu — its
                        children become a column of links underneath.
                    </p>
                </div>

                <FieldGroup
                    title="Menu Links"
                    description="Top-level items appear in the main header bar."
                    toolbar={
                        <AddItemButton onClick={addTopLevel}>
                            Add menu link
                        </AddItemButton>
                    }
                >
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleTopLevelDragEnd}
                    >
                        <SortableContext
                            items={items.map((it) => it.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            <div className="flex flex-col gap-3">
                                {items.map((item) => (
                                    <SortableNavItem
                                        key={item.id}
                                        item={item}
                                        depth={0}
                                        availablePages={availablePages}
                                        onUpdate={updateItem}
                                        onRemove={removeItem}
                                        onAddChild={addChild}
                                        onChildrenDragEnd={
                                            handleChildrenDragEnd
                                        }
                                        sensors={sensors}
                                    />
                                ))}
                            </div>
                        </SortableContext>
                    </DndContext>
                    {items.length === 0 && (
                        <p className="text-sm text-brand-black/50 italic py-6 text-center">
                            No menu links yet. Click{" "}
                            <em>Add menu link</em> to start.
                        </p>
                    )}
                </FieldGroup>
            </AdminPageShell>
        </>
    );
}

/* ──────────────────────────────────────────────────────────────────────────
   SortableNavItem — recursive (renders itself for each level of nesting)
   ────────────────────────────────────────────────────────────────────────── */

interface SortableNavItemProps {
    item: NavLink;
    depth: number;
    availablePages: AvailablePage[];
    onUpdate: (itemId: number, patch: Partial<NavLink>) => void;
    onRemove: (itemId: number) => void;
    onAddChild: (parentId: number) => void;
    onChildrenDragEnd: (parentId: number, event: DragEndEvent) => void;
    sensors: ReturnType<typeof useSensors>;
}

function SortableNavItem({
    item,
    depth,
    availablePages,
    onUpdate,
    onRemove,
    onAddChild,
    onChildrenDragEnd,
    sensors,
}: SortableNavItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: item.id });

    const [expanded, setExpanded] = useState(true);
    const hasChildren = item.children.length > 0;
    const isSectionHeader = !item.pageSlug;

    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    // Visual variants by depth — top level cards are slightly chunkier.
    const cardClass =
        depth === 0
            ? "rounded-xl border border-[rgba(18,23,23,0.12)] bg-white shadow-sm"
            : "rounded-lg border border-[rgba(18,23,23,0.10)] bg-white";

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`${cardClass} ${isDragging ? "shadow-lg" : ""}`}
        >
            <div className="flex items-center gap-2 p-3">
                {/* Drag handle */}
                <button
                    type="button"
                    aria-label="Drag to reorder"
                    className="touch-none text-brand-black/40 hover:text-brand-black/80 cursor-grab active:cursor-grabbing p-1"
                    {...attributes}
                    {...listeners}
                >
                    <GripVertical
                        className={depth === 0 ? "w-5 h-5" : "w-4 h-4"}
                    />
                </button>

                {/* Expand toggle */}
                <button
                    type="button"
                    aria-label={expanded ? "Collapse" : "Expand"}
                    className={`text-brand-black/50 hover:text-brand-black p-1 ${hasChildren ? "" : "invisible"}`}
                    onClick={() => setExpanded((v) => !v)}
                >
                    {expanded ? (
                        <ChevronDown className="w-4 h-4" />
                    ) : (
                        <ChevronRight className="w-4 h-4" />
                    )}
                </button>

                {/* Label + page picker */}
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <TextInput
                        label="Label"
                        value={item.label}
                        onChange={(v) => onUpdate(item.id, { label: v })}
                        placeholder={
                            isSectionHeader
                                ? "Section header label"
                                : "Menu label"
                        }
                    />
                    <PagePicker
                        value={item.pageSlug}
                        onChange={(v) => onUpdate(item.id, { pageSlug: v })}
                        availablePages={availablePages}
                    />
                </div>

                {/* Delete */}
                <button
                    type="button"
                    aria-label="Remove"
                    className="text-brand-black/40 hover:text-red-600 p-1 transition-colors"
                    onClick={() => onRemove(item.id)}
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>

            {/* Section header badge */}
            {isSectionHeader && depth > 0 && (
                <div className="px-4 pb-2 -mt-1 flex items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 rounded-full bg-brand-green/10 text-brand-green text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5">
                        Section header
                    </span>
                    <span className="text-xs text-brand-black/50">
                        — not clickable. Children render below it in the
                        mega-menu.
                    </span>
                </div>
            )}

            {/* Children */}
            {expanded && (
                <div
                    className={`border-t border-[rgba(18,23,23,0.08)] bg-brand-cream/20 px-3 pt-3 pb-2 ${depth === 0 ? "rounded-b-xl" : "rounded-b-lg"}`}
                >
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-brand-black/55 uppercase tracking-wider">
                            {depth === 0
                                ? "Dropdown items"
                                : "Nested items"}
                        </span>
                        <button
                            type="button"
                            onClick={() => onAddChild(item.id)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-brand-black/70 hover:text-brand-black px-2 py-1 rounded-md hover:bg-brand-black/[0.06]"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            Add {depth === 0 ? "child" : "sub"} link
                        </button>
                    </div>

                    {item.children.length === 0 ? (
                        <p className="text-xs text-brand-black/40 italic py-2 pl-1">
                            {depth === 0
                                ? "No children — renders as a single link with no dropdown."
                                : "No nested items yet."}
                        </p>
                    ) : (
                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={(e) => onChildrenDragEnd(item.id, e)}
                        >
                            <SortableContext
                                items={item.children.map((c) => c.id)}
                                strategy={verticalListSortingStrategy}
                            >
                                <div className="flex flex-col gap-2">
                                    {item.children.map((child) => (
                                        <SortableNavItem
                                            key={child.id}
                                            item={child}
                                            depth={depth + 1}
                                            availablePages={availablePages}
                                            onUpdate={onUpdate}
                                            onRemove={onRemove}
                                            onAddChild={onAddChild}
                                            onChildrenDragEnd={
                                                onChildrenDragEnd
                                            }
                                            sensors={sensors}
                                        />
                                    ))}
                                </div>
                            </SortableContext>
                        </DndContext>
                    )}
                </div>
            )}
        </div>
    );
}

/* ──────────────────────────────────────────────────────────────────────────
   PagePicker — shadcn Select listing all available pages grouped by source.
   First option is "Section header" — picking it clears pageSlug so the
   item renders as a non-clickable group label in the mega-menu.
   ────────────────────────────────────────────────────────────────────────── */

interface PagePickerProps {
    value: string;
    onChange: (v: string) => void;
    availablePages: AvailablePage[];
}

function PagePicker({ value, onChange, availablePages }: PagePickerProps) {
    const groups: Record<string, AvailablePage[]> = {
        Core: [],
        Service: [],
        Legal: [],
    };
    for (const page of availablePages) groups[page.group].push(page);

    const known = availablePages.some((p) => p.path === value);
    const showOther = value && !known;
    const isSectionHeader = !value;

    // shadcn Select needs a non-empty string for value, so use a sentinel.
    const selectValue = isSectionHeader ? SECTION_HEADER_VALUE : value;

    return (
        <div>
            <FieldLabel>Links to</FieldLabel>
            <Select
                value={selectValue}
                onValueChange={(v) =>
                    onChange(v === SECTION_HEADER_VALUE ? "" : v)
                }
            >
                <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Select a page…" />
                </SelectTrigger>
                <SelectContent>
                    <SelectGroup>
                        <SelectLabel>Special</SelectLabel>
                        <SelectItem value={SECTION_HEADER_VALUE}>
                            Section header (no link)
                        </SelectItem>
                    </SelectGroup>
                    {showOther && (
                        <SelectGroup>
                            <SelectLabel>Other</SelectLabel>
                            <SelectItem value={value}>
                                {value} (custom)
                            </SelectItem>
                        </SelectGroup>
                    )}
                    {(["Core", "Service", "Legal"] as const).map((group) =>
                        groups[group].length === 0 ? null : (
                            <SelectGroup key={group}>
                                <SelectLabel>{group}</SelectLabel>
                                {groups[group].map((page) => (
                                    <SelectItem
                                        key={page.path}
                                        value={page.path}
                                    >
                                        {page.label}{" "}
                                        <span className="text-brand-black/50 font-mono text-xs">
                                            {page.path}
                                        </span>
                                    </SelectItem>
                                ))}
                            </SelectGroup>
                        ),
                    )}
                </SelectContent>
            </Select>
        </div>
    );
}
