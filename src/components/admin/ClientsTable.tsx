"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, MapPin, SearchX, Users } from "lucide-react";
import { formatDate } from "@/lib/format";
import AdminSearchField from "./AdminSearchField";

const EASE = "ease-brand";

const thClasses =
  "whitespace-nowrap px-5 py-3 text-left font-body text-[9px] font-medium uppercase tracking-[0.2em] text-[#A89898]";

export type ClientRow = {
  id: string;
  name: string;
  email?: string;
  created_at: string;
  venues: { id: string; name: string }[];
};

/**
 * The clients directory, with the search box the agency asked for.
 *
 * Filtering happens here in the browser rather than on the server: the whole
 * directory arrives with the page, so narrowing it is instant and the URL
 * stays clean. A name, an email address or any of the client's venues will
 * find them — looking a client up by the venue you know them from is the
 * reason the agency comes to this page in the first place.
 */
export default function ClientsTable({ clients }: { clients: ClientRow[] }) {
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return clients;
    return clients.filter((client) =>
      [client.name, client.email, ...(client.venues ?? []).map((v) => v.name)]
        .filter((field): field is string => Boolean(field))
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }, [clients, query]);

  return (
    <>
      <div
        className="animate-rise mb-4 flex flex-wrap items-center gap-3"
        style={{ animationDelay: "40ms" }}
      >
        <AdminSearchField
          value={query}
          onChange={setQuery}
          label="Search clients"
          placeholder="Search name, email or venue…"
          className="w-full min-w-[220px] flex-1 sm:w-auto sm:max-w-[320px]"
        />
        {query && (
          <span className="font-body text-[11.5px] text-[#A89898]">
            {visible.length} of {clients.length}
          </span>
        )}
      </div>

      <div
        className="animate-rise overflow-hidden rounded-2xl border border-[#EFE6E6] bg-lyp-white"
        style={{ animationDelay: "80ms" }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left font-body text-[12.5px]">
            <thead>
              <tr className="border-b border-[#F1E8E8]">
                <th scope="col" className={thClasses}>
                  Client
                </th>
                <th scope="col" className={thClasses}>
                  Venues
                </th>
                <th scope="col" className={thClasses}>
                  Email
                </th>
                <th scope="col" className={thClasses}>
                  Created
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.length > 0 ? (
                visible.map((client) => {
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
                })
              ) : clients.length > 0 ? (
                <tr>
                  <td colSpan={4} className="px-8 py-12 text-center">
                    <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-lyp-cherry/[0.05] ring-1 ring-lyp-cherry/10">
                      <SearchX
                        strokeWidth={1}
                        className="h-6 w-6 text-lyp-cherry/60"
                      />
                    </span>
                    <p className="mt-5 font-body text-[14px] text-[#8A7A7A]">
                      No clients match “{query}”.
                    </p>
                    <button
                      type="button"
                      onClick={() => setQuery("")}
                      className={`mt-3 font-body text-[13px] font-semibold text-lyp-cherry transition-opacity duration-500 ${EASE} hover:opacity-70`}
                    >
                      Clear search
                    </button>
                  </td>
                </tr>
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
    </>
  );
}
