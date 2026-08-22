import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getPageWithBlocks } from "@/server-actions/pages";
import { ContentBlocksEditor } from "@/components/admin/ContentBlocksEditor";
import { PageSettingsForm } from "@/components/admin/PageSettingsForm";
import PageTitleForm from "@/components/admin/PageTitleForm";

const EASE = "ease-brand";

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
    <div className="mx-auto max-w-[80rem] space-y-6">
      <header className="animate-rise flex items-start gap-4">
        <Link
          href="/admin/pages"
          aria-label="Back to content pages"
          title="Back to content pages"
          className={`mt-1 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-[#EFE6E6] bg-lyp-white text-[#A89898] transition-all duration-500 ${EASE} hover:border-lyp-cherry/25 hover:text-lyp-cherry active:scale-95`}
        >
          <ArrowLeft strokeWidth={1.5} className="h-4 w-4" />
        </Link>

        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <span className="h-px w-7 bg-lyp-cherry/30" />
            <span className="font-body text-[10px] font-medium uppercase tracking-[0.32em] text-lyp-cherry/70">
              Content Page
            </span>
          </div>
          <PageTitleForm
            pageId={id}
            initialTitle={page.title ?? ""}
            initialSlug={page.slug ?? ""}
          />
        </div>
      </header>

      <section
        className="animate-rise rounded-2xl border border-[#EFE6E6] bg-lyp-white p-6"
        style={{ animationDelay: "140ms" }}
      >
        <PageSettingsForm
          pageId={id}
          initialImage={(page as Record<string, unknown>).featured_image as string | null ?? null}
          initialPosition={(page as Record<string, unknown>).image_position as string | null ?? "right"}
        />
      </section>

      <section
        className="animate-rise rounded-2xl border border-[#EFE6E6] bg-lyp-white p-6"
        style={{ animationDelay: "200ms" }}
      >
        <ContentBlocksEditor pageId={id} initialBlocks={blocks} />
      </section>
    </div>
  );
}
