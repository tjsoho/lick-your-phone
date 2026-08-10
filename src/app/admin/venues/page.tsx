import { getVenues } from "@/server-actions/venues";
import Link from "next/link";
import { Plus, MapPin, Building, Search, Edit } from "lucide-react";
import DeleteVenueButton from "./DeleteVenueButton";

export default async function VenuesPage(props: {
  searchParams: Promise<{ q?: string }>;
}) {
  const searchParams = await props.searchParams;
  const q = searchParams.q?.toLowerCase() || "";
  const { data: venues, error } = await getVenues();

  if (error) {
    return (
      <div className="p-8">
        <div className="text-red-500">Error loading venues: {error}</div>
      </div>
    );
  }

  const filteredVenues = (venues || []).filter((v) => {
    if (!q) return true;
    return (
      v.name.toLowerCase().includes(q) ||
      v.clients?.name?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-lyp-black">
            Venues
          </h1>
          <p className="font-body text-gray-500 mt-1">
            Manage locations for your clients
          </p>
        </div>
        <Link
          href="/admin/venues/new"
          className="bg-lyp-cherry text-white px-4 py-2 rounded-lg font-body text-sm font-medium hover:bg-lyp-cherry/90 transition-colors flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Create Venue
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <form className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Search venues or clients..."
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-body focus:outline-none focus:ring-2 focus:ring-lyp-cherry/20 focus:border-lyp-cherry transition-all"
            />
          </form>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left font-body text-sm">
            <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
              <tr>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Client</th>
                <th className="px-6 py-4">State</th>
                <th className="px-6 py-4">Address</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredVenues.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-8 text-center text-gray-500"
                  >
                    No venues found.
                  </td>
                </tr>
              ) : (
                filteredVenues.map((venue) => (
                  <tr
                    key={venue.id}
                    className="hover:bg-gray-50/50 transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <span className="font-medium text-lyp-black">
                          {venue.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {venue.clients ? (
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-600">
                            {venue.clients.name}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">None</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2 py-1 rounded-md bg-gray-100 text-gray-700 text-xs font-medium">
                        {venue.states?.name || "Unknown"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-gray-500 truncate max-w-[200px] block">
                        {venue.address || "-"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link
                          href={`/admin/venues/${venue.id}`}
                          className="p-1.5 text-gray-400 hover:text-lyp-cherry rounded hover:bg-gray-100 transition-colors"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </Link>
                        <DeleteVenueButton id={venue.id} name={venue.name} />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
