import { createClient } from "@/utils/server";
import Link from "next/link";
import {
  Users,
  FileText,
  Package,
  MapPin,
  Plus,
  ArrowRight,
  ArrowUpRight,
} from "lucide-react";
import { formatCents, formatDate } from "@/lib/format";

const EASE = "ease-[cubic-bezier(0.32,0.72,0,1)]";

/** Muted, tonal pills — saturated Tailwind defaults read cheap next to the brand. */
const statusStyles: Record<string, string> = {
  draft: "bg-[#F2EDED] text-[#8A7A7A]",
  sent: "bg-[#EDF1F7] text-[#5B7394]",
  intake_complete: "bg-[#FBF3E3] text-[#9A7B2E]",
  signed: "bg-[#E9F2EC] text-[#4A7A5C]",
  superseded: "bg-lyp-cherry/[0.07] text-lyp-cherry",
};

export default async function AdminDashboard() {
  const supabase = await createClient();

  // Fetch counts in parallel
  const [clientsRes, proposalsRes, servicesRes, statesRes, recentProposalsRes] =
    await Promise.all([
      supabase.from("clients").select("*", { count: "exact", head: true }),
      supabase
        .from("proposals")
        .select("*", { count: "exact", head: true })
        .in("status", ["draft", "sent"]),
      supabase.from("services").select("*", { count: "exact", head: true }),
      supabase.from("states").select("*", { count: "exact", head: true }),
      supabase
        .from("proposals")
        .select("id, status, total_snapshot_cents, created_at, clients(id, name), venues(name), payments(status), intake_responses(id)")
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

  const stats = [
    {
      label: "Total Clients",
      value: clientsRes.count ?? 0,
      icon: Users,
      href: "/admin/clients",
    },
    {
      label: "Active Proposals",
      value: proposalsRes.count ?? 0,
      icon: FileText,
      href: "/admin/proposals",
    },
    {
      label: "Services",
      value: servicesRes.count ?? 0,
      icon: Package,
      href: "/admin/services",
    },
    {
      label: "States",
      value: statesRes.count ?? 0,
      icon: MapPin,
      href: "/admin/states",
    },
  ];

  const recentProposals = recentProposalsRes.data ?? [];

  return (
    <div className="mx-auto max-w-[80rem]">
      {/* ─────────────── Header ─────────────── */}
      <header className="animate-rise flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div>
          <div className="flex items-center gap-3">
            <span className="h-px w-7 bg-lyp-cherry/30" />
            <span className="font-body text-[10px] font-medium uppercase tracking-[0.32em] text-lyp-cherry/70">
              Overview
            </span>
          </div>
          <h1 className="mt-3 font-heading text-[28px] font-bold leading-[1.05] tracking-[-0.03em] text-lyp-black">
            Dashboard
          </h1>
        </div>
        <p className="font-body text-[13px] text-[#8A7A7A]">
          Welcome to the LickYourPhone admin portal.
        </p>
      </header>

      {/* ─────────────── Stats ─────────────── */}
      <div
        className="animate-rise mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
        style={{ animationDelay: "80ms" }}
      >
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link
              key={stat.label}
              href={stat.href}
              className={`group flex items-center gap-3.5 rounded-2xl border border-[#EFE6E6] bg-lyp-white px-4 py-3.5 transition-all duration-500 ${EASE} hover:border-lyp-cherry/20 hover:shadow-[0_12px_28px_-16px_rgba(61,11,17,0.25)]`}
            >
              <span
                className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-lyp-cherry/[0.06] ring-1 ring-lyp-cherry/10 transition-transform duration-500 ${EASE} group-hover:scale-105`}
              >
                <Icon
                  strokeWidth={1.25}
                  className="h-4 w-4 text-lyp-cherry"
                />
              </span>

              <div className="min-w-0">
                <p className="font-heading text-[22px] font-bold leading-none tracking-[-0.03em] tabular-nums text-lyp-black">
                  {stat.value}
                </p>
                <p className="mt-1.5 truncate font-body text-[9px] font-medium uppercase tracking-[0.2em] text-[#A89898]">
                  {stat.label}
                </p>
              </div>

              <ArrowUpRight
                strokeWidth={1.5}
                className={`ml-auto h-3.5 w-3.5 flex-shrink-0 text-[#C3B5B5] transition-all duration-500 ${EASE} group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-lyp-cherry`}
              />
            </Link>
          );
        })}
      </div>

      {/* ─────────────── Quick actions ─────────────── */}
      <section
        className="animate-rise mt-8"
        style={{ animationDelay: "140ms" }}
      >
        <h2 className="font-heading text-[16px] font-bold tracking-[-0.02em] text-lyp-black">
          Quick Actions
        </h2>

        <div className="mt-3.5 flex flex-wrap gap-2.5">
          <Link
            href="/admin/proposals/new"
            className={`group inline-flex items-center gap-3 rounded-full bg-lyp-cherry py-1 pl-5 pr-1 font-body text-[12.5px] font-semibold tracking-wide text-lyp-white shadow-[0_10px_30px_-10px_rgba(178,38,38,0.5)] transition-all duration-500 ${EASE} hover:bg-[#c22e2e] hover:shadow-[0_14px_36px_-10px_rgba(178,38,38,0.6)] active:scale-[0.985]`}
          >
            New Proposal
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-full bg-lyp-white/15 transition-transform duration-500 ${EASE} group-hover:scale-105`}
            >
              <Plus strokeWidth={1.5} className="h-4 w-4" />
            </span>
          </Link>

          <Link
            href="/admin/clients/new"
            className={`group inline-flex items-center gap-3 rounded-full border border-[#EFE6E6] bg-lyp-white py-1 pl-5 pr-1 font-body text-[12.5px] font-semibold tracking-wide text-lyp-black transition-all duration-500 ${EASE} hover:border-lyp-cherry/25 hover:text-lyp-cherry active:scale-[0.985]`}
          >
            Add Client
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-full bg-[#F7F1F1] transition-transform duration-500 ${EASE} group-hover:scale-105`}
            >
              <Plus strokeWidth={1.5} className="h-4 w-4" />
            </span>
          </Link>

          <Link
            href="/admin/services"
            className={`group inline-flex items-center gap-3 rounded-full border border-[#EFE6E6] bg-lyp-white py-1 pl-5 pr-1 font-body text-[12.5px] font-semibold tracking-wide text-lyp-black transition-all duration-500 ${EASE} hover:border-lyp-cherry/25 hover:text-lyp-cherry active:scale-[0.985]`}
          >
            Manage Services
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-full bg-[#F7F1F1] transition-transform duration-500 ${EASE} group-hover:scale-105`}
            >
              <Package strokeWidth={1.5} className="h-4 w-4" />
            </span>
          </Link>
        </div>
      </section>

      {/* ─────────────── Recent proposals ─────────────── */}
      <section
        className="animate-rise mt-8"
        style={{ animationDelay: "200ms" }}
      >
        <div className="flex items-end justify-between gap-4">
          <h2 className="font-heading text-[16px] font-bold tracking-[-0.02em] text-lyp-black">
            Recent Proposals
          </h2>
          {recentProposals.length > 0 && (
            <Link
              href="/admin/proposals"
              className={`group inline-flex items-center gap-1.5 font-body text-[12px] font-semibold tracking-wide text-[#8A7A7A] transition-colors duration-500 ${EASE} hover:text-lyp-cherry`}
            >
              View all
              <ArrowRight
                strokeWidth={1.5}
                className={`h-3.5 w-3.5 transition-transform duration-500 ${EASE} group-hover:translate-x-0.5`}
              />
            </Link>
          )}
        </div>

        <div className="mt-3.5 overflow-hidden rounded-2xl border border-[#EFE6E6] bg-lyp-white">
          {recentProposals.length === 0 ? (
            <div className="px-8 py-12 text-center">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-lyp-cherry/[0.05] ring-1 ring-lyp-cherry/10">
                <FileText
                  strokeWidth={1}
                  className="h-6 w-6 text-lyp-cherry/60"
                />
              </span>
              <p className="mt-5 font-body text-[14px] text-[#8A7A7A]">
                No proposals yet.
              </p>
              <Link
                href="/admin/proposals/new"
                className={`mt-4 inline-flex items-center gap-2 font-body text-[13px] font-semibold text-lyp-cherry transition-opacity duration-500 ${EASE} hover:opacity-70`}
              >
                Create your first proposal
                <ArrowRight strokeWidth={1.5} className="h-3.5 w-3.5" />
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full font-body text-[12.5px]">
                <thead>
                  <tr className="border-b border-[#F1E8E8]">
                    {["Client", "Venue", "Status", "Total", "Created"].map(
                      (heading) => (
                        <th
                          key={heading}
                          className="whitespace-nowrap px-5 py-3 text-left text-[9px] font-medium uppercase tracking-[0.2em] text-[#A89898]"
                        >
                          {heading}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {recentProposals.map((proposal: any) => (
                    <tr
                      key={proposal.id}
                      className={`border-b border-[#F7F1F1] transition-colors duration-500 last:border-0 ${EASE} hover:bg-[#FBF8F8]`}
                    >
                      <td className="whitespace-nowrap px-5 py-3">
                        <Link
                          href={`/admin/clients/${proposal.clients?.id}`}
                          className={`font-medium text-lyp-black transition-colors duration-500 ${EASE} hover:text-lyp-cherry`}
                        >
                          {proposal.clients?.name ?? "Unknown"}
                        </Link>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-[#8A7A7A]">
                        {proposal.venues?.name ?? "—"}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3">
                        <span
                          className={`inline-block rounded-full px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] ${
                            statusStyles[proposal.status] ??
                            "bg-[#F2EDED] text-[#8A7A7A]"
                          }`}
                        >
                          {String(proposal.status ?? "—").replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 font-medium tabular-nums text-lyp-black">
                        {proposal.total_snapshot_cents
                          ? formatCents(proposal.total_snapshot_cents)
                          : "—"}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 tabular-nums text-[#A89898]">
                        {formatDate(proposal.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
