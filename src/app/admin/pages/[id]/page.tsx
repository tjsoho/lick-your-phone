import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getPageWithBlocks } from "@/server-actions/pages";
import { ContentBlocksEditor } from "@/components/admin/ContentBlocksEditor";
import { PageSettingsForm } from "@/components/admin/PageSettingsForm";
import PageTitleForm from "@/components/admin/PageTitleForm";

export default async function EditPagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { data: page, error } = await getPageWithBlocks(id);
  if (error || !page) return notFound();

  const blocks = (
    (page.content_blocks as { id: string; type: string | null; content: unknown; sequence: number | null }[]) ?? []
  ).sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/pages"
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </Link>
        <PageTitleForm
          pageId={id}
          initialTitle={page.title ?? ""}
          initialSlug={page.slug ?? ""}
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <PageSettingsForm
          pageId={id}
          initialImage={(page as Record<string, unknown>).featured_image as string | null ?? null}
          initialPosition={(page as Record<string, unknown>).image_position as string | null ?? "right"}
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <ContentBlocksEditor pageId={id} initialBlocks={blocks} />
      </div>
    </div>
  );
}
