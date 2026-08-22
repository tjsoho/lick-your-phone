import { createClient } from "@/utils/server";
import { ContentPagesList } from "./ContentPagesList";

export default async function ContentPagesPage() {
  const supabase = await createClient();
  const { data: pages } = await supabase
    .from("pages")
    .select("id, slug, title, type, sequence, visible")
    .order("sequence");

  const pagesList = pages ?? [];

  return (
    <div className="mx-auto max-w-[80rem]">
      <header className="animate-rise mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div>
          <div className="flex items-center gap-3">
            <span className="h-px w-7 bg-lyp-cherry/30" />
            <span className="font-body text-[10px] font-medium uppercase tracking-[0.32em] text-lyp-cherry/70">
              Portal
            </span>
          </div>
          <h1 className="mt-3 font-heading text-[28px] font-bold leading-[1.05] tracking-[-0.03em] text-lyp-black">
            Content Pages
          </h1>
        </div>
        <p className="font-body text-[13px] text-[#8A7A7A]">
          The pages clients move through in the proposal portal.
        </p>
      </header>

      <div
        className="animate-rise overflow-hidden rounded-2xl border border-[#EFE6E6] bg-lyp-white"
        style={{ animationDelay: "80ms" }}
      >
        <ContentPagesList initialPages={pagesList} />
      </div>
    </div>
  );
}
