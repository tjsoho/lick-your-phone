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
      <div className="p-8 text-center text-gray-500 font-body">
        <BookOpen className="h-10 w-10 mx-auto mb-3 text-gray-300" />
        <p>No content pages found.</p>
        <button onClick={startAdd}
          className="mt-4 inline-flex items-center gap-1.5 bg-lyp-cherry text-white px-4 py-2 rounded-md font-body text-sm hover:bg-lyp-maroon transition-colors">
          <Plus className="h-4 w-4" /> Add Page
        </button>
      </div>
    );
  }

  return (
    <>
    <table className="w-full text-sm font-body">
      <thead>
        <tr className="border-b border-gray-100 bg-gray-50">
          <th className="w-10 px-2 py-3" aria-label="Reorder" />
          <th className="text-left px-4 py-3 font-semibold text-gray-600">
            Title
          </th>
          <th className="text-left px-4 py-3 font-semibold text-gray-600">
            Slug
          </th>
          <th className="text-left px-4 py-3 font-semibold text-gray-600">
            Type
          </th>
          <th className="text-left px-4 py-3 font-semibold text-gray-600">
            Order
          </th>
          <th className="text-left px-4 py-3 font-semibold text-gray-600">
            Visible
          </th>
          <th className="text-right px-4 py-3 font-semibold text-gray-600">
            Actions
          </th>
        </tr>
      </thead>
      <tbody>
        {pages.map((page) => {
          const ic =
            "w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-lyp-cherry/30 focus:border-lyp-cherry";
          if (editingId === page.id) {
            return (
              <tr key={page.id} className="border-b border-gray-50 bg-gray-50">
                <td className="w-10 px-2 py-2" />
                <td className="px-4 py-2">
                  <input
                    className={ic}
                    value={editForm.title}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, title: e.target.value }))
                    }
                  />
                </td>
                <td className="px-4 py-2">
                  <input
                    className={ic + " font-mono text-xs"}
                    value={editForm.slug}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, slug: e.target.value }))
                    }
                  />
                </td>
                <td className="px-4 py-2">
                  <select
                    className={ic}
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
                    className={ic + " w-16"}
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
                    className="data-[state=checked]:bg-green-500"
                  />
                </td>
                <td className="px-4 py-2 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="p-1.5 text-green-600 hover:text-green-800 transition-colors disabled:opacity-50"
                      title="Save"
                    >
                      {saving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
                      title="Cancel"
                    >
                      <X className="h-4 w-4" />
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
              className={`border-b border-gray-50 transition-colors ${
                dragId === page.id
                  ? "bg-lyp-cherry/5 opacity-60"
                  : "hover:bg-gray-50"
              }`}
            >
              <td className="w-10 px-2 py-3">
                <span
                  className={`flex items-center justify-center text-gray-300 ${
                    editingId || savingOrder
                      ? "cursor-not-allowed"
                      : "cursor-grab active:cursor-grabbing hover:text-lyp-cherry"
                  }`}
                  title="Drag to reorder"
                >
                  <GripVertical className="h-4 w-4" />
                </span>
              </td>
              <td className="px-4 py-3">
                <Link
                  href={`/admin/pages/${page.id}`}
                  // Anchors are natively draggable, which would hijack the
                  // row's drag-to-reorder gesture.
                  draggable={false}
                  className="font-medium text-lyp-black transition-colors duration-500 ease-brand hover:text-lyp-cherry"
                  title="Edit page content"
                >
                  {page.title ?? "Untitled"}
                </Link>
              </td>
              <td className="px-4 py-3 text-gray-500 font-mono text-xs">
                {page.slug ?? "-"}
              </td>
              <td className="px-4 py-3">
                <span
                  className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${page.type === "service" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700"}`}
                >
                  {page.type ?? "content"}
                </span>
              </td>
              <td className="px-4 py-3 text-gray-600">{page.sequence}</td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={!!page.visible}
                    disabled={isPending && loadingId === page.id}
                    onCheckedChange={() => handleToggle(page.id, page.visible)}
                    className="data-[state=checked]:bg-green-500"
                  />
                  {isPending && loadingId === page.id && (
                    <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                  )}
                </div>
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-1">
                  <Link
                    href={`/admin/pages/${page.id}`}
                    className="p-1.5 text-gray-400 hover:text-lyp-cherry transition-colors"
                    title="Edit Page Content"
                  >
                    <FileEdit className="h-4 w-4" />
                  </Link>

                  <button
                    onClick={() => startEdit(page)}
                    className="p-1.5 text-gray-400 hover:text-lyp-cherry transition-colors"
                    title="Edit Row"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          );
        })}
        {addingNew && (
          <tr className="border-b border-lyp-cherry/20 bg-lyp-cherry/5">
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
                className="w-full border border-gray-300 rounded px-2 py-1 text-sm font-body"
                placeholder="Page title"
                autoFocus
              />
            </td>
            <td className="px-4 py-2">
              <input
                value={newForm.slug}
                onChange={(e) => setNewForm((f) => ({ ...f, slug: e.target.value }))}
                className="w-full border border-gray-300 rounded px-2 py-1 text-sm font-mono"
                placeholder="page-slug"
              />
            </td>
            <td className="px-4 py-2">
              <select
                value={newForm.type}
                onChange={(e) => setNewForm((f) => ({ ...f, type: e.target.value }))}
                className="border border-gray-300 rounded px-2 py-1 text-sm font-body"
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
                className="w-16 border border-gray-300 rounded px-2 py-1 text-sm font-body"
              />
            </td>
            <td className="px-4 py-2" />
            <td className="px-4 py-2 text-right">
              <div className="flex items-center justify-end gap-1">
                <button
                  onClick={handleAdd}
                  disabled={saving}
                  className="p-1.5 text-green-600 hover:text-green-800 transition-colors disabled:opacity-50"
                  title="Create"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => { setAddingNew(false); setNewForm({ title: "", slug: "", type: "content", sequence: 0 }); }}
                  className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
                  title="Cancel"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </td>
          </tr>
        )}
      </tbody>
    </table>
    {!addingNew && (
      <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between gap-4">
        <button
          onClick={startAdd}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-lyp-cherry font-body transition-colors"
        >
          <Plus className="h-4 w-4" /> Add Page
        </button>
        <span className="flex items-center gap-1.5 text-xs text-gray-400 font-body">
          {savingOrder ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving order…
            </>
          ) : (
            <>
              <GripVertical className="h-3.5 w-3.5" /> Drag rows to reorder the
              client-facing flow
            </>
          )}
        </span>
      </div>
    )}
    </>
  );
}
