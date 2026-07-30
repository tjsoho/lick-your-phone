import { fetchSeoEntries } from "@/data/seo";
import { seoPages } from "@/config/seo-pages";
import SeoManager from "@/components/admin/seo/SeoManager";
import AdminNavigation from "@/components/admin/AdminNavigation";

export default async function AdminSeoPage() {
  const seoEntries = await fetchSeoEntries();
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://example.com";

  // Merge config with stored data
  const pagesWithSeo = seoPages.map((page) => {
    const stored = seoEntries.find((entry) => entry.slug === page.slug);
    return {
      ...page,
      metaTitle: stored?.meta_title ?? page.defaultTitle,
      metaDescription: stored?.meta_description ?? page.defaultDescription,
      keywords: stored?.keywords ?? page.defaultKeywords ?? "",
    };
  });

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <AdminNavigation />
        </div>
        <SeoManager pages={pagesWithSeo} baseUrl={baseUrl} />
      </div>
    </div>
  );
}

