import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getPageWithBlocks } from "@/server-actions/pages";
import { createClient } from "@/utils/server";
import PageEditorWorkspace from "@/components/admin/PageEditorWorkspace";
import PageEditorNav from "@/components/admin/PageEditorNav";

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
    (page.content_blocks as {
      id: string;
      type: string | null;
      content: unknown;
      sequence: number | null;
    }[]) ?? []
  ).sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));

  const record = page as Record<string, unknown>;
  const serviceId = (record.service_id as string | null) ?? null;

  // Neighbours in the deck's own order, so the editor can step through it.
  const supabaseForOrder = await createClient();
  const { data: ordered } = await supabaseForOrder
    .from("pages")
    .select("id, title")
    .order("sequence", { ascending: true });

  const deck = (ordered ?? []) as { id: string; title: string | null }[];
  const index = deck.findIndex((p) => p.id === id);
  const previous = index > 0 ? deck[index - 1] : null;
  const next =
    index >= 0 && index < deck.length - 1 ? deck[index + 1] : null;

  // Service pages send you to the service record for pricing, so fetch the
  // slug that link needs.
  let serviceSlug: string | null = null;
  // The slide shows the service's name, so the title field starts from it.
  let serviceName: string | null = null;
  if (serviceId) {
    const supabase = await createClient();
    const { data: service } = await supabase
      .from("services")
      .select("slug, name")
      .eq("id", serviceId)
      .single();
    serviceSlug = service?.slug ?? null;
    serviceName = service?.name ?? null;
  }

  return (
    <div className="mx-auto max-w-[110rem]">
      <header className="animate-rise mb-6 flex items-start gap-4">
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
              {serviceId ? "Service Page" : "Content Page"}
            </span>
          </div>
          <h1 className="mt-3 font-heading text-[28px] font-bold leading-[1.05] tracking-[-0.03em] text-lyp-black">
            {page.title ?? "Untitled"}
          </h1>
        </div>
      </header>

      <div className="animate-rise mb-6" style={{ animationDelay: "100ms" }}>
        <PageEditorNav
          previous={previous}
          next={next}
          position={index + 1}
          total={deck.length}
        />
      </div>

      <PageEditorWorkspace
        pageId={id}
        initialTitle={page.title ?? ""}
        initialSlug={page.slug ?? ""}
        initialImage={(record.featured_image as string | null) ?? null}
        initialPosition={(record.image_position as string | null) ?? "right"}
        initialBlocks={blocks}
        initialCopy={(record.copy as Record<string, string> | null) ?? {}}
        isServicePage={!!serviceId}
        serviceId={serviceId}
        serviceSlug={serviceSlug}
        serviceName={serviceName}
      />
    </div>
  );
}
