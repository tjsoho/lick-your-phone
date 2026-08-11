"use client";

import { useTransition, useState } from "react";
import { BookOpen, Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { togglePageVisibility } from "@/server-actions/pages";
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

  const handleToggle = (id: string, currentVisible: boolean | null) => {
    const nextVisible = !currentVisible;
    setLoadingId(id);
    startTransition(async () => {
      // Optimistic update
      setPages((prev) =>
        prev.map((p) => (p.id === id ? { ...p, visible: nextVisible } : p))
      );

      const res = await togglePageVisibility(id, nextVisible);
      setLoadingId(null);
      if (res.error) {
        toast.error(res.error);
        // Rollback
        setPages((prev) =>
          prev.map((p) => (p.id === id ? { ...p, visible: currentVisible } : p))
        );
      } else {
        toast.success("Page visibility updated");
      }
    });
  };

  if (pages.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500 font-body">
        <BookOpen className="h-10 w-10 mx-auto mb-3 text-gray-300" />
        <p>No content pages found.</p>
      </div>
    );
  }

  return (
    <table className="w-full text-sm font-body">
      <thead>
        <tr className="border-b border-gray-100 bg-gray-50">
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
        </tr>
      </thead>
      <tbody>
        {pages.map((page) => (
          <tr
            key={page.id}
            className="border-b border-gray-50 hover:bg-gray-50"
          >
            <td className="px-4 py-3 font-medium text-lyp-black">
              {page.title ?? "Untitled"}
            </td>
            <td className="px-4 py-3 text-gray-500 font-mono text-xs">
              {page.slug ?? "-"}
            </td>
            <td className="px-4 py-3">
              <span
                className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                  page.type === "service"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-gray-100 text-gray-700"
                }`}
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
          </tr>
        ))}
      </tbody>
    </table>
  );
}
