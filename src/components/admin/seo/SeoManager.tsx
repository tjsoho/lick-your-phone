"use client";

import { useState } from "react";
import { upsertSeoEntryAction } from "@/server-actions/seo";

import toast from "react-hot-toast";

interface SeoPageData {
  slug: string;
  path: string;
  label: string;
  defaultTitle: string;
  defaultDescription: string;
  defaultKeywords?: string;
  metaTitle: string;
  metaDescription: string;
  keywords: string;
}

interface SeoManagerProps {
  pages: SeoPageData[];
  baseUrl?: string;
}

export default function SeoManager({ pages: initialPages, baseUrl = "https://example.com" }: SeoManagerProps) {
  const [pages, setPages] = useState(initialPages);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const filteredPages = pages.filter((page) =>
    page.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    page.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleEdit = (slug: string) => {
    setEditingSlug(slug);
  };

  const handleSave = async (slug: string) => {
    const page = pages.find((p) => p.slug === slug);
    if (!page) return;

    setIsSaving(true);
    try {
      const result = await upsertSeoEntryAction({
        slug: page.slug,
        metaTitle: page.metaTitle,
        metaDescription: page.metaDescription,
        keywords: page.keywords || undefined,
      });

      if (result.success) {
        toast.success("SEO metadata saved successfully!");
        setEditingSlug(null);
      } else {
        toast.error(result.error || "Failed to save SEO metadata");
      }
    } catch (error) {
      toast.error("An error occurred while saving");
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = (slug: string) => {
    const originalPage = initialPages.find((p) => p.slug === slug);
    if (originalPage) {
      setPages((prev) =>
        prev.map((p) => (p.slug === slug ? originalPage : p))
      );
    }
    setEditingSlug(null);
  };

  const updatePage = (slug: string, field: keyof SeoPageData, value: string) => {
    setPages((prev) =>
      prev.map((p) => (p.slug === slug ? { ...p, [field]: value } : p))
    );
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Search and Page Count */}
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search pages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 pl-9 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-green"
            />
            <svg
              className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <div className="text-xs text-gray-500">
            {filteredPages.length} {filteredPages.length === 1 ? "page" : "pages"}
          </div>
        </div>

        {/* Pages List */}
        <div className="space-y-3">
          {filteredPages.map((page) => {
            const isEditing = editingSlug === page.slug;
            const fullUrl = `${baseUrl.replace(/^https?:\/\//, '').toUpperCase()}${page.path}`;

            return (
              <div
                key={page.slug}
                className="bg-white border border-gray-200 rounded-lg p-5 relative"
              >
                {!isEditing && (
                  <button
                    onClick={() => handleEdit(page.slug)}
                    className="absolute top-5 right-5 px-3 py-1.5 text-xs border border-blue-300 text-blue-600 bg-white rounded hover:bg-blue-50 transition-colors flex items-center gap-1.5"
                  >
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                    Edit
                  </button>
                )}

                {isEditing ? (
                  <div className="space-y-4 pr-20">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <input
                            type="text"
                            value={page.metaTitle}
                            onChange={(e) =>
                              updatePage(page.slug, "metaTitle", e.target.value)
                            }
                            maxLength={60}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-brand-green"
                            placeholder={page.defaultTitle}
                          />
                          <p className={`!text-[12px] mt-0.5 ${
                            page.metaTitle.length > 60 
                              ? "text-red-600" 
                              : "text-gray-400"
                          }`}>
                            Title length: {page.metaTitle.length}/60
                          </p>
                        </div>
                        <div>
                          <input
                            type="text"
                            value={page.keywords || ""}
                            onChange={(e) =>
                              updatePage(page.slug, "keywords", e.target.value)
                            }
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-brand-green"
                            placeholder={page.defaultKeywords || "keyword1, keyword2, keyword3"}
                          />
                        </div>
                      </div>
                      <div>
                        <textarea
                          value={page.metaDescription}
                          onChange={(e) =>
                            updatePage(
                              page.slug,
                              "metaDescription",
                              e.target.value
                            )
                          }
                          maxLength={155}
                          rows={4}
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-brand-green"
                          placeholder={page.defaultDescription}
                        />
                        <p className={`!text-[12px] mt-0.5 ${
                          page.metaDescription.length > 155 
                            ? "text-red-600" 
                            : "text-gray-400"
                        }`}>
                          Description length: {page.metaDescription.length}/155
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 pt-3 border-t">
                      <button
                        onClick={() => handleSave(page.slug)}
                        disabled={isSaving}
                        className="px-3 py-1.5 text-xs bg-brand-green text-white rounded font-medium hover:bg-brand-green/90 transition-colors disabled:opacity-50"
                      >
                        {isSaving ? "Saving..." : "Save"}
                      </button>
                      <button
                        onClick={() => handleCancel(page.slug)}
                        disabled={isSaving}
                        className="px-3 py-1.5 text-xs bg-gray-200 text-gray-700 rounded font-medium hover:bg-gray-300 transition-colors disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pr-20">
                    {/* Left Column */}
                    <div className="space-y-1.5">
                      <div className="text-base font-bold text-slate-800">
                        {page.label}
                      </div>
                      <div className="text-[10px] text-gray-400 font-sans uppercase tracking-wide">
                        {fullUrl}
                      </div>
                      <div className="text-sm text-slate-800">
                        {page.metaTitle}
                      </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-1.5">
                      <div className="text-sm text-slate-800 leading-relaxed">
                        {page.metaDescription}
                      </div>
                      <div className="text-[10px] text-gray-400">
                        <span className={page.metaTitle.length > 60 ? "text-red-600" : "text-gray-400"}>
                          Title length: {page.metaTitle.length}/60
                        </span>
                        {" · "}
                        <span className={page.metaDescription.length > 155 ? "text-red-600" : "text-gray-400"}>
                          Description length: {page.metaDescription.length}/155
                        </span>
                      </div>
                      {page.keywords && (
                        <div className="text-[10px] text-gray-400">
                          Keywords: {page.keywords}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {filteredPages.length === 0 && (
          <div className="text-center py-12 text-xs text-gray-500">
            No pages found matching &quot;{searchQuery}&quot;
          </div>
        )}
      </div>
    </div>
  );
}

