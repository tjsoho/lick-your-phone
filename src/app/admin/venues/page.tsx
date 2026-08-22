import { getVenues } from "@/server-actions/venues";
import Link from "next/link";
import {
  Plus,
  MapPin,
  Building,
  Search,
  Pencil,
  AlertCircle,
} from "lucide-react";
import DeleteVenueButton from "./DeleteVenueButton";

const EASE = "ease-brand";

const thClasses =
  "whitespace-nowrap px-5 py-3 text-left font-body text-[9px] font-medium uppercase tracking-[0.2em] text-[#A89898]";

export default async function VenuesPage(props: {
  searchParams: Promise<{ q?: string }>;
}) {
  const searchParams = await props.searchParams;
  const q = searchParams.q?.toLowerCase() || "";
  const { data: venues, error } = await getVenues();

  if (error) {
    return (
      <div className="mx-auto max-w-[80rem]">
        <div
          role="alert"
          className="animate-rise flex items-start gap-3 rounded-2xl border border-lyp-cherry/15 bg-lyp-cherry/[0.04] px-4 py-3.5"
        >
          <AlertCircle
            strokeWidth={1.25}
            className="mt-px h-4 w-4 flex-shrink-0 text-lyp-cherry"
          />
          <p className="font-body text-[13px] text-lyp-cherry">
            Error loading venues: {error}
          </p>
        </div>
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
    <div className="mx-auto max-w-[80rem]">
      <header className="animate-rise mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="h-px w-7 bg-lyp-cherry/30" />
            <span className="font-body text-[10px] font-medium uppercase tracking-[0.32em] text-lyp-cherry/70">
              Locations
            </span>
          </div>
          <h1 className="mt-3 font-heading text-[28px] font-bold leading-[1.05] tracking-[-0.03em] text-lyp-black">
            Venues
          </h1>
          <p className="mt-2 font-body text-[13px] text-[#8A7A7A]">
            Manage locations for your clients.
          </p>
        </div>

        <Link
          href="/admin/venues/new"
          className={`group inline-flex items-center gap-3 rounded-full bg-lyp-cherry py-1.5 pl-6 pr-1.5 font-body text-[13px] font-semibold tracking-wide text-lyp-white shadow-[0_10px_30px_-10px_rgba(178,38,38,0.5)] transition-all duration-500 ${EASE} hover:bg-[#c22e2e] active:scale-[0.985]`}
        >
          Create Venue
          <span
            className={`flex h-8 w-8 items-center justify-center rounded-full bg-lyp-white/15 transition-transform duration-500 ${EASE} group-hover:scale-105`}
          >
            <Plus strokeWidth={1.5} className="h-4 w-4" />
          </span>
        </Link>
      </header>

      <div
        className="animate-rise overflow-hidden rounded-2xl border border-[#EFE6E6] bg-lyp-white"
        style={{ animationDelay: "80ms" }}
      >
        <div className="border-b border-[#F1E8E8] p-4">
          <form className="relative max-w-md">
            <label htmlFor="venue-search" className="sr-only">
              Search venues or clients
            </label>
            <Search
              strokeWidth={1.5}
              aria-hidden="true"
              className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#C3B5B5]"
            />
            <input
              id="venue-search"
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Search venues or clients..."
              className={`w-full rounded-2xl border border-[#EFE6E6] bg-[#FBF8F8] py-2.5 pl-11 pr-4 font-body text-[13px] text-lyp-black outline-none transition-all duration-500 ${EASE} placeholder:text-[#C3B5B5] focus:border-lyp-cherry/30 focus:bg-lyp-white focus:shadow-[0_0_0_4px_rgba(178,38,38,0.07)]`}
            />
          </form>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left font-body text-[12.5px]">
            <thead>
              <tr className="border-b border-[#F1E8E8]">
                <th className={thClasses}>Name</th>
                <th className={thClasses}>Client</th>
                <th className={thClasses}>State</th>
                <th className={thClasses}>Address</th>
                <th className={`${thClasses} text-right`}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredVenues.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-8 py-12 text-center">
                    <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-lyp-cherry/[0.05] ring-1 ring-lyp-cherry/10">
                      <MapPin
                        strokeWidth={1}
                        aria-hidden="true"
                        className="h-6 w-6 text-lyp-cherry/60"
                      />
                    </span>
                    <p className="mt-5 font-body text-[14px] text-[#8A7A7A]">
                      No venues found.
                    </p>
                    <Link
                      href="/admin/venues/new"
                      className={`mt-3 inline-block font-body text-[13px] font-semibold text-lyp-cherry transition-opacity duration-500 ${EASE} hover:opacity-70`}
                    >
                      Create a venue
                    </Link>
                  </td>
                </tr>
              ) : (
                filteredVenues.map((venue) => (
                  <tr
                    key={venue.id}
                    className={`group border-b border-[#F7F1F1] transition-colors duration-500 last:border-0 ${EASE} hover:bg-[#FBF8F8]`}
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <MapPin
                          strokeWidth={1.5}
                          aria-hidden="true"
                          className="h-3.5 w-3.5 flex-shrink-0 text-[#C3B5B5]"
                        />
                        <span className="font-medium text-lyp-black">
                          {venue.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      {venue.clients ? (
                        <div className="flex items-center gap-2.5">
                          <Building
                            strokeWidth={1.5}
                            aria-hidden="true"
                            className="h-3.5 w-3.5 flex-shrink-0 text-[#C3B5B5]"
                          />
                          <span className="text-[#8A7A7A]">
                            {venue.clients.name}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[#A89898]">None</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3">
                      <span className="inline-block rounded-full bg-[#F2EDED] px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-[#8A7A7A]">
                        {venue.states?.name || "Unknown"}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="block max-w-[220px] truncate text-[#A89898]">
                        {venue.address || "—"}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-right">
                      <div
                        className={`flex items-center justify-end gap-1 opacity-0 transition-opacity duration-500 ${EASE} focus-within:opacity-100 group-hover:opacity-100`}
                      >
                        <Link
                          href={`/admin/venues/${venue.id}`}
                          aria-label={`Edit ${venue.name}`}
                          title="Edit"
                          className={`rounded-full p-1.5 text-[#A89898] transition-colors duration-500 ${EASE} hover:bg-[#F7F1F1] hover:text-lyp-cherry focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lyp-cherry/30`}
                        >
                          <Pencil strokeWidth={1.5} className="h-4 w-4" />
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
