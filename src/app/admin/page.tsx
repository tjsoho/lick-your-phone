import { createClient } from "@/utils/server";
import Link from "next/link";
import {
  Users,
  FileText,
  Package,
  MapPin,
  Plus,
  ArrowRight,
} from "lucide-react";
import { formatCents, formatDate } from "@/lib/format";

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
      color: "bg-blue-500",
    },
    {
      label: "Active Proposals",
      value: proposalsRes.count ?? 0,
      icon: FileText,
      href: "/admin/proposals",
      color: "bg-amber-500",
    },
    {
      label: "Services",
      value: servicesRes.count ?? 0,
      icon: Package,
      href: "/admin/services",
      color: "bg-emerald-500",
    },
    {
      label: "States",
      value: statesRes.count ?? 0,
      icon: MapPin,
      href: "/admin/states",
      color: "bg-purple-500",
    },
  ];

  const recentProposals = recentProposalsRes.data ?? [];

  const statusStyles: Record<string, string> = {
    draft: "bg-gray-100 text-gray-700",
    sent: "bg-blue-100 text-blue-700",
    signed: "bg-green-100 text-green-700",
    superseded: "bg-red-100 text-red-700",
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-heading font-bold text-lyp-black">
          Dashboard
        </h1>
        <p className="text-gray-600 mt-1 font-body">
          Welcome to the LickYourPhone admin portal.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link
              key={stat.label}
              href={stat.href}
              className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow group"
            >
              <div className="flex items-center justify-between mb-3">
                <div
                  className={`${stat.color} rounded-lg p-2.5 text-white`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-lyp-cherry transition-colors" />
              </div>
              <p className="text-2xl font-heading font-bold text-lyp-black">
                {stat.value}
              </p>
              <p className="text-sm text-gray-500 font-body">{stat.label}</p>
            </Link>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-lg font-heading font-bold text-lyp-black mb-4">
          Quick Actions
        </h2>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/admin/proposals/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-lyp-cherry text-white rounded-lg font-body text-sm font-semibold hover:bg-lyp-maroon transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Proposal
          </Link>
          <Link
            href="/admin/clients/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-lyp-black text-white rounded-lg font-body text-sm font-semibold hover:bg-gray-800 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Client
          </Link>
          <Link
            href="/admin/services"
            className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-300 text-lyp-black rounded-lg font-body text-sm font-semibold hover:border-lyp-cherry hover:text-lyp-cherry transition-colors"
          >
            <Package className="h-4 w-4" />
            Manage Services
          </Link>
        </div>
      </div>

      {/* Recent Proposals */}
      <div>
        <h2 className="text-lg font-heading font-bold text-lyp-black mb-4">
          Recent Proposals
        </h2>
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {recentProposals.length === 0 ? (
            <div className="p-8 text-center text-gray-500 font-body">
              <FileText className="h-10 w-10 mx-auto mb-3 text-gray-300" />
              <p>No proposals yet.</p>
              <Link
                href="/admin/proposals/new"
                className="text-lyp-cherry hover:underline text-sm mt-1 inline-block"
              >
                Create your first proposal
              </Link>
            </div>
          ) : (
            <table className="w-full text-sm font-body">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">
                    Client
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">
                    Venue
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">
                    Status
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">
                    Total
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {recentProposals.map((proposal: any) => (
                    <tr
                      key={proposal.id}
                      className="border-b border-gray-50 hover:bg-gray-50"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/clients/${proposal.clients?.id}`}
                          className="text-lyp-black hover:text-lyp-cherry"
                        >
                          {proposal.clients?.name ?? "Unknown"}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {proposal.venues?.name ?? "-"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${statusStyles[proposal.status] ?? ""}`}
                        >
                          {proposal.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {proposal.total_snapshot_cents
                          ? formatCents(proposal.total_snapshot_cents)
                          : "-"}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {formatDate(proposal.created_at)}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
