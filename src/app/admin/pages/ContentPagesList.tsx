"use client";

import { useTransition, useState, useRef } from "react";
import Link from "next/link";
import { BookOpen, Loader2, Pencil, X, Check, FileEdit, Plus, GripVertical } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import {
  togglePageVisibility,
  updatePage,
  createPage,
  reorderPages,
} from "@/server-actions/pages";
import toast from "react-hot-toast";

const EASE = "ease-brand";

const thClasses =
  "whitespace-nowrap px-4 py-3 text-left font-body text-[9px] font-medium uppercase tracking-[0.2em] text-[#A89898]";

/** Field chrome shared by the inline edit and create rows. */
const ic =
  `w-full rounded-xl border border-[#EFE6E6] bg-[#FBF8F8] px-3 py-2 font-body text-[12.5px] text-lyp-black outline-none transition-all duration-500 ${EASE} placeholder:text-[#C3B5B5] focus:border-lyp-cherry/30 focus:bg-lyp-white focus:shadow-[0_0_0_4px_rgba(178,38,38,0.07)]`;

const switchClasses =
  "data-[state=checked]:bg-lyp-cherry data-[state=unchecked]:bg-[#EFE6E6]";

const typePill = (type: string | null) =>
  type === "service"
    ? "bg-[#EDF1F7] text-[#5B7394]"
    : "bg-[#F2EDED] text-[#8A7A7A]";

interface PageItem {
  id: string;
  title: string | null;
  slug: string | null;
  type: string | null;
  sequence: number;
  visible: boolean | null;
}

interface ContentPagesListProps {
  initialPages: PageItem[];
}

export function ContentPagesList({ initialPages }: ContentPagesListProps) {
  const [pages, setPages] = useState<PageItem[]>(initialPages);
  const [isPending, startTransition] = useTransition();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    title: "",
    slug: "",
    type: "",
    sequence: 0,
  });
  const [saving, setSaving] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [savingOrder, setSavingOrder] = useState(false);

  // dragend fires after several dragover re-renders, so read the live list
  // from a ref rather than a possibly stale closure.
  const pagesRef = useRef(pages);
  pagesRef.current = pages;
  const orderBeforeDrag = useRef<PageItem[] | null>(null);

  const handleDragStart = (id: string) => {
    setDragId(id);
    orderBeforeDrag.current = pagesRef.current;
  };

  const handleDragOver = (e: React.DragEvent, overId: string) => {
    e.preventDefault();
    if (!dragId || dragId === overId) return;
    setPages((prev) => {
      const from = prev.findIndex((p) => p.id === dragId);
      const to = prev.findIndex((p) => p.id === overId);
      if (from === -1 || to === -1 || from === to) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };

  const handleDragEnd = async () => {
    setDragId(null);
    const before = orderBeforeDrag.current;
    orderBeforeDrag.current = null;
    if (!before) return;

    const ids = pagesRef.current.map((p) => p.id);
    if (before.map((p) => p.id).join() === ids.join()) return; // nothing moved

    setSavingOrder(true);
    const res = await reorderPages(ids);
    setSavingOrder(false);

    if (res.error) {
      toast.error(res.error);
      setPages(before); // rollback
      return;
    }
    // Sequence numbers are now positional, so mirror that locally.
    setPages((prev) => prev.map((p, i) => ({ ...p, sequence: i })));
    toast.success("Page order updated");
  };

  const [addingNew, setAddingNew] = useState(false);
  const [newForm, setNewForm] = useState({
    title: "",
    slug: "",
    type: "content",
    sequence: 0,
  });

  const handleToggle = (id: string, currentVisible: boolean | null) => {
    const nextVisible = !currentVisible;
    setLoadingId(id);
    startTransition(async () => {
      // Optimistic update
      setPages((prev) =>
        prev.map((p) => (p.id === id ? { ...p, visible: nextVisible } : p)),
      );

      const res = await togglePageVisibility(id, nextVisible);
      setLoadingId(null);
      if (res.error) {
        toast.error(res.error);
        // Rollback
        setPages((prev) =>
          prev.map((p) =>
            p.id === id ? { ...p, visible: currentVisible } : p,
          ),
        );
      } else {
        toast.success("Page visibility updated");
      }
    });
  };

  const startEdit = (page: PageItem) => {
    setEditingId(page.id);
    setEditForm({
      title: page.title ?? "",
      slug: page.slug ?? "",
      type: page.type ?? "content",
      sequence: page.sequence,
    });
  };

  const cancelEdit = () => setEditingId(null);

  const handleSave = async () => {
    if (!editingId) return;
    setSaving(true);
    const res = await updatePage(editingId, editForm);
    setSaving(false);
    if (res.error) {
      toast.error(res.error);
    } else if (res.data) {
      toast.success("Page updated");
      setPages((prev) =>
        prev.map((p) => (p.id === editingId ? { ...p, ...res.data } : p)),
      );
      setEditingId(null);
    }
  };

  const handleAdd = async () => {
    if (!newForm.title.trim() || !newForm.slug.trim()) {
      toast.error("Title and slug are required");
      return;
    }
    setSaving(true);
    const res = await createPage({
      ...newForm,
      sequence: newForm.sequence || (pages.length > 0 ? Math.max(...pages.map((p) => p.sequence)) + 1 : 0),
    });
    setSaving(false);
    if (res.error) {
      toast.error(res.error);
    } else if (res.data) {
      toast.success("Page created");
      setPages((prev) => [...prev, res.data as PageItem]);
      setNewForm({ title: "", slug: "", type: "content", sequence: 0 });
      setAddingNew(false);
    }
  };

  const startAdd = () => {
    setAddingNew(true);
    const nextSeq = pages.length > 0 ? Math.max(...pages.map((p) => p.sequence)) + 1 : 0;
    setNewForm({ title: "", slug: "", type: "content", sequence: nextSeq });
  };

  if (pages.length === 0 && !addingNew) {
    return (
      <div className="px-8 py-12 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-lyp-cherry/[0.05] ring-1 ring-lyp-cherry/10">
          <BookOpen strokeWidth={1} className="h-6 w-6 text-lyp-cherry/60" />
        </span>
        <p className="mt-5 font-body text-[14px] text-[#8A7A7A]">
          No content pages yet.
        </p>
        <button
          onClick={startAdd}
          className={`mt-4 inline-flex items-center gap-2 font-body text-[13px] font-semibold text-lyp-cherry transition-opacity duration-500 ${EASE} hover:opacity-70`}
        >
          <Plus strokeWidth={1.5} className="h-3.5 w-3.5" />
          Add your first page
        </button>
      </div>
    );
  }

  return (
    <>
    <div className="overflow-x-auto">
    <table className="w-full font-body text-[12.5px]">
      <thead>
        <tr className="border-b border-[#F1E8E8]">
          <th className="w-10 px-2 py-3" aria-label="Reorder" />
          <th className={thClasses}>Title</th>
          <th className={thClasses}>Slug</th>
          <th className={thClasses}>Type</th>
          <th className={thClasses}>Order</th>
          <th className={thClasses}>Visible</th>
          <th className={`${thClasses} text-right`}>Actions</th>
        </tr>
      </thead>
      <tbody>
        {pages.map((page) => {
          if (editingId === page.id) {
            return (
              <tr
                key={page.id}
                className="border-b border-[#F7F1F1] bg-[#FBF8F8] last:border-0"
              >
                <td className="w-10 px-2 py-2" />
                <td className="px-4 py-2">
                  <input
                    className={ic}
                    aria-label="Page title"
                    value={editForm.title}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, title: e.target.value }))
                    }
                  />
                </td>
                <td className="px-4 py-2">
                  <input
                    className={ic + " font-mono text-[11px]"}
                    aria-label="Page slug"
                    value={editForm.slug}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, slug: e.target.value }))
                    }
                  />
                </td>
                <td className="px-4 py-2">
                  <select
                    className={ic}
                    aria-label="Page type"
                    value={editForm.type}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, type: e.target.value }))
                    }
                  >
                    <option value="content">content</option>
                    <option value="service">service</option>
                  </select>
                </td>
                <td className="px-4 py-2">
                  <input
                    className={ic + " w-20 tabular-nums"}
                    aria-label="Page order"
                    type="number"
                    value={editForm.sequence}
                    onChange={(e) =>
                      setEditForm((f) => ({
                        ...f,
                        sequence: Number(e.target.value),
                      }))
                    }
                  />
                </td>
                <td className="px-4 py-3">
                  <Switch
                    checked={!!page.visible}
                    disabled={isPending && loadingId === page.id}
                    onCheckedChange={() => handleToggle(page.id, page.visible)}
                    aria-label={`Toggle visibility for ${page.title ?? "page"}`}
                    className={switchClasses}
                  />
                </td>
                <td className="px-4 py-2 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className={`rounded-full p-1.5 text-lyp-cherry transition-all duration-500 ${EASE} hover:bg-lyp-cherry/[0.06] disabled:opacity-40`}
                      title="Save"
                      aria-label="Save page"
                    >
                      {saving ? (
                        <Loader2 strokeWidth={1.5} className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check strokeWidth={1.5} className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      onClick={cancelEdit}
                      className={`rounded-full p-1.5 text-[#A89898] transition-colors duration-500 ${EASE} hover:text-lyp-black`}
                      title="Cancel"
                      aria-label="Cancel editing"
                    >
                      <X strokeWidth={1.5} className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          }
          return (
            <tr
              key={page.id}
              draggable={!editingId && !savingOrder}
              onDragStart={() => handleDragStart(page.id)}
              onDragOver={(e) => handleDragOver(e, page.id)}
              onDragEnd={handleDragEnd}
              onDrop={(e) => e.preventDefault()}
              className={`border-b border-[#F7F1F1] transition-colors duration-500 last:border-0 ${EASE} ${
                dragId === page.id
                  ? "bg-lyp-cherry/[0.05] opacity-60"
                  : "hover:bg-[#FBF8F8]"
              }`}
            >
              <td className="w-10 px-2 py-3">
                <span
                  className={`flex items-center justify-center text-[#C3B5B5] transition-colors duration-500 ${EASE} ${
                    editingId || savingOrder
                      ? "cursor-not-allowed"
                      : "cursor-grab active:cursor-grabbing hover:text-lyp-cherry"
                  }`}
                  title="Drag to reorder"
                  role="img"
                  aria-label={`Drag to reorder ${page.title ?? "page"}`}
                >
                  <GripVertical strokeWidth={1.5} className="h-4 w-4" />
                </span>
              </td>
              <td className="px-4 py-3">
                <Link
                  href={`/admin/pages/${page.id}`}
                  // Anchors are natively draggable, which would hijack the
                  // row's drag-to-reorder gesture.
                  draggable={false}
                  className={`font-medium text-lyp-black transition-colors duration-500 ${EASE} hover:text-lyp-cherry`}
                  title="Edit page content"
                >
                  {page.title ?? "Untitled"}
                </Link>
              </td>
              <td className="px-4 py-3 font-mono text-[11px] text-[#A89898]">
                {page.slug ?? "—"}
              </td>
              <td className="px-4 py-3">
                <span
                  className={`inline-block rounded-full px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] ${typePill(page.type)}`}
                >
                  {page.type ?? "content"}
                </span>
              </td>
              <td className="px-4 py-3 tabular-nums text-[#A89898]">
                {page.sequence}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={!!page.visible}
                    disabled={isPending && loadingId === page.id}
                    onCheckedChange={() => handleToggle(page.id, page.visible)}
                    aria-label={`Toggle visibility for ${page.title ?? "page"}`}
                    className={switchClasses}
                  />
                  {isPending && loadingId === page.id && (
                    <Loader2
                      strokeWidth={1.5}
                      className="h-4 w-4 animate-spin text-lyp-cherry"
                    />
                  )}
                </div>
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-1.5">
                  <Link
                    href={`/admin/pages/${page.id}`}
                    className={`rounded-full p-1.5 text-[#A89898] transition-colors duration-500 ${EASE} hover:text-lyp-cherry`}
                    title="Edit Page Content"
                    aria-label={`Edit content of ${page.title ?? "page"}`}
                  >
                    <FileEdit strokeWidth={1.5} className="h-4 w-4" />
                  </Link>

                  <button
                    onClick={() => startEdit(page)}
                    className={`rounded-full p-1.5 text-[#A89898] transition-colors duration-500 ${EASE} hover:text-lyp-cherry`}
                    title="Edit Row"
                    aria-label={`Edit details of ${page.title ?? "page"}`}
                  >
                    <Pencil strokeWidth={1.5} className="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          );
        })}
        {addingNew && (
          <tr className="border-b border-lyp-cherry/15 bg-lyp-cherry/[0.04] last:border-0">
            <td className="w-10 px-2 py-2" />
            <td className="px-4 py-2">
              <input
                value={newForm.title}
                onChange={(e) => {
                  const title = e.target.value;
                  setNewForm((f) => ({
                    ...f,
                    title,
                    slug: title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
                  }));
                }}
                className={ic}
                placeholder="Page title"
                aria-label="New page title"
                autoFocus
              />
            </td>
            <td className="px-4 py-2">
              <input
                value={newForm.slug}
                onChange={(e) => setNewForm((f) => ({ ...f, slug: e.target.value }))}
                className={ic + " font-mono text-[11px]"}
                placeholder="page-slug"
                aria-label="New page slug"
              />
            </td>
            <td className="px-4 py-2">
              <select
                value={newForm.type}
                onChange={(e) => setNewForm((f) => ({ ...f, type: e.target.value }))}
                className={ic}
                aria-label="New page type"
              >
                <option value="content">content</option>
                <option value="service">service</option>
              </select>
            </td>
            <td className="px-4 py-2">
              <input
                type="number"
                value={newForm.sequence}
                onChange={(e) => setNewForm((f) => ({ ...f, sequence: Number(e.target.value) }))}
                className={ic + " w-20 tabular-nums"}
                aria-label="New page order"
              />
            </td>
            <td className="px-4 py-2" />
            <td className="px-4 py-2 text-right">
              <div className="flex items-center justify-end gap-1.5">
                <button
                  onClick={handleAdd}
                  disabled={saving}
                  className={`rounded-full p-1.5 text-lyp-cherry transition-all duration-500 ${EASE} hover:bg-lyp-cherry/[0.06] disabled:opacity-40`}
                  title="Create"
                  aria-label="Create page"
                >
                  {saving ? (
                    <Loader2 strokeWidth={1.5} className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check strokeWidth={1.5} className="h-4 w-4" />
                  )}
                </button>
                <button
                  onClick={() => { setAddingNew(false); setNewForm({ title: "", slug: "", type: "content", sequence: 0 }); }}
                  className={`rounded-full p-1.5 text-[#A89898] transition-colors duration-500 ${EASE} hover:text-lyp-black`}
                  title="Cancel"
                  aria-label="Cancel new page"
                >
                  <X strokeWidth={1.5} className="h-4 w-4" />
                </button>
              </div>
            </td>
          </tr>
        )}
      </tbody>
    </table>
    </div>
    {!addingNew && (
      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[#F1E8E8] px-4 py-3">
        <button
          onClick={startAdd}
          className={`inline-flex items-center gap-2 font-body text-[13px] font-semibold text-lyp-cherry transition-opacity duration-500 ${EASE} hover:opacity-70`}
        >
          <Plus strokeWidth={1.5} className="h-4 w-4" /> Add Page
        </button>
        <span className="flex items-center gap-1.5 font-body text-[11px] text-[#A89898]">
          {savingOrder ? (
            <>
              <Loader2 strokeWidth={1.5} className="h-3.5 w-3.5 animate-spin text-lyp-cherry" />{" "}
              Saving order…
            </>
          ) : (
            <>
              <GripVertical strokeWidth={1.5} className="h-3.5 w-3.5 text-[#C3B5B5]" /> Drag rows to
              reorder the client-facing flow
            </>
          )}
        </span>
      </div>
    )}
    </>
  );
}
