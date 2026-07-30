import { createClient } from "@/utils/server";
import { BookOpen } from "lucide-react";

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
        {pagesList.length === 0 ? (
          <div className="p-8 text-center text-gray-500 font-body">
            <BookOpen className="h-10 w-10 mx-auto mb-3 text-gray-300" />
            <p>No content pages found.</p>
          </div>
        ) : (
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
              {pagesList.map(
                (page: {
                  id: string;
                  title: string | null;
                  slug: string | null;
                  type: string | null;
                  sequence: number;
                  visible: boolean | null;
                }) => (
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
                      <span
                        className={`inline-block w-2 h-2 rounded-full ${
                          page.visible ? "bg-green-500" : "bg-gray-300"
                        }`}
                      />
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
