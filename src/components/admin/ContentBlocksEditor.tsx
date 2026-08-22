"use client";

import { useRef, useState } from "react";
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
} from "lucide-react";
import {
  upsertContentBlock,
  deleteContentBlock,
} from "@/server-actions/pages";
import MediaLibraryModal from "./MediaLibraryModal";
import toast from "react-hot-toast";

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
  "w-full border border-gray-300 rounded-md px-3 py-2 font-body text-sm text-lyp-black focus:outline-none focus:ring-2 focus:ring-lyp-cherry/30 focus:border-lyp-cherry";

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

const typeBadge = (t: string | null) =>
  ({ heading: "bg-purple-100 text-purple-700", paragraph: "bg-gray-100 text-gray-700", list: "bg-blue-100 text-blue-700", image: "bg-green-100 text-green-700", logos: "bg-pink-100 text-pink-700", media_carousel: "bg-teal-100 text-teal-700", collage: "bg-orange-100 text-orange-700", results: "bg-emerald-100 text-emerald-700", offset_image: "bg-indigo-100 text-indigo-700", custom: "bg-yellow-100 text-yellow-700" }[t ?? ""] ?? "bg-gray-100 text-gray-700");

function BlockTextarea({ type, value, onChange }: { type: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      {type === "list" && <label className="block text-xs text-gray-500 mb-1 font-body">One item per line</label>}
      <textarea value={value} onChange={(e) => onChange(e.target.value)}
        rows={type === "heading" ? 2 : 5} className={ic}
        placeholder={type === "custom" ? "JSON or plain text" : `Enter ${type} content...`} />
    </div>
  );
}

function ImageUploadEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [libraryOpen, setLibraryOpen] = useState(false);

  return (
    <div className="space-y-2">
      <label className="block text-xs text-gray-500 font-body">Block image</label>
      {value ? (
        <div className="space-y-2">
          <div className="w-full max-w-xs rounded-lg overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt="Block image" className="w-full h-auto object-contain max-h-48" />
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setLibraryOpen(true)}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-lyp-cherry font-body">
              <Images className="h-4 w-4" /> Replace
            </button>
            <button onClick={() => onChange("")}
              className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-red-600 font-body">
              <Trash2 className="h-4 w-4" /> Remove
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setLibraryOpen(true)}
          className="w-full max-w-xs h-32 rounded-lg border-2 border-dashed border-gray-300 hover:border-lyp-cherry/50 flex flex-col items-center justify-center gap-2 text-gray-400 transition-colors">
          <Images className="h-6 w-6" />
          <span className="text-sm font-body">Choose from library</span>
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
    <select value={value} onChange={(e) => onChange(e.target.value as BlockType)} className={ic + " w-40"}>
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
      <label className="block text-xs text-gray-500 font-body">{label}</label>
      {logos.map((logo, i) => (
        <div key={i} className={`flex gap-3 p-2 border border-gray-200 rounded-lg bg-white ${showText ? "items-start" : "items-center"}`}>
          {logo.url ? (
            <div className={`w-16 h-16 overflow-hidden flex-shrink-0 ${showText ? "rounded-full" : "rounded"}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logo.url} alt={logo.alt || "Logo"} className="w-full h-full object-contain" />
            </div>
          ) : (
            <button
              onClick={() => setLibrary(i)}
              className={`w-16 h-16 border-2 border-dashed border-gray-300 hover:border-lyp-cherry/50 flex items-center justify-center text-gray-400 flex-shrink-0 ${showText ? "rounded-full" : "rounded"}`}
            >
              <Images className="h-5 w-5" />
            </button>
          )}
          <div className="flex-1 min-w-0 space-y-1">
            <input
              type="text"
              value={logo.alt}
              onChange={(e) => updateField(i, "alt", e.target.value)}
              placeholder="Alt text"
              className={ic + " text-xs"}
            />
            {showText && (
              <textarea
                value={logo.text ?? ""}
                onChange={(e) => updateField(i, "text", e.target.value)}
                rows={2}
                placeholder="Result copy — e.g. 40% increase in bookings! The Truffle campaign was sold out within one hour."
                className={ic + " text-xs"}
              />
            )}
            {logo.url && (
              <button
                onClick={() => setLibrary(i)}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-lyp-cherry font-body"
              >
                <Images className="h-3 w-3" /> Replace
              </button>
            )}
          </div>
          <button onClick={() => removeRow(i)} className="p-1 text-gray-400 hover:text-red-600 flex-shrink-0" title="Remove">
            <Trash2 className="h-4 w-4" />
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
          className="flex items-center gap-1.5 text-sm text-lyp-cherry hover:opacity-70 font-body font-semibold"
        >
          <Images className="h-4 w-4" /> Add images from library
        </button>
        <button onClick={addRow} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-lyp-cherry font-body">
          <Plus className="h-4 w-4" /> {addLabel}
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
      return <p className="font-body text-sm text-gray-400">(no images yet)</p>;

    const shown = items.slice(0, 8);
    return (
      <div className="flex flex-wrap items-center gap-2">
        {shown.map((item, i) => (
          <span
            key={`${item.url}-${i}`}
            className="h-12 w-12 overflow-hidden rounded-md flex-shrink-0"
            title={item.alt || item.url.split("/").pop()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.url} alt={item.alt || ""} className="h-full w-full object-contain" />
          </span>
        ))}
        {items.length > shown.length && (
          <span className="font-body text-xs text-gray-400">
            +{items.length - shown.length} more
          </span>
        )}
      </div>
    );
  }

  if (type === "image" && typeof block.content === "string" && block.content.trim()) {
    return (
      <span className="inline-block h-12 w-12 overflow-hidden rounded-md">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={block.content} alt="" className="h-full w-full object-contain" />
      </span>
    );
  }

  return (
    <p className="font-body text-sm text-gray-700 whitespace-pre-wrap line-clamp-3">
      {contentToString(block.content, block.type) || "(empty)"}
    </p>
  );
}

function BlockRow({ block, idx, total, onEdit, onDelete, onMove }: {
  block: Block; idx: number; total: number;
  onEdit: () => void; onDelete: () => void; onMove: (dir: "up" | "down") => void;
}) {
  return (
    <div className="flex items-start gap-3 border border-gray-200 rounded-lg p-3 hover:border-gray-300 transition-colors group">
      <GripVertical className="h-4 w-4 mt-1 text-gray-300" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${typeBadge(block.type)}`}>{typeLabel(block.type)}</span>
          <span className="text-xs text-gray-400 font-mono">#{block.sequence}</span>
        </div>
        <BlockPreview block={block} />
      </div>
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={() => onMove("up")} disabled={idx === 0} className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30" title="Move up"><ArrowUp className="h-4 w-4" /></button>
        <button onClick={() => onMove("down")} disabled={idx === total - 1} className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30" title="Move down"><ArrowDown className="h-4 w-4" /></button>
        <button onClick={onEdit} className="p-1 text-gray-400 hover:text-lyp-cherry" title="Edit"><Pencil className="h-4 w-4" /></button>
        <button onClick={onDelete} className="p-1 text-gray-400 hover:text-red-600" title="Delete"><Trash2 className="h-4 w-4" /></button>
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-lg font-semibold text-lyp-black">Content Blocks</h2>
        <button onClick={() => setAddingNew(true)} disabled={addingNew}
          className="flex items-center gap-1.5 bg-lyp-cherry text-white px-3 py-1.5 rounded-md font-body text-sm hover:bg-lyp-maroon transition-colors disabled:opacity-50">
          <Plus className="h-4 w-4" /> Add Block
        </button>
      </div>

      {blocks.length === 0 && !addingNew && (
        <p className="text-gray-400 font-body text-sm py-6 text-center">No content blocks yet.</p>
      )}

      <div className="space-y-2">
        {blocks.map((block, idx) =>
          editingId === block.id ? (
            <div key={block.id} className="border border-lyp-cherry/30 rounded-lg p-4 bg-gray-50 space-y-3">
              <div className="flex items-center gap-3">
                <TypeSelect value={editType} onChange={setEditType} />
                <span className="text-xs text-gray-400 font-mono">seq: {block.sequence}</span>
              </div>
              {isImageListType(editType)
                ? <LogosEditor logos={editLogos} onChange={setEditLogos} addLabel={addLabelFor(editType)} label={imageListLabel(editType)} showText={withCopy(editType)} />
                : editType === "image"
                ? <ImageUploadEditor value={editContent} onChange={setEditContent} />
                : <BlockTextarea type={editType} value={editContent} onChange={setEditContent} />
              }
              <div className="flex items-center gap-2">
                <button onClick={() => handleSave(block.id)} disabled={saving}
                  className="flex items-center gap-1 bg-green-600 text-white px-3 py-1.5 rounded-md font-body text-sm hover:bg-green-700 disabled:opacity-50">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Save
                </button>
                <button onClick={() => setEditingId(null)}
                  className="flex items-center gap-1 text-gray-500 hover:text-gray-700 px-3 py-1.5 font-body text-sm">
                  <X className="h-4 w-4" /> Cancel
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
        <div className="border border-dashed border-lyp-cherry/40 rounded-lg p-4 bg-lyp-cherry/5 space-y-3">
          <div className="flex items-center gap-3">
            <TypeSelect value={newType} onChange={setNewType} />
            <span className="text-xs text-gray-400 font-body">New block</span>
          </div>
          {isImageListType(newType)
            ? <LogosEditor logos={newLogos} onChange={setNewLogos} addLabel={addLabelFor(newType)} label={imageListLabel(newType)} showText={withCopy(newType)} />
            : newType === "image"
            ? <ImageUploadEditor value={newContent} onChange={setNewContent} />
            : <BlockTextarea type={newType} value={newContent} onChange={setNewContent} />
          }
          <div className="flex items-center gap-2">
            <button onClick={handleAdd} disabled={saving}
              className="flex items-center gap-1 bg-lyp-cherry text-white px-3 py-1.5 rounded-md font-body text-sm hover:bg-lyp-maroon disabled:opacity-50">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Add
            </button>
            <button onClick={() => { setAddingNew(false); setNewContent(""); setNewLogos([]); }}
              className="text-gray-500 hover:text-gray-700 px-3 py-1.5 font-body text-sm">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

