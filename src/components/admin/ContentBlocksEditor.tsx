"use client";

import { useState, useRef } from "react";
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
  Upload,
} from "lucide-react";
import {
  upsertContentBlock,
  deleteContentBlock,
} from "@/server-actions/pages";
import { uploadImage } from "@/utils/storage";
import toast from "react-hot-toast";

const BLOCK_TYPES = ["heading", "paragraph", "list", "image", "logos", "media_carousel", "custom"] as const;
type BlockType = (typeof BLOCK_TYPES)[number];

interface LogoItem { url: string; alt: string }

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
  if (type === "logos" && Array.isArray(content)) {
    return (content as LogoItem[]).map((l) => l.alt || l.url).join(", ");
  }
  if (type === "media_carousel" && Array.isArray(content)) {
    return (content as LogoItem[]).map((l) => l.alt || l.url).join(", ");
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
  ({ heading: "Heading", paragraph: "Paragraph", list: "List", image: "Image", logos: "Logos", media_carousel: "Media Carousel", custom: "Custom" }[t ?? ""] ?? t ?? "unknown");

const typeBadge = (t: string | null) =>
  ({ heading: "bg-purple-100 text-purple-700", paragraph: "bg-gray-100 text-gray-700", list: "bg-blue-100 text-blue-700", image: "bg-green-100 text-green-700", logos: "bg-pink-100 text-pink-700", media_carousel: "bg-teal-100 text-teal-700", custom: "bg-yellow-100 text-yellow-700" }[t ?? ""] ?? "bg-gray-100 text-gray-700");

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
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const result = await uploadImage(file);
    setUploading(false);
    if (result.error) { toast.error(result.error.message); return; }
    onChange(result.url);
  };

  return (
    <div className="space-y-2">
      <label className="block text-xs text-gray-500 font-body">Block image</label>
      {value ? (
        <div className="space-y-2">
          <div className="w-full max-w-xs rounded-lg border border-gray-200 overflow-hidden bg-gray-50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt="Block image" className="w-full h-auto object-contain max-h-48" />
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => fileRef.current?.click()} disabled={uploading}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-lyp-cherry font-body">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Replace
            </button>
            <button onClick={() => onChange("")}
              className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-red-600 font-body">
              <Trash2 className="h-4 w-4" /> Remove
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => fileRef.current?.click()} disabled={uploading}
          className="w-full max-w-xs h-32 rounded-lg border-2 border-dashed border-gray-300 hover:border-lyp-cherry/50 flex flex-col items-center justify-center gap-2 text-gray-400 transition-colors">
          {uploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Upload className="h-6 w-6" />}
          <span className="text-sm font-body">{uploading ? "Uploading…" : "Upload image"}</span>
        </button>
      )}
      <input ref={fileRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => { handleUpload(e); if (fileRef.current) fileRef.current.value = ""; }} />
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
function LogosEditor({ logos, onChange, addLabel = "Add logo" }: { logos: LogoItem[]; onChange: (v: LogoItem[]) => void; addLabel?: string }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, idx: number) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingIdx(idx);
    const result = await uploadImage(file);
    setUploadingIdx(null);
    if (result.error) { toast.error(result.error.message); return; }
    const updated = [...logos];
    updated[idx] = { ...updated[idx], url: result.url };
    onChange(updated);
  };

  const addRow = () => onChange([...logos, { url: "", alt: "" }]);
  const removeRow = (i: number) => onChange(logos.filter((_, j) => j !== i));
  const updateAlt = (i: number, alt: string) => {
    const updated = [...logos];
    updated[i] = { ...updated[i], alt };
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      <label className="block text-xs text-gray-500 font-body">Logo images with alt text</label>
      {logos.map((logo, i) => (
        <div key={i} className="flex items-center gap-3 p-2 border border-gray-200 rounded-lg bg-white">
          {logo.url ? (
            <div className="w-16 h-16 rounded border border-gray-200 overflow-hidden bg-gray-50 flex-shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logo.url} alt={logo.alt || "Logo"} className="w-full h-full object-contain" />
            </div>
          ) : (
            <button
              onClick={() => { fileRef.current?.setAttribute("data-idx", String(i)); fileRef.current?.click(); }}
              disabled={uploadingIdx === i}
              className="w-16 h-16 rounded border-2 border-dashed border-gray-300 hover:border-lyp-cherry/50 flex items-center justify-center text-gray-400 flex-shrink-0"
            >
              {uploadingIdx === i ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
            </button>
          )}
          <div className="flex-1 min-w-0 space-y-1">
            <input
              type="text"
              value={logo.alt}
              onChange={(e) => updateAlt(i, e.target.value)}
              placeholder="Alt text"
              className={ic + " text-xs"}
            />
            {logo.url && (
              <button
                onClick={() => { fileRef.current?.setAttribute("data-idx", String(i)); fileRef.current?.click(); }}
                disabled={uploadingIdx === i}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-lyp-cherry font-body"
              >
                {uploadingIdx === i ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />} Replace
              </button>
            )}
          </div>
          <button onClick={() => removeRow(i)} className="p-1 text-gray-400 hover:text-red-600 flex-shrink-0" title="Remove">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const idx = Number(fileRef.current?.getAttribute("data-idx") ?? 0);
          handleUpload(e, idx);
          if (fileRef.current) fileRef.current.value = "";
        }}
      />
      <button onClick={addRow} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-lyp-cherry font-body">
        <Plus className="h-4 w-4" /> {addLabel}
      </button>
    </div>
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
        <p className="font-body text-sm text-gray-700 whitespace-pre-wrap line-clamp-3">{contentToString(block.content, block.type) || "(empty)"}</p>
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
    type === "logos" || type === "media_carousel" ? editLogos : stringToContent(type, editContent);

  const getNewContent = (type: BlockType) =>
    type === "logos" || type === "media_carousel" ? newLogos : stringToContent(type, newContent);

  const startEdit = (block: Block) => {
    setEditingId(block.id);
    const t = (block.type ?? "paragraph") as BlockType;
    setEditType(t);
    if ((t === "logos" || t === "media_carousel") && Array.isArray(block.content)) {
      setEditLogos(block.content as LogoItem[]);
    } else {
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
              {editType === "logos" || editType === "media_carousel"
                ? <LogosEditor logos={editLogos} onChange={setEditLogos} addLabel={editType === "media_carousel" ? "Add media" : "Add logo"} />
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
          {newType === "logos" || newType === "media_carousel"
            ? <LogosEditor logos={newLogos} onChange={setNewLogos} addLabel={newType === "media_carousel" ? "Add media" : "Add logo"} />
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

