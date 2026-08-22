"use client";

import { useId, useRef, useState } from "react";
import {
  Plus,
  Trash2,
  GripVertical,
  ArrowUp,
  ArrowDown,
  Loader2,
  Pencil,
  X,
  Check,
  Images,
  Layers,
} from "lucide-react";
import {
  upsertContentBlock,
  deleteContentBlock,
} from "@/server-actions/pages";
import MediaLibraryModal from "./MediaLibraryModal";
import toast from "react-hot-toast";

const EASE = "ease-brand";

const BLOCK_TYPES = ["heading", "paragraph", "list", "image", "logos", "media_carousel", "collage", "results", "offset_image", "custom"] as const;
type BlockType = (typeof BLOCK_TYPES)[number];

/** Block types whose content is stored as a `{ url, alt }[]` and edited with LogosEditor. */
const IMAGE_LIST_TYPES = ["logos", "media_carousel", "collage", "results", "offset_image"] as const;

/** Image-list types that also carry a per-item body of copy in `text`. */
const withCopy = (t: string | null) => t === "results";
const isImageListType = (t: string | null): boolean =>
  IMAGE_LIST_TYPES.includes(t as (typeof IMAGE_LIST_TYPES)[number]);

const addLabelFor = (t: string | null) =>
  t === "media_carousel"
    ? "Add media"
    : t === "collage" || t === "offset_image"
    ? "Add image"
    : t === "results"
    ? "Add result"
    : "Add logo";

const imageListLabel = (t: string | null) =>
  t === "media_carousel"
    ? "Carousel images with alt text"
    : t === "collage"
    ? "Collage images with alt text — shown as a row (4 across on desktop, 2 on mobile)"
    : t === "results"
    ? "Client results — a circular logo plus the result copy, laid out two across on desktop"
    : t === "offset_image"
    ? "Sits over this page's featured image to form the offset pair on the right. Add one image; the featured image is the other half."
    : "Logo images with alt text";

interface LogoItem { url: string; alt: string; text?: string }

interface Block {
  id: string;
  type: string | null;
  content: unknown;
  sequence: number | null;
}

interface ContentBlocksEditorProps {
  pageId: string;
  initialBlocks: Block[];
}

const ic =
  `w-full rounded-2xl border border-[#EFE6E6] bg-[#FBF8F8] px-4 py-2.5 font-body text-[13px] text-lyp-black outline-none transition-all duration-500 ${EASE} placeholder:text-[#C3B5B5] focus:border-lyp-cherry/30 focus:bg-lyp-white focus:shadow-[0_0_0_4px_rgba(178,38,38,0.07)]`;

const captionClasses =
  "block font-body text-[10px] font-medium uppercase tracking-[0.22em] text-[#A89898]";

const ghostButtonClasses =
  `flex items-center gap-1.5 font-body text-[12.5px] font-medium text-[#8A7A7A] transition-colors duration-500 ${EASE} hover:text-lyp-cherry`;

function contentToString(content: unknown, type?: string | null): string {
  if (isImageListType(type ?? null) && Array.isArray(content)) {
    return (content as LogoItem[]).map((l) => l.text || l.alt || l.url).join(", ");
  }
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.join("\n");
  if (content == null) return "";
  return JSON.stringify(content, null, 2);
}

function stringToContent(type: string | null, raw: string): unknown {
  if (type === "list") return raw.split("\n").filter((l) => l.trim() !== "");
  if (type === "custom") {
    try { return JSON.parse(raw); } catch { return raw; }
  }
  return raw;
}

const typeLabel = (t: string | null) =>
  ({ heading: "Heading", paragraph: "Paragraph", list: "List", image: "Image", logos: "Logos", media_carousel: "Media Carousel", collage: "Image Collage", results: "Client Results", offset_image: "Offset Image", custom: "Custom" }[t ?? ""] ?? t ?? "unknown");

/** Muted tonal pills — saturated Tailwind defaults read cheap next to the brand. */
const typeBadge = (t: string | null) =>
  ({ heading: "bg-[#F1EDF5] text-[#6E5B84]", paragraph: "bg-[#F2EDED] text-[#8A7A7A]", list: "bg-[#EDF1F7] text-[#5B7394]", image: "bg-[#E9F2EC] text-[#4A7A5C]", logos: "bg-[#F7EDF1] text-[#8A5B72]", media_carousel: "bg-[#E7F0F0] text-[#4F7B7B]", collage: "bg-[#F9EFE4] text-[#916338]", results: "bg-[#EBF1E8] text-[#5C7A4A]", offset_image: "bg-[#ECEDF7] text-[#5F5F94]", custom: "bg-[#FBF3E3] text-[#9A7B2E]" }[t ?? ""] ?? "bg-[#F2EDED] text-[#8A7A7A]");

function BlockTextarea({ type, value, onChange }: { type: string; value: string; onChange: (v: string) => void }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className={captionClasses}>
        {type === "list" ? "One item per line" : `${typeLabel(type)} content`}
      </label>
      <textarea id={id} value={value} onChange={(e) => onChange(e.target.value)}
        rows={type === "heading" ? 2 : 5} className={`${ic} mt-2`}
        placeholder={type === "custom" ? "JSON or plain text" : `Enter ${type} content...`} />
    </div>
  );
}

function ImageUploadEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [libraryOpen, setLibraryOpen] = useState(false);

  return (
    <div className="space-y-2.5">
      <p className={captionClasses}>Block image</p>
      {value ? (
        <div className="space-y-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="Block image" className="max-h-48 w-auto max-w-xs rounded-xl object-contain" />
          <div className="flex items-center gap-4">
            <button onClick={() => setLibraryOpen(true)} className={ghostButtonClasses}>
              <Images strokeWidth={1.5} className="h-4 w-4" /> Replace
            </button>
            <button
              onClick={() => onChange("")}
              className={`flex items-center gap-1.5 font-body text-[12.5px] font-medium text-[#A89898] transition-colors duration-500 ${EASE} hover:text-lyp-cherry`}
            >
              <Trash2 strokeWidth={1.5} className="h-4 w-4" /> Remove
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setLibraryOpen(true)}
          className={`flex h-32 w-full max-w-xs flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#EFE6E6] bg-[#FBF8F8] text-[#A89898] transition-all duration-500 ${EASE} hover:border-lyp-cherry/30 hover:text-lyp-cherry`}>
          <Images strokeWidth={1.25} className="h-6 w-6" />
          <span className="font-body text-[13px]">Choose from library</span>
        </button>
      )}

      <MediaLibraryModal
        open={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        onSelect={onChange}
        title="Block Image"
      />
    </div>
  );
}

function TypeSelect({ value, onChange }: { value: BlockType; onChange: (v: BlockType) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as BlockType)}
      aria-label="Block type"
      className={ic + " w-44"}
    >
      {BLOCK_TYPES.map((t) => <option key={t} value={t}>{typeLabel(t)}</option>)}
    </select>
  );
}
/**
 * Editor for every `{ url, alt }[]` block type.
 *
 * `showText` adds a per-row multi-line field for the `text` property, which is
 * what the `results` block stores alongside each client logo. Every other
 * image-list type leaves `text` untouched.
 */
function LogosEditor({ logos, onChange, addLabel = "Add logo", label = "Logo images with alt text", showText = false }: { logos: LogoItem[]; onChange: (v: LogoItem[]) => void; addLabel?: string; label?: string; showText?: boolean }) {
  // null = closed. A number replaces that row's image; "add" appends a new
  // row per image chosen, so several can be added in one visit.
  const [library, setLibrary] = useState<number | "add" | null>(null);

  // The modal fires onSelect once per image. Appending from a ref rather than
  // from `logos` avoids each call overwriting the previous one's result, since
  // the prop has not re-rendered yet between calls.
  const pendingRef = useRef<LogoItem[] | null>(null);

  const handlePick = (url: string) => {
    if (library === "add") {
      const base = pendingRef.current ?? logos;
      const next = [...base, showText ? { url, alt: "", text: "" } : { url, alt: "" }];
      pendingRef.current = next;
      onChange(next);
      return;
    }
    if (library === null) return;
    const updated = [...logos];
    updated[library] = { ...updated[library], url };
    onChange(updated);
  };

  const addRow = () => onChange([...logos, showText ? { url: "", alt: "", text: "" } : { url: "", alt: "" }]);
  const removeRow = (i: number) => onChange(logos.filter((_, j) => j !== i));
  const updateField = (i: number, field: "alt" | "text", value: string) => {
    const updated = [...logos];
    updated[i] = { ...updated[i], [field]: value };
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      <p className="font-body text-[12px] leading-relaxed text-[#8A7A7A]">{label}</p>
      {logos.map((logo, i) => (
        <div key={i} className={`flex gap-3 rounded-2xl border border-[#EFE6E6] bg-lyp-white p-2.5 ${showText ? "items-start" : "items-center"}`}>
          {logo.url ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={logo.url}
              alt={logo.alt || "Logo"}
              className={`h-16 w-16 flex-shrink-0 object-contain ${showText ? "rounded-full" : "rounded-lg"}`}
            />
          ) : (
            <button
              onClick={() => setLibrary(i)}
              aria-label={`Choose image for item ${i + 1}`}
              className={`flex h-16 w-16 flex-shrink-0 items-center justify-center border-2 border-dashed border-[#EFE6E6] bg-[#FBF8F8] text-[#C3B5B5] transition-all duration-500 ${EASE} hover:border-lyp-cherry/30 hover:text-lyp-cherry ${showText ? "rounded-full" : "rounded-lg"}`}
            >
              <Images strokeWidth={1.25} className="h-5 w-5" />
            </button>
          )}
          <div className="min-w-0 flex-1 space-y-1.5">
            <input
              type="text"
              value={logo.alt}
              onChange={(e) => updateField(i, "alt", e.target.value)}
              placeholder="Alt text"
              aria-label={`Alt text for item ${i + 1}`}
              className={ic + " px-3 py-2 text-[12px]"}
            />
            {showText && (
              <textarea
                value={logo.text ?? ""}
                onChange={(e) => updateField(i, "text", e.target.value)}
                rows={2}
                placeholder="Result copy — e.g. 40% increase in bookings! The Truffle campaign was sold out within one hour."
                aria-label={`Result copy for item ${i + 1}`}
                className={ic + " px-3 py-2 text-[12px]"}
              />
            )}
            {logo.url && (
              <button
                onClick={() => setLibrary(i)}
                className={`flex items-center gap-1 font-body text-[11px] font-medium text-[#A89898] transition-colors duration-500 ${EASE} hover:text-lyp-cherry`}
              >
                <Images strokeWidth={1.5} className="h-3 w-3" /> Replace
              </button>
            )}
          </div>
          <button
            onClick={() => removeRow(i)}
            className={`flex-shrink-0 rounded-full p-1.5 text-[#A89898] transition-all duration-500 ${EASE} hover:bg-lyp-cherry/[0.06] hover:text-lyp-cherry`}
            title="Remove"
            aria-label={`Remove item ${i + 1}`}
          >
            <Trash2 strokeWidth={1.5} className="h-4 w-4" />
          </button>
        </div>
      ))}
      <MediaLibraryModal
        open={library !== null}
        onClose={() => {
          setLibrary(null);
          pendingRef.current = null;
        }}
        onSelect={handlePick}
        multiple={library === "add"}
        title={library === "add" ? "Add Images" : "Replace Image"}
      />
      <div className="flex flex-wrap items-center gap-4">
        <button
          onClick={() => {
            pendingRef.current = null;
            setLibrary("add");
          }}
          className={`flex items-center gap-1.5 font-body text-[12.5px] font-semibold text-lyp-cherry transition-opacity duration-500 ${EASE} hover:opacity-70`}
        >
          <Images strokeWidth={1.5} className="h-4 w-4" /> Add images from library
        </button>
        <button onClick={addRow} className={ghostButtonClasses}>
          <Plus strokeWidth={1.5} className="h-4 w-4" /> {addLabel}
        </button>
      </div>
    </div>
  );
}


/**
 * Collapsed preview of a block's content.
 *
 * Image blocks show thumbnails: a row of storage URLs is unreadable and tells
 * you nothing about what the block actually contains.
 */
function BlockPreview({ block }: { block: Block }) {
  const type = block.type;

  if (isImageListType(type) && Array.isArray(block.content)) {
    const items = (block.content as LogoItem[]).filter((i) => i?.url);
    if (items.length === 0)
      return <p className="font-body text-[13px] text-[#C3B5B5]">(no images yet)</p>;

    const shown = items.slice(0, 8);
    return (
      <div className="flex flex-wrap items-center gap-2">
        {shown.map((item, i) => (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            key={`${item.url}-${i}`}
            src={item.url}
            alt={item.alt || ""}
            title={item.alt || item.url.split("/").pop()}
            className="h-12 w-auto max-w-[5rem] flex-shrink-0 rounded-lg object-contain"
          />
        ))}
        {items.length > shown.length && (
          <span className="font-body text-[11px] text-[#A89898]">
            +{items.length - shown.length} more
          </span>
        )}
      </div>
    );
  }

  if (type === "image" && typeof block.content === "string" && block.content.trim()) {
    return (
      /* eslint-disable-next-line @next/next/no-img-element */
      <img
        src={block.content}
        alt=""
        className="h-12 w-auto max-w-[5rem] rounded-lg object-contain"
      />
    );
  }

  return (
    <p className="line-clamp-3 whitespace-pre-wrap font-body text-[13px] leading-relaxed text-[#8A7A7A]">
      {contentToString(block.content, block.type) || "(empty)"}
    </p>
  );
}

function BlockRow({ block, idx, total, onEdit, onDelete, onMove }: {
  block: Block; idx: number; total: number;
  onEdit: () => void; onDelete: () => void; onMove: (dir: "up" | "down") => void;
}) {
  const iconButton =
    `rounded-full p-1.5 text-[#A89898] transition-all duration-500 ${EASE} hover:text-lyp-cherry disabled:opacity-30 disabled:hover:text-[#A89898]`;

  return (
    <div className={`group flex items-start gap-3 rounded-2xl border border-[#EFE6E6] bg-lyp-white p-3.5 transition-all duration-500 ${EASE} hover:border-lyp-cherry/20 hover:shadow-[0_12px_28px_-16px_rgba(61,11,17,0.25)]`}>
      <GripVertical strokeWidth={1.5} className="mt-1 h-4 w-4 flex-shrink-0 text-[#C3B5B5]" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <div className="mb-1.5 flex items-center gap-2">
          <span className={`inline-block rounded-full px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] ${typeBadge(block.type)}`}>{typeLabel(block.type)}</span>
          <span className="font-mono text-[11px] tabular-nums text-[#C3B5B5]">#{block.sequence}</span>
        </div>
        <BlockPreview block={block} />
      </div>
      <div className={`flex items-center gap-0.5 opacity-0 transition-opacity duration-500 ${EASE} group-focus-within:opacity-100 group-hover:opacity-100`}>
        <button onClick={() => onMove("up")} disabled={idx === 0} className={iconButton} title="Move up" aria-label="Move block up"><ArrowUp strokeWidth={1.5} className="h-4 w-4" /></button>
        <button onClick={() => onMove("down")} disabled={idx === total - 1} className={iconButton} title="Move down" aria-label="Move block down"><ArrowDown strokeWidth={1.5} className="h-4 w-4" /></button>
        <button onClick={onEdit} className={iconButton} title="Edit" aria-label="Edit block"><Pencil strokeWidth={1.5} className="h-4 w-4" /></button>
        <button onClick={onDelete} className={iconButton} title="Delete" aria-label="Delete block"><Trash2 strokeWidth={1.5} className="h-4 w-4" /></button>
      </div>
    </div>
  );
}



export function ContentBlocksEditor({ pageId, initialBlocks }: ContentBlocksEditorProps) {
  const [blocks, setBlocks] = useState<Block[]>(initialBlocks);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editType, setEditType] = useState<BlockType>("paragraph");
  const [editContent, setEditContent] = useState("");
  const [editLogos, setEditLogos] = useState<LogoItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [addingNew, setAddingNew] = useState(false);
  const [newType, setNewType] = useState<BlockType>("paragraph");
  const [newContent, setNewContent] = useState("");
  const [newLogos, setNewLogos] = useState<LogoItem[]>([]);

  const getEditContent = (type: BlockType) =>
    isImageListType(type) ? editLogos : stringToContent(type, editContent);

  const getNewContent = (type: BlockType) =>
    isImageListType(type) ? newLogos : stringToContent(type, newContent);

  const startEdit = (block: Block) => {
    setEditingId(block.id);
    const t = (block.type ?? "paragraph") as BlockType;
    setEditType(t);
    if (isImageListType(t) && Array.isArray(block.content)) {
      setEditLogos(block.content as LogoItem[]);
    } else {
      setEditLogos([]);
      setEditContent(contentToString(block.content, block.type));
    }
  };

  const handleSave = async (blockId: string) => {
    setSaving(true);
    const existing = blocks.find((b) => b.id === blockId);
    const res = await upsertContentBlock({
      id: blockId, page_id: pageId, type: editType,
      content: getEditContent(editType),
      sequence: existing?.sequence ?? 0,
    });
    setSaving(false);
    if (res.error) { toast.error(res.error); return; }
    if (res.data) {
      toast.success("Block updated");
      setBlocks((prev) => prev.map((b) => (b.id === blockId ? { ...b, ...res.data } : b)));
      setEditingId(null);
    }
  };

  const handleAdd = async () => {
    setSaving(true);
    const nextSeq = blocks.length > 0 ? Math.max(...blocks.map((b) => b.sequence ?? 0)) + 1 : 0;
    const res = await upsertContentBlock({
      page_id: pageId, type: newType,
      content: getNewContent(newType), sequence: nextSeq,
    });
    setSaving(false);
    if (res.error) { toast.error(res.error); return; }
    if (res.data) {
      toast.success("Block added");
      setBlocks((prev) => [...prev, res.data as Block]);
      setNewContent(""); setNewLogos([]); setAddingNew(false);
    }
  };

  const handleDelete = async (blockId: string) => {
    if (!confirm("Delete this content block?")) return;
    const res = await deleteContentBlock(blockId, pageId);
    if (res.error) toast.error(res.error);
    else { toast.success("Block deleted"); setBlocks((prev) => prev.filter((b) => b.id !== blockId)); }
  };

  const handleMove = async (blockId: string, dir: "up" | "down") => {
    const idx = blocks.findIndex((b) => b.id === blockId);
    const swap = dir === "up" ? idx - 1 : idx + 1;
    if (swap < 0 || swap >= blocks.length) return;
    const updated = [...blocks];
    [updated[idx], updated[swap]] = [updated[swap], updated[idx]];
    const reseq = updated.map((b, i) => ({ ...b, sequence: i }));
    setBlocks(reseq);
    await Promise.all([
      upsertContentBlock({ id: reseq[idx].id, page_id: pageId, type: reseq[idx].type ?? "paragraph", content: reseq[idx].content, sequence: idx }),
      upsertContentBlock({ id: reseq[swap].id, page_id: pageId, type: reseq[swap].type ?? "paragraph", content: reseq[swap].content, sequence: swap }),
    ]);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-lyp-cherry/[0.06] ring-1 ring-lyp-cherry/10">
            <Layers strokeWidth={1.25} className="h-4 w-4 text-lyp-cherry" />
          </span>
          <h2 className="font-heading text-[16px] font-bold tracking-[-0.02em] text-lyp-black">
            Content Blocks
          </h2>
        </div>
        <button onClick={() => setAddingNew(true)} disabled={addingNew}
          className={`group inline-flex items-center gap-3 rounded-full bg-lyp-cherry py-1.5 pl-6 pr-1.5 font-body text-[13px] font-semibold tracking-wide text-lyp-white shadow-[0_10px_30px_-10px_rgba(178,38,38,0.5)] transition-all duration-500 ${EASE} hover:bg-[#c22e2e] active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none`}>
          Add Block
          <span className={`flex h-8 w-8 items-center justify-center rounded-full bg-lyp-white/15 transition-transform duration-500 ${EASE} group-hover:scale-105`}>
            <Plus strokeWidth={1.5} className="h-4 w-4" />
          </span>
        </button>
      </div>

      {blocks.length === 0 && !addingNew && (
        <div className="px-8 py-10 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-lyp-cherry/[0.05] ring-1 ring-lyp-cherry/10">
            <Layers strokeWidth={1} className="h-6 w-6 text-lyp-cherry/60" />
          </span>
          <p className="mt-5 font-body text-[14px] text-[#8A7A7A]">
            No content blocks yet.
          </p>
          <button
            onClick={() => setAddingNew(true)}
            className={`mt-4 inline-flex items-center gap-2 font-body text-[13px] font-semibold text-lyp-cherry transition-opacity duration-500 ${EASE} hover:opacity-70`}
          >
            <Plus strokeWidth={1.5} className="h-3.5 w-3.5" />
            Add your first block
          </button>
        </div>
      )}

      <div className="space-y-2.5">
        {blocks.map((block, idx) =>
          editingId === block.id ? (
            <div key={block.id} className="space-y-3.5 rounded-2xl border border-lyp-cherry/25 bg-[#FBF8F8] p-4">
              <div className="flex flex-wrap items-center gap-3">
                <TypeSelect value={editType} onChange={setEditType} />
                <span className="font-mono text-[11px] tabular-nums text-[#A89898]">seq: {block.sequence}</span>
              </div>
              {isImageListType(editType)
                ? <LogosEditor logos={editLogos} onChange={setEditLogos} addLabel={addLabelFor(editType)} label={imageListLabel(editType)} showText={withCopy(editType)} />
                : editType === "image"
                ? <ImageUploadEditor value={editContent} onChange={setEditContent} />
                : <BlockTextarea type={editType} value={editContent} onChange={setEditContent} />
              }
              <div className="flex flex-wrap items-center gap-2.5">
                <button onClick={() => handleSave(block.id)} disabled={saving}
                  className={`group inline-flex items-center gap-3 rounded-full bg-lyp-cherry py-1.5 pl-6 pr-1.5 font-body text-[13px] font-semibold tracking-wide text-lyp-white shadow-[0_10px_30px_-10px_rgba(178,38,38,0.5)] transition-all duration-500 ${EASE} hover:bg-[#c22e2e] active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none`}>
                  Save
                  <span className={`flex h-8 w-8 items-center justify-center rounded-full bg-lyp-white/15 transition-transform duration-500 ${EASE} group-hover:scale-105`}>
                    {saving ? <Loader2 strokeWidth={1.5} className="h-4 w-4 animate-spin" /> : <Check strokeWidth={1.5} className="h-4 w-4" />}
                  </span>
                </button>
                <button onClick={() => setEditingId(null)}
                  className={`group inline-flex items-center gap-3 rounded-full border border-[#EFE6E6] bg-lyp-white py-1.5 pl-6 pr-1.5 font-body text-[13px] font-semibold tracking-wide text-lyp-black transition-all duration-500 ${EASE} hover:border-lyp-cherry/25 hover:text-lyp-cherry active:scale-[0.985]`}>
                  Cancel
                  <span className={`flex h-8 w-8 items-center justify-center rounded-full bg-[#F7F1F1] transition-transform duration-500 ${EASE} group-hover:scale-105`}>
                    <X strokeWidth={1.5} className="h-4 w-4" />
                  </span>
                </button>
              </div>
            </div>
          ) : (
            <BlockRow key={block.id} block={block} idx={idx} total={blocks.length}
              onEdit={() => startEdit(block)} onDelete={() => handleDelete(block.id)}
              onMove={(dir) => handleMove(block.id, dir)} />
          )
        )}
      </div>

      {addingNew && (
        <div className="space-y-3.5 rounded-2xl border border-dashed border-lyp-cherry/30 bg-lyp-cherry/[0.04] p-4">
          <div className="flex flex-wrap items-center gap-3">
            <TypeSelect value={newType} onChange={setNewType} />
            <span className="font-body text-[10px] font-medium uppercase tracking-[0.22em] text-lyp-cherry/70">New block</span>
          </div>
          {isImageListType(newType)
            ? <LogosEditor logos={newLogos} onChange={setNewLogos} addLabel={addLabelFor(newType)} label={imageListLabel(newType)} showText={withCopy(newType)} />
            : newType === "image"
            ? <ImageUploadEditor value={newContent} onChange={setNewContent} />
            : <BlockTextarea type={newType} value={newContent} onChange={setNewContent} />
          }
          <div className="flex flex-wrap items-center gap-2.5">
            <button onClick={handleAdd} disabled={saving}
              className={`group inline-flex items-center gap-3 rounded-full bg-lyp-cherry py-1.5 pl-6 pr-1.5 font-body text-[13px] font-semibold tracking-wide text-lyp-white shadow-[0_10px_30px_-10px_rgba(178,38,38,0.5)] transition-all duration-500 ${EASE} hover:bg-[#c22e2e] active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none`}>
              Add
              <span className={`flex h-8 w-8 items-center justify-center rounded-full bg-lyp-white/15 transition-transform duration-500 ${EASE} group-hover:scale-105`}>
                {saving ? <Loader2 strokeWidth={1.5} className="h-4 w-4 animate-spin" /> : <Plus strokeWidth={1.5} className="h-4 w-4" />}
              </span>
            </button>
            <button onClick={() => { setAddingNew(false); setNewContent(""); setNewLogos([]); }}
              className={`group inline-flex items-center gap-3 rounded-full border border-[#EFE6E6] bg-lyp-white py-1.5 pl-6 pr-1.5 font-body text-[13px] font-semibold tracking-wide text-lyp-black transition-all duration-500 ${EASE} hover:border-lyp-cherry/25 hover:text-lyp-cherry active:scale-[0.985]`}>
              Cancel
              <span className={`flex h-8 w-8 items-center justify-center rounded-full bg-[#F7F1F1] transition-transform duration-500 ${EASE} group-hover:scale-105`}>
                <X strokeWidth={1.5} className="h-4 w-4" />
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
