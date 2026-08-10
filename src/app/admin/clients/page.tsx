import Link from "next/link";
import { getClients } from "@/server-actions/clients";
import { formatDate } from "@/lib/format";

export default async function ClientsPage() {
  const { data: clients, error } = await getClients();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-heading font-bold text-lyp-black">
          Clients
        </h1>
        <Link
          href="/admin/clients/new"
          className="bg-lyp-cherry text-white px-4 py-2 rounded-md font-body text-sm hover:opacity-90 transition-colors"
        >
          Add Client
        </Link>
      </div>

      {error && (
        <p className="text-red-600 mb-4">Failed to load clients: {error}</p>
      )}

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-4 py-3 font-heading text-sm font-semibold text-lyp-black">
                Name
              </th>
              <th className="px-4 py-3 font-heading text-sm font-semibold text-lyp-black">
                Entity
              </th>
              <th className="px-4 py-3 font-heading text-sm font-semibold text-lyp-black">
                ABN
              </th>
              <th className="px-4 py-3 font-heading text-sm font-semibold text-lyp-black">
                Venues
              </th>
              <th className="px-4 py-3 font-heading text-sm font-semibold text-lyp-black">
                Created
              </th>
            </tr>
          </thead>
          <tbody>
            {clients && clients.length > 0 ? (
              clients.map(
                (client: {
                  id: string;
                  name: string;
                  entity_name?: string;
                  abn?: string;
                  created_at: string;
                  venues: { id: string; name: string }[];
                }) => (
                  <tr
                    key={client.id}
                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/clients/${client.id}`}
                        className="text-lyp-cherry font-body text-sm hover:underline"
                      >
                        {client.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-body text-sm text-gray-700">
                      {client.entity_name || "—"}
                    </td>
                    <td className="px-4 py-3 font-body text-sm text-gray-700">
                      {client.abn || "—"}
                    </td>
                    <td className="px-4 py-3 font-body text-sm text-gray-700">
                      {client.venues?.length ?? 0}
                    </td>
                    <td className="px-4 py-3 font-body text-sm text-gray-700">
                      {formatDate(client.created_at)}
                    </td>
                  </tr>
                ),
              )
            ) : (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-8 text-center font-body text-sm text-gray-500"
                >
                  No clients yet. Add your first client to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
