"use client";

/* ──────────────────────────────────────────────────────────────────────────
   Admin form primitives
   Single source of truth for every admin edit page.
   Colors come from the `brand-*` Tailwind tokens (see tailwind.config.ts) —
   recolor there to restyle every admin surface at once.
   ────────────────────────────────────────────────────────────────────────── */

import React, {
    ChangeEvent,
    KeyboardEvent,
    ReactNode,
    useEffect,
    useRef,
} from "react";
import { Check, ImagePlus, Pencil, Plus, Trash2, X } from "lucide-react";
import {
    closestCenter,
    DndContext,
    DragEndEvent,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useImageLibrary } from "@/contexts/ImageLibraryContext";

/* ──────────────────────────────────────────────────────────────────────────
   Canonical input class
   ────────────────────────────────────────────────────────────────────────── */
export const inputClass =
    "w-full rounded-lg border border-[rgba(18,23,23,0.12)] bg-white px-3 py-2 text-sm text-brand-black placeholder:text-brand-black/30 focus:outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/25 transition-colors";

/* ──────────────────────────────────────────────────────────────────────────
   AdminPageShell — form wrapper.

   When `sidebar` is provided, the shell renders a 2-col layout: sticky
   sidebar on the left (260px wide) + form content on the right. When
   omitted, it falls back to the original narrow centered form layout
   (so admin pages that haven't migrated keep working).
   ────────────────────────────────────────────────────────────────────────── */
export function AdminPageShell({
    children,
    sidebar,
}: {
    children: ReactNode;
    sidebar?: ReactNode;
}) {
    if (!sidebar) {
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

/* ──────────────────────────────────────────────────────────────────────────
   FieldLabel — standalone uppercase label
   ────────────────────────────────────────────────────────────────────────── */
export function FieldLabel({
    children,
    hint,
    htmlFor,
}: {
    children: ReactNode;
    hint?: ReactNode;
    htmlFor?: string;
}) {
    return (
        <div className="flex items-baseline justify-between gap-3 mb-1.5">
            <label
                htmlFor={htmlFor}
                className="text-[11px] font-semibold uppercase tracking-wider text-brand-black/60"
            >
                {children}
            </label>
            {hint && (
                <span className="text-[11px] text-brand-black/45">{hint}</span>
            )}
        </div>
    );
}

/* ──────────────────────────────────────────────────────────────────────────
   TextInput
   ────────────────────────────────────────────────────────────────────────── */
export type TextInputSize = "sm" | "md" | "full";

export function TextInput({
    label,
    value,
    onChange,
    type = "text",
    placeholder,
    hint,
    size = "full",
    disabled,
    name,
    id,
}: {
    label?: string;
    value: string;
    onChange: (v: string) => void;
    type?: "text" | "email" | "url" | "tel" | "number";
    placeholder?: string;
    hint?: ReactNode;
    size?: TextInputSize;
    disabled?: boolean;
    name?: string;
    id?: string;
}) {
    const sizeClass =
        size === "sm" ? "max-w-xs" : size === "md" ? "max-w-md" : "";
    const inputId = id ?? name;
    return (
        <div>
            {label && (
                <FieldLabel htmlFor={inputId} hint={hint}>
                    {label}
                </FieldLabel>
            )}
            <input
                id={inputId}
                name={name}
                type={type}
                value={value}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    onChange(e.target.value)
                }
                placeholder={placeholder}
                disabled={disabled}
                className={`${inputClass} ${sizeClass}`}
            />
        </div>
    );
}

/* ──────────────────────────────────────────────────────────────────────────
   TextAreaInput
   ────────────────────────────────────────────────────────────────────────── */
export function TextAreaInput({
    label,
    value,
    onChange,
    rows = 4,
    placeholder,
    hint,
    name,
    id,
}: {
    label?: string;
    value: string;
    onChange: (v: string) => void;
    rows?: number;
    placeholder?: string;
    hint?: ReactNode;
    name?: string;
    id?: string;
}) {
    const inputId = id ?? name;
    return (
        <div>
            {label && (
                <FieldLabel htmlFor={inputId} hint={hint}>
                    {label}
                </FieldLabel>
            )}
            <textarea
                id={inputId}
                name={name}
                value={value}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                    onChange(e.target.value)
                }
                rows={rows}
                placeholder={placeholder}
                className={`${inputClass} resize-none leading-relaxed`}
            />
        </div>
    );
}

/* ──────────────────────────────────────────────────────────────────────────
   SelectInput
   ────────────────────────────────────────────────────────────────────────── */
export function SelectInput<T extends string>({
    label,
    value,
    onChange,
    options,
    hint,
    name,
    id,
}: {
    label?: string;
    value: T;
    onChange: (v: T) => void;
    options: { value: T; label: string }[];
    hint?: ReactNode;
    name?: string;
    id?: string;
}) {
    const inputId = id ?? name;
    return (
        <div>
            {label && (
                <FieldLabel htmlFor={inputId} hint={hint}>
                    {label}
                </FieldLabel>
            )}
            <div className="relative">
                <select
                    id={inputId}
                    name={name}
                    value={value}
                    onChange={(e) => onChange(e.target.value as T)}
                    className={`${inputClass} cursor-pointer appearance-none pr-9`}
                >
                    {options.map((o) => (
                        <option key={o.value} value={o.value}>
                            {o.label}
                        </option>
                    ))}
                </select>
                <svg
                    aria-hidden="true"
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-black/50"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <polyline points="6 9 12 15 18 9" />
                </svg>
            </div>
        </div>
    );
}

/* ──────────────────────────────────────────────────────────────────────────
   BoldToggle — small inline checkbox for "Bold" toggles next to titles
   ────────────────────────────────────────────────────────────────────────── */
export function BoldToggle({
    id,
    checked,
    onChange,
    label = "Bold",
}: {
    id: string;
    checked: boolean;
    onChange: (v: boolean) => void;
    label?: string;
}) {
    return (
        <label
            htmlFor={id}
            className="inline-flex items-center gap-1.5 cursor-pointer select-none text-[11px] font-semibold uppercase tracking-wider text-brand-black/55 hover:text-brand-black/80 transition-colors"
        >
            <span
                className={`flex items-center justify-center w-4 h-4 rounded border transition-colors ${
                    checked
                        ? "bg-brand-green border-brand-green text-white"
                        : "bg-white border-[rgba(18,23,23,0.18)]"
                }`}
            >
                {checked && <Check className="w-3 h-3" strokeWidth={3} />}
            </span>
            <input
                id={id}
                type="checkbox"
                className="sr-only"
                checked={checked}
                onChange={(e) => onChange(e.target.checked)}
            />
            {label}
        </label>
    );
}

/* ──────────────────────────────────────────────────────────────────────────
   BoldableText — labelled text/textarea with an inline Bold toggle
   ────────────────────────────────────────────────────────────────────────── */
export function BoldableText({
    label,
    value,
    onChange,
    bold,
    onBoldChange,
    id,
    as = "input",
    rows = 3,
    placeholder,
    hint,
}: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    bold: boolean;
    onBoldChange: (v: boolean) => void;
    id: string;
    as?: "input" | "textarea";
    rows?: number;
    placeholder?: string;
    hint?: ReactNode;
}) {
    return (
        <div>
            <div className="flex items-center justify-between mb-1.5">
                <FieldLabel hint={hint}>{label}</FieldLabel>
                <BoldToggle
                    id={`${id}-bold`}
                    checked={bold}
                    onChange={onBoldChange}
                />
            </div>
            {as === "textarea" ? (
                <textarea
                    id={id}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    rows={rows}
                    placeholder={placeholder}
                    className={`${inputClass} resize-none leading-relaxed`}
                />
            ) : (
                <input
                    id={id}
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    className={inputClass}
                />
            )}
        </div>
    );
}

/* ──────────────────────────────────────────────────────────────────────────
   FieldGroup — recurring card wrapper
   ────────────────────────────────────────────────────────────────────────── */
export function FieldGroup({
    title,
    description,
    toolbar,
    children,
    tone = "default",
}: {
    title?: string;
    description?: string;
    toolbar?: ReactNode;
    children: ReactNode;
    tone?: "default" | "tinted";
}) {
    const bg = tone === "tinted" ? "bg-[#fafbf7]" : "bg-white";
    return (
        <div
            className={`rounded-xl border border-[rgba(18,23,23,0.10)] ${bg} p-5`}
        >
            {(title || description || toolbar) && (
                <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="min-w-0 flex-1">
                        {title && (
                            <h3 className="text-sm font-semibold text-brand-black tracking-tight">
                                {title}
                            </h3>
                        )}
                        {description && (
                            <p className="mt-0.5 text-xs text-brand-black/55 leading-relaxed">
                                {description}
                            </p>
                        )}
                    </div>
                    {toolbar && <div className="shrink-0">{toolbar}</div>}
                </div>
            )}
            <div className="space-y-4">{children}</div>
        </div>
    );
}

/* ──────────────────────────────────────────────────────────────────────────
   ImageInput — clickable image picker tied to the global image library.
   Bypasses EditableImage so the entire wrapper area is clickable (the
   underlying EditableImage relies on a fixed-size inner block which made
   empty thumbnails unclickable inside a smaller wrapper).
   ────────────────────────────────────────────────────────────────────────── */
export function ImageInput({
    label,
    value,
    onChange,
    altValue,
    onAltChange,
    hint,
    usage,
    aspect = "video",
}: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    altValue?: string;
    onAltChange?: (v: string) => void;
    hint?: ReactNode;
    usage?: string;
    /** Visual size of the preview thumbnail */
    aspect?: "icon" | "square" | "video" | "wide";
}) {
    const { openImageLibrary } = useImageLibrary();

    /** width × height of the clickable thumbnail */
    const sizeClass =
        aspect === "icon"
            ? "w-16 h-16" // 64 × 64 — for icons
            : aspect === "square"
              ? "w-32 h-32" // 128 × 128 — small square images
              : aspect === "wide"
                ? "w-full md:w-72 aspect-[3/1]"
                : "w-full md:w-56 aspect-video";

    const openPicker = () => openImageLibrary(onChange, usage);

    return (
        <div>
            <FieldLabel hint={hint}>{label}</FieldLabel>
            <div className="flex flex-col md:flex-row gap-4 items-start">
                <button
                    type="button"
                    onClick={openPicker}
                    aria-label={
                        value
                            ? `Replace ${label.toLowerCase()}`
                            : `Add ${label.toLowerCase()}`
                    }
                    className={`group relative shrink-0 ${sizeClass} rounded-lg overflow-hidden border border-dashed border-[rgba(18,23,23,0.20)] bg-[#fafaf7] hover:border-brand-green hover:bg-brand-green/5 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-green/30 focus:border-brand-green`}
                >
                    {value ? (
                        <>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={value}
                                alt={altValue || label}
                                className="absolute inset-0 w-full h-full object-contain p-1"
                            />
                            <span className="absolute inset-0 flex items-center justify-center bg-brand-black/55 text-white text-[10px] font-semibold uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">
                                Replace
                            </span>
                        </>
                    ) : (
                        <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-brand-black/40 group-hover:text-brand-green transition-colors">
                            <ImagePlus className="w-5 h-5" />
                            <span className="text-[10px] font-semibold uppercase tracking-wider">
                                Add
                            </span>
                        </span>
                    )}
                </button>
                {onAltChange && (
                    <div className="flex-1 w-full">
                        <TextInput
                            label="Alt text"
                            value={altValue ?? ""}
                            onChange={onAltChange}
                            placeholder="Describe the image for accessibility"
                            size="full"
                        />
                    </div>
                )}
            </div>
        </div>
    );
}

/* ──────────────────────────────────────────────────────────────────────────
   Toggle — accessible iOS-style switch with inline label
   ────────────────────────────────────────────────────────────────────────── */
export function Toggle({
    id,
    checked,
    onChange,
    label,
    hint,
}: {
    id: string;
    checked: boolean;
    onChange: (v: boolean) => void;
    label: string;
    hint?: ReactNode;
}) {
    return (
        <div className="flex items-center gap-2">
            <button
                type="button"
                role="switch"
                id={id}
                aria-checked={checked}
                onClick={() => onChange(!checked)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-brand-green/30 focus:ring-offset-1 ${
                    checked ? "bg-brand-green" : "bg-brand-black/15"
                }`}
            >
                <span
                    className={`inline-block w-3.5 h-3.5 bg-white rounded-full shadow transform transition-transform ${
                        checked ? "translate-x-[18px]" : "translate-x-1"
                    }`}
                />
            </button>
            <label
                htmlFor={id}
                className="text-[11px] font-semibold uppercase tracking-wider text-brand-black/65 cursor-pointer select-none"
            >
                {label}
            </label>
            {hint && <span className="text-[11px] text-brand-black/45">{hint}</span>}
        </div>
    );
}

/* ──────────────────────────────────────────────────────────────────────────
   IconField — Toggle + ImageInput pair for any optional icon
   When toggle is off, the icon doesn't render on the public site.
   Existing icon URL is preserved while hidden.
   ────────────────────────────────────────────────────────────────────────── */
export function IconField({
    id,
    label = "Icon",
    value,
    onChange,
    enabled,
    onEnabledChange,
    usage,
}: {
    id: string;
    label?: string;
    value: string;
    onChange: (v: string) => void;
    enabled: boolean;
    onEnabledChange: (v: boolean) => void;
    usage?: string;
}) {
    const { openImageLibrary } = useImageLibrary();
    const openPicker = () => openImageLibrary(onChange, usage);
    return (
        <div>
            <div className="flex items-center justify-between mb-1.5">
                <FieldLabel>{label}</FieldLabel>
                <Toggle
                    id={`${id}-toggle`}
                    label={enabled ? "Visible" : "Hidden"}
                    checked={enabled}
                    onChange={onEnabledChange}
                />
            </div>
            {enabled ? (
                <button
                    type="button"
                    onClick={openPicker}
                    aria-label={value ? `Replace ${label}` : `Add ${label}`}
                    className="group relative shrink-0 w-16 h-16 rounded-lg overflow-hidden border border-dashed border-[rgba(18,23,23,0.20)] bg-[#fafaf7] hover:border-brand-green hover:bg-brand-green/5 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-green/30 focus:border-brand-green"
                >
                    {value ? (
                        <>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={value}
                                alt={label}
                                className="absolute inset-0 w-full h-full object-contain p-1"
                            />
                            <span className="absolute inset-0 flex items-center justify-center bg-brand-black/55 text-white text-[10px] font-semibold uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">
                                Replace
                            </span>
                        </>
                    ) : (
                        <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-brand-black/40 group-hover:text-brand-green transition-colors">
                            <ImagePlus className="w-4 h-4" />
                            <span className="text-[10px] font-semibold uppercase tracking-wider">
                                Add
                            </span>
                        </span>
                    )}
                </button>
            ) : (
                <div className="rounded-lg border border-dashed border-[rgba(18,23,23,0.15)] bg-[#fafaf7] px-3 py-2 text-xs text-brand-black/50 italic">
                    Icon hidden on the live page. Toggle on to show it.
                </div>
            )}
        </div>
    );
}

/* ──────────────────────────────────────────────────────────────────────────
   ColorInput — hex picker + text field
   ────────────────────────────────────────────────────────────────────────── */
export function ColorInput({
    label,
    value,
    onChange,
    hint,
    id,
}: {
    label?: string;
    value: string;
    onChange: (v: string) => void;
    hint?: ReactNode;
    id?: string;
}) {
    return (
        <div>
            {label && (
                <FieldLabel htmlFor={id} hint={hint}>
                    {label}
                </FieldLabel>
            )}
            <div className="flex items-center gap-2">
                <input
                    type="color"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="h-10 w-12 rounded-lg border border-[rgba(18,23,23,0.10)] cursor-pointer bg-white p-1"
                    aria-label={`${label || "Color"} picker`}
                />
                <input
                    id={id}
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className={`${inputClass} max-w-[140px] font-mono`}
                    placeholder="#000000"
                />
            </div>
        </div>
    );
}

/* ──────────────────────────────────────────────────────────────────────────
   CtaField — button text + destination pair
   ────────────────────────────────────────────────────────────────────────── */
export function CtaField({
    label,
    text,
    action,
    onTextChange,
    onActionChange,
    textPlaceholder,
}: {
    label: string;
    text: string;
    action: string;
    onTextChange: (v: string) => void;
    onActionChange: (v: string) => void;
    textPlaceholder?: string;
}) {
    return (
        <div className="rounded-lg border border-[rgba(18,23,23,0.10)] bg-[#fafbf7] p-4 space-y-3">
            <FieldLabel>{label}</FieldLabel>
            <TextInput
                label="Button text"
                value={text}
                onChange={onTextChange}
                placeholder={textPlaceholder}
            />
            <TextInput
                label="Destination (URL or anchor)"
                value={action}
                onChange={onActionChange}
                placeholder="/about or https://… or #section"
            />
            {action && (
                <p className="inline-flex items-center gap-1.5 text-[11px] font-medium text-brand-green bg-brand-green/10 border border-brand-green/30 px-2 py-1 rounded-full">
                    Links to {action}
                </p>
            )}
        </div>
    );
}

/* ──────────────────────────────────────────────────────────────────────────
   SectionTitleHeader — inline-renamable section heading
   ────────────────────────────────────────────────────────────────────────── */
export function SectionTitleHeader({
    title,
    isEditing,
    editValue,
    onEdit,
    onSave,
    onCancel,
    onEditValueChange,
}: {
    title: string;
    isEditing?: boolean;
    editValue?: string;
    onEdit?: () => void;
    onSave?: () => void;
    onCancel?: () => void;
    onEditValueChange?: (v: string) => void;
}) {
    const inputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            e.preventDefault();
            onSave?.();
        } else if (e.key === "Escape") {
            e.preventDefault();
            onCancel?.();
        }
    };

    if (isEditing) {
        return (
            <div className="flex items-center gap-2">
                <input
                    ref={inputRef}
                    value={editValue ?? ""}
                    onChange={(e) => onEditValueChange?.(e.target.value)}
                    onKeyDown={handleKey}
                    className={`${inputClass} flex-1`}
                />
                <button
                    type="button"
                    onClick={onSave}
                    aria-label="Save title"
                    className="flex items-center justify-center w-9 h-9 rounded-lg bg-brand-green text-white hover:bg-brand-green/90 transition-colors"
                >
                    <Check className="w-4 h-4" />
                </button>
                <button
                    type="button"
                    onClick={onCancel}
                    aria-label="Cancel"
                    className="flex items-center justify-center w-9 h-9 rounded-lg border border-[rgba(18,23,23,0.10)] bg-white text-brand-black/70 hover:bg-[#f5f5f3] transition-colors"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-brand-black tracking-tight">
                {title}
            </h2>
            {onEdit && (
                <button
                    type="button"
                    onClick={onEdit}
                    title="Rename section"
                    aria-label="Rename section"
                    className="flex items-center justify-center w-7 h-7 rounded-md text-brand-black/40 hover:text-brand-green hover:bg-brand-green/10 transition-colors"
                >
                    <Pencil className="w-3.5 h-3.5" />
                </button>
            )}
        </div>
    );
}

/* ──────────────────────────────────────────────────────────────────────────
   TabPills — sub-section navigation inside an edit page
   ────────────────────────────────────────────────────────────────────────── */
export function TabPills<T extends string>({
    tabs,
    active,
    onChange,
}: {
    tabs: { value: T; label: string }[];
    active: T;
    onChange: (v: T) => void;
}) {
    return (
        <div className="rounded-xl border border-[rgba(18,23,23,0.10)] bg-white p-1.5">
            <div className="flex flex-wrap gap-1">
                {tabs.map((tab) => {
                    const isActive = active === tab.value;
                    return (
                        <button
                            key={tab.value}
                            type="button"
                            onClick={() => onChange(tab.value)}
                            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                                isActive
                                    ? "bg-brand-green text-white shadow-sm"
                                    : "bg-brand-black/[0.06] text-brand-black/65 hover:bg-brand-green/10 hover:text-brand-black"
                            }`}
                        >
                            {tab.label}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

/* ──────────────────────────────────────────────────────────────────────────
   SectionSidebar — vertical alternative to TabPills.

   Renders a sticky sidebar listing sections in a single column. Each item
   is a button row showing:
     - optional drag handle (left, only if `onReorder` is provided)
     - section label
     - optional visibility eye icon (right, only if `visibility` map provided)

   Drag-and-drop reordering uses @dnd-kit. The `onReorder` callback receives
   the newly ordered array of section values — caller persists it and the
   public template iterates the array to render sections in that order.

   The eye icon toggles `visibility[value]` via `onVisibilityChange`. A
   crossed-out eye + dimmed row indicates the section is hidden on the
   live site, so admins see at a glance which sections are off.
   ────────────────────────────────────────────────────────────────────────── */
export function SectionSidebar<T extends string>({
    tabs,
    active,
    onChange,
    onReorder,
    visibility,
    onVisibilityChange,
    title = "Sections",
}: {
    tabs: { value: T; label: string }[];
    active: T;
    onChange: (v: T) => void;
    /** Provide to enable drag-and-drop reorder of the tabs. */
    onReorder?: (next: T[]) => void;
    /** Map of section value → whether it's visible on the live site. */
    visibility?: Record<string, boolean>;
    /** Called when an admin clicks the eye icon. */
    onVisibilityChange?: (value: T, visible: boolean) => void;
    title?: string;
}) {
    return (
        <nav
            aria-label={title}
            className="rounded-xl border border-[rgba(18,23,23,0.10)] bg-white p-2"
        >
            <div className="px-3 pt-2 pb-3">
                <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-black/55">
                    {title}
                </span>
            </div>
            {onReorder ? (
                <SortableSidebarList
                    tabs={tabs}
                    active={active}
                    onChange={onChange}
                    onReorder={onReorder}
                    visibility={visibility}
                    onVisibilityChange={onVisibilityChange}
                />
            ) : (
                <div className="flex flex-col gap-1">
                    {tabs.map((tab) => (
                        <PlainSidebarItem
                            key={tab.value}
                            tab={tab}
                            isActive={active === tab.value}
                            isVisible={
                                visibility
                                    ? visibility[tab.value] !== false
                                    : undefined
                            }
                            onActivate={() => onChange(tab.value)}
                            onToggleVisibility={
                                onVisibilityChange
                                    ? () =>
                                          onVisibilityChange(
                                              tab.value,
                                              !(
                                                  visibility?.[tab.value] !==
                                                  false
                                              ),
                                          )
                                    : undefined
                            }
                        />
                    ))}
                </div>
            )}
        </nav>
    );
}

/* DnD-enabled list — separate component so hooks aren't conditional. */
function SortableSidebarList<T extends string>({
    tabs,
    active,
    onChange,
    onReorder,
    visibility,
    onVisibilityChange,
}: {
    tabs: { value: T; label: string }[];
    active: T;
    onChange: (v: T) => void;
    onReorder: (next: T[]) => void;
    visibility?: Record<string, boolean>;
    onVisibilityChange?: (value: T, visible: boolean) => void;
}) {
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        }),
    );

    function handleDragEnd(event: DragEndEvent) {
        const { active: a, over } = event;
        if (!over || a.id === over.id) return;
        const oldIndex = tabs.findIndex((t) => t.value === a.id);
        const newIndex = tabs.findIndex((t) => t.value === over.id);
        if (oldIndex < 0 || newIndex < 0) return;
        onReorder(arrayMove(tabs, oldIndex, newIndex).map((t) => t.value));
    }

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
        >
            <SortableContext
                items={tabs.map((t) => t.value)}
                strategy={verticalListSortingStrategy}
            >
                <div className="flex flex-col gap-1">
                    {tabs.map((tab) => (
                        <SortableSidebarItem
                            key={tab.value}
                            tab={tab}
                            isActive={active === tab.value}
                            isVisible={
                                visibility
                                    ? visibility[tab.value] !== false
                                    : undefined
                            }
                            onActivate={() => onChange(tab.value)}
                            onToggleVisibility={
                                onVisibilityChange
                                    ? () =>
                                          onVisibilityChange(
                                              tab.value,
                                              !(
                                                  visibility?.[tab.value] !==
                                                  false
                                              ),
                                          )
                                    : undefined
                            }
                        />
                    ))}
                </div>
            </SortableContext>
        </DndContext>
    );
}

interface SidebarItemBaseProps<T extends string> {
    tab: { value: T; label: string };
    isActive: boolean;
    isVisible?: boolean;
    onActivate: () => void;
    onToggleVisibility?: () => void;
}

/* Sortable row — useSortable always runs when this component renders. */
function SortableSidebarItem<T extends string>(props: SidebarItemBaseProps<T>) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: props.tab.value });

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
                <button
                    type="button"
                    aria-label="Drag to reorder"
                    className="px-1.5 cursor-grab active:cursor-grabbing flex items-center text-brand-black/40 hover:text-brand-black/80 touch-none"
                    {...attributes}
                    {...listeners}
                >
                    <SidebarGripIcon />
                </button>
            }
        />
    );
}

/* Non-DnD row — same look, no drag handle. */
function PlainSidebarItem<T extends string>(props: SidebarItemBaseProps<T>) {
    return <SidebarRow {...props} />;
}

/* Shared row layout — used by both DnD and plain variants. */
function SidebarRow<T extends string>({
    tab,
    isActive,
    isVisible,
    onActivate,
    onToggleVisibility,
    innerRef,
    style,
    isDragging,
    dragHandle,
}: SidebarItemBaseProps<T> & {
    innerRef?: (node: HTMLElement | null) => void;
    style?: React.CSSProperties;
    isDragging?: boolean;
    dragHandle?: ReactNode;
}) {
    const isHidden = isVisible === false;
    return (
        <div
            ref={innerRef}
            style={style}
            className={`flex items-stretch rounded-lg transition-colors ${
                isActive
                    ? "bg-brand-green text-white shadow-sm"
                    : "bg-brand-black/[0.04] text-brand-black/70 hover:bg-brand-black/[0.07]"
            } ${isDragging ? "opacity-60 shadow-lg" : ""}`}
        >
            {dragHandle}
            <button
                type="button"
                onClick={onActivate}
                className={`flex-1 text-left px-3 py-2 text-xs font-medium ${
                    isHidden ? "opacity-50 line-through decoration-1" : ""
                } ${dragHandle ? "" : "pl-3"}`}
            >
                {tab.label}
            </button>
            {onToggleVisibility && (
                <button
                    type="button"
                    aria-label={
                        isHidden
                            ? "Show section on live site"
                            : "Hide section on live site"
                    }
                    aria-pressed={!isHidden}
                    onClick={(e) => {
                        e.stopPropagation();
                        onToggleVisibility();
                    }}
                    className={`px-2 flex items-center ${
                        isActive
                            ? "text-brand-black/70 hover:text-brand-black"
                            : "text-brand-black/40 hover:text-brand-black/80"
                    }`}
                >
                    {isHidden ? <SidebarEyeOffIcon /> : <SidebarEyeIcon />}
                </button>
            )}
        </div>
    );
}

/* Inline icons — kept here so admin files don't need extra lucide imports. */
function SidebarGripIcon() {
    return (
        <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden
        >
            <circle cx="9" cy="6" r="1.5" />
            <circle cx="9" cy="12" r="1.5" />
            <circle cx="9" cy="18" r="1.5" />
            <circle cx="15" cy="6" r="1.5" />
            <circle cx="15" cy="12" r="1.5" />
            <circle cx="15" cy="18" r="1.5" />
        </svg>
    );
}
function SidebarEyeIcon() {
    return (
        <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
        >
            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
            <circle cx="12" cy="12" r="3" />
        </svg>
    );
}
function SidebarEyeOffIcon() {
    return (
        <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
        >
            <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
            <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
            <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
            <line x1="2" x2="22" y1="2" y2="22" />
        </svg>
    );
}

/* ──────────────────────────────────────────────────────────────────────────
   PageMetaPanel — URL + SEO metadata panel for the sidebar slot.

   Sits underneath the SectionSidebar in admin editors. Shows the page URL
   (editable when `onUrlChange` is provided, otherwise a read-only chip)
   plus Meta Title and Meta Description — these map to the `pages.title` /
   `pages.description` columns that `generateMetadata` already returns, so
   editing them controls the live page's SEO without needing a separate
   /admin/seo page.
   ────────────────────────────────────────────────────────────────────────── */
export function PageMetaPanel({
    url,
    onUrlChange,
    urlLockedReason,
    metaTitle,
    onMetaTitleChange,
    metaDescription,
    onMetaDescriptionChange,
}: {
    /** Path part starting with "/" — e.g. "/about", "/corporate-yoga", "/". */
    url: string;
    /** When provided, the URL becomes editable. Caller is responsible for
        validating + persisting the new slug (e.g. via a rename action). */
    onUrlChange?: (next: string) => void;
    /** Optional helper text shown when URL is read-only — explains why. */
    urlLockedReason?: string;
    metaTitle: string;
    onMetaTitleChange: (v: string) => void;
    metaDescription: string;
    onMetaDescriptionChange: (v: string) => void;
}) {
    return (
        <div className="rounded-xl border border-[rgba(18,23,23,0.10)] bg-white p-3 space-y-3">
            <div className="px-1">
                <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-black/55">
                    Page Meta
                </span>
            </div>

            {/* URL */}
            <div>
                <FieldLabel>URL Path</FieldLabel>
                {onUrlChange ? (
                    <input
                        type="text"
                        value={url}
                        onChange={(e) => onUrlChange(e.target.value)}
                        className={`${inputClass} font-mono text-[12px]`}
                        spellCheck={false}
                    />
                ) : (
                    <div className="space-y-1.5">
                        <code className="block font-mono text-[11px] bg-brand-cream/50 border border-[rgba(18,23,23,0.10)] px-2 py-1.5 rounded text-brand-black break-all">
                            {url}
                        </code>
                        {urlLockedReason && (
                            <p className="text-[10px] text-brand-black/45 leading-relaxed">
                                {urlLockedReason}
                            </p>
                        )}
                    </div>
                )}
            </div>

            {/* Meta Title */}
            <div>
                <FieldLabel
                    hint={
                        <span className="tabular-nums">
                            {metaTitle.length}/60
                        </span>
                    }
                >
                    Meta Title
                </FieldLabel>
                <input
                    type="text"
                    value={metaTitle}
                    onChange={(e) => onMetaTitleChange(e.target.value)}
                    className={`${inputClass} text-[12px]`}
                    placeholder="Browser tab + search result title"
                />
            </div>

            {/* Meta Description */}
            <div>
                <FieldLabel
                    hint={
                        <span className="tabular-nums">
                            {metaDescription.length}/160
                        </span>
                    }
                >
                    Meta Description
                </FieldLabel>
                <textarea
                    value={metaDescription}
                    onChange={(e) => onMetaDescriptionChange(e.target.value)}
                    rows={3}
                    placeholder="Search result snippet — ~155 chars."
                    className={`${inputClass} resize-none text-[12px] leading-relaxed`}
                />
            </div>
        </div>
    );
}

/* ──────────────────────────────────────────────────────────────────────────
   SubtleButton — inline secondary action
   ────────────────────────────────────────────────────────────────────────── */
export function SubtleButton({
    variant = "default",
    onClick,
    children,
    type = "button",
    disabled,
    title,
}: {
    variant?: "default" | "primary" | "danger" | "ghost";
    onClick?: () => void;
    children: ReactNode;
    type?: "button" | "submit";
    disabled?: boolean;
    title?: string;
}) {
    const styles = {
        default:
            "border border-[rgba(18,23,23,0.12)] bg-white text-brand-black/75 hover:bg-[#f5f5f3] hover:text-brand-black",
        primary:
            "border border-brand-green/40 bg-brand-green/15 text-brand-black hover:bg-brand-green/25",
        danger: "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100",
        ghost: "border border-transparent text-brand-black/50 hover:text-brand-black hover:bg-[#f5f5f3]",
    } as const;

    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled}
            title={title}
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${styles[variant]}`}
        >
            {children}
        </button>
    );
}

/* ──────────────────────────────────────────────────────────────────────────
   ListItemCard — generic container for a single editable row in a list
   ────────────────────────────────────────────────────────────────────────── */
export function ListItemCard({
    title,
    onRemove,
    removeLabel = "Remove",
    children,
}: {
    title?: string;
    onRemove?: () => void;
    removeLabel?: string;
    children: ReactNode;
}) {
    return (
        <div className="rounded-lg border border-[rgba(18,23,23,0.10)] bg-[#fafbf7] p-4 space-y-3">
            {(title || onRemove) && (
                <div className="flex items-center justify-between gap-2">
                    {title && (
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-black/55">
                            {title}
                        </p>
                    )}
                    {onRemove && (
                        <SubtleButton variant="danger" onClick={onRemove}>
                            <Trash2 className="w-3 h-3" />
                            {removeLabel}
                        </SubtleButton>
                    )}
                </div>
            )}
            <div className="space-y-3">{children}</div>
        </div>
    );
}

/* ──────────────────────────────────────────────────────────────────────────
   AddItemButton — consistent "Add X" button
   ────────────────────────────────────────────────────────────────────────── */
export function AddItemButton({
    onClick,
    children,
}: {
    onClick: () => void;
    children: ReactNode;
}) {
    return (
        <SubtleButton variant="primary" onClick={onClick}>
            <Plus className="w-3.5 h-3.5" />
            {children}
        </SubtleButton>
    );
}

/* ──────────────────────────────────────────────────────────────────────────
   helpers
   ────────────────────────────────────────────────────────────────────────── */
export const nextId = (items: { id: number }[]) =>
    items?.length ? Math.max(...items.map((i) => i.id)) + 1 : 1;
