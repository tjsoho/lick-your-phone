import Link from "next/link";
import { getServices } from "@/server-actions/services";
import { formatCents } from "@/lib/format";

function getBillingLabel(billing: string) {
  switch (billing) {
    case "one_off":
      return "One-off";
    case "recurring_monthly":
      return "Monthly";
    case "in_kind":
      return "In Kind";
    default:
      return billing;
  }
}

function getPrice(service: {
  billing: string;
  target_price_cents?: number;
  service_tiers?: { target_price_cents: number }[];
}) {
  if (service.billing === "in_kind") return "Paid in kind";

  if (
    service.billing === "recurring_monthly" &&
    service.service_tiers &&
    service.service_tiers.length > 0
  ) {
    const lowestTierPrice = Math.min(
      ...service.service_tiers.map((t) => t.target_price_cents),
    );
    return `From ${formatCents(lowestTierPrice)}/wk`;
  }

  if (service.target_price_cents != null) {
    return formatCents(service.target_price_cents);
  }

  return "—";
}

export default async function ServicesPage() {
  const { data: services, error } = await getServices();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-heading font-bold text-lyp-black">
          Services
        </h1>
        <Link
          href="/admin/services/new"
          className="bg-lyp-cherry text-white px-4 py-2 rounded-md font-body text-sm hover:bg-lyp-maroon transition-colors"
        >
          Add Service
        </Link>
      </div>

      {error && (
        <p className="text-red-600 mb-4">Failed to load services: {error}</p>
      )}

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-4 py-3 font-heading text-sm font-semibold text-lyp-black">
                Name
              </th>
              <th className="px-4 py-3 font-heading text-sm font-semibold text-lyp-black">
                Billing
              </th>
              <th className="px-4 py-3 font-heading text-sm font-semibold text-lyp-black">
                Price
              </th>
              <th className="px-4 py-3 font-heading text-sm font-semibold text-lyp-black">
                Discount
              </th>
              <th className="px-4 py-3 font-heading text-sm font-semibold text-lyp-black">
                Sequence
              </th>
            </tr>
          </thead>
          <tbody>
            {services && services.length > 0 ? (
              services.map((service) => (
                <tr
                  key={service.id}
                  className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/services/${service.slug}`}
                      className="text-lyp-cherry font-body text-sm hover:underline"
                    >
                      {service.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-body text-sm text-gray-700">
                    {getBillingLabel(service.billing)}
                  </td>
                  <td className="px-4 py-3 font-body text-sm text-gray-700">
                    {getPrice(service)}
                  </td>
                  <td className="px-4 py-3 font-body text-sm text-gray-700">
                    {service.discount_pct != null
                      ? `${Math.round(service.discount_pct * 100)}%`
                      : "—"}
                  </td>
                  <td className="px-4 py-3 font-body text-sm text-gray-700">
                    {service.sequence ?? "—"}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-8 text-center font-body text-sm text-gray-500"
                >
                  No services found. Add your first service to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
