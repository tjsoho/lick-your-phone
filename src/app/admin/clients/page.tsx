import Link from "next/link";
import { getClients } from "@/server-actions/clients";
import { formatDate } from "@/lib/format";
import { AlertCircle, ArrowRight, MapPin, Plus, Users } from "lucide-react";

const EASE = "ease-brand";

const thClasses =
  "whitespace-nowrap px-5 py-3 text-left font-body text-[9px] font-medium uppercase tracking-[0.2em] text-[#A89898]";

export default async function ClientsPage() {
  const { data: clients, error } = await getClients();

  return (
    <div className="mx-auto max-w-[80rem]">
      <header className="animate-rise mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="h-px w-7 bg-lyp-cherry/30" />
            <span className="font-body text-[10px] font-medium uppercase tracking-[0.32em] text-lyp-cherry/70">
              Directory
            </span>
          </div>
          <h1 className="mt-3 font-heading text-[28px] font-bold leading-[1.05] tracking-[-0.03em] text-lyp-black">
            Clients
          </h1>
        </div>

        <Link
          href="/admin/proposals/new"
          className={`group inline-flex items-center gap-3 rounded-full bg-lyp-cherry py-1.5 pl-6 pr-1.5 font-body text-[13px] font-semibold tracking-wide text-lyp-white shadow-[0_10px_30px_-10px_rgba(178,38,38,0.5)] transition-all duration-500 ${EASE} hover:bg-[#c22e2e] active:scale-[0.985]`}
        >
          New Proposal
          <span
            className={`flex h-8 w-8 items-center justify-center rounded-full bg-lyp-white/15 transition-transform duration-500 ${EASE} group-hover:scale-105`}
          >
            <Plus strokeWidth={1.5} className="h-4 w-4" />
          </span>
        </Link>
      </header>

      {error && (
        <div
          role="alert"
          className="mb-5 flex items-start gap-3 rounded-2xl border border-lyp-cherry/15 bg-lyp-cherry/[0.04] px-4 py-3.5"
        >
          <AlertCircle
            strokeWidth={1.25}
            className="mt-px h-4 w-4 flex-shrink-0 text-lyp-cherry"
          />
          <p className="font-body text-[13px] text-lyp-cherry">
            Failed to load clients: {error}
          </p>
        </div>
      )}

      <div
        className="animate-rise overflow-hidden rounded-2xl border border-[#EFE6E6] bg-lyp-white"
        style={{ animationDelay: "80ms" }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left font-body text-[12.5px]">
            <thead>
              <tr className="border-b border-[#F1E8E8]">
                <th className={thClasses}>Client</th>
                <th className={thClasses}>Venues</th>
                <th className={thClasses}>Email</th>
                <th className={thClasses}>Created</th>
              </tr>
            </thead>
            <tbody>
              {clients && clients.length > 0 ? (
                clients.map(
                  (client: {
                    id: string;
                    name: string;
                    email?: string;
                    created_at: string;
                    venues: { id: string; name: string }[];
                  }) => {
                    // Every venue the person has, not just the first — a
                    // client can hold several.
                    const venues = client.venues ?? [];
                    return (
                      <tr
                        key={client.id}
                        className={`border-b border-[#F7F1F1] transition-colors duration-500 last:border-0 ${EASE} hover:bg-[#FBF8F8]`}
                      >
                        <td className="whitespace-nowrap px-5 py-3">
                          <Link
                            href={`/admin/clients/${client.id}`}
                            className={`font-medium text-lyp-black transition-colors duration-500 ${EASE} hover:text-lyp-cherry`}
                          >
                            {client.name}
                          </Link>
                        </td>
                        <td className="px-5 py-3 text-[#8A7A7A]">
                          {venues.length > 0 ? (
                            <span className="flex flex-wrap gap-1.5">
                              {venues.map((venue) => (
                                <span
                                  key={venue.id}
                                  className="inline-flex items-center gap-1.5 rounded-full border border-[#F1E8E8] bg-[#FBF8F8] px-2.5 py-1 text-[11.5px] text-[#8A7A7A]"
                                >
                                  <MapPin
                                    strokeWidth={1.25}
                                    className="h-3 w-3 text-[#C3B5B5]"
                                  />
                                  {venue.name}
                                </span>
                              ))}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="whitespace-nowrap px-5 py-3 text-[#8A7A7A]">
                          {client.email || "—"}
                        </td>
                        <td className="whitespace-nowrap px-5 py-3 tabular-nums text-[#A89898]">
                          {formatDate(client.created_at)}
                        </td>
                      </tr>
                    );
                  },
                )
              ) : (
                <tr>
                  <td colSpan={4} className="px-8 py-12 text-center">
                    <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-lyp-cherry/[0.05] ring-1 ring-lyp-cherry/10">
                      <Users
                        strokeWidth={1}
                        className="h-6 w-6 text-lyp-cherry/60"
                      />
                    </span>
                    <p className="mt-5 font-body text-[14px] text-[#8A7A7A]">
                      No clients yet.
                    </p>
                    <Link
                      href="/admin/proposals/new"
                      className={`mt-4 inline-flex items-center gap-2 font-body text-[13px] font-semibold text-lyp-cherry transition-opacity duration-500 ${EASE} hover:opacity-70`}
                    >
                      Create your first proposal
                      <ArrowRight strokeWidth={1.5} className="h-3.5 w-3.5" />
                    </Link>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
