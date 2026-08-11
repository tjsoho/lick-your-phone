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
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-heading font-bold text-lyp-black">
          Content Pages
        </h1>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <ContentPagesList initialPages={pagesList} />
      </div>
    </div>
  );
}

