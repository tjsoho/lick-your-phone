import Link from "next/link";
import { getServices } from "@/server-actions/services";
import { formatCents } from "@/lib/format";
import { cn } from "@/lib/utils";
import { AlertCircle, Package, Plus } from "lucide-react";

const EASE = "ease-brand";

const thClasses =
  "whitespace-nowrap px-5 py-3 text-left font-body text-[9px] font-medium uppercase tracking-[0.2em] text-[#A89898]";

/** Muted, tonal pills — saturated Tailwind defaults read cheap next to the brand. */
const billingStyles: Record<string, string> = {
  one_off: "bg-[#EDF1F7] text-[#5B7394]",
  recurring_monthly: "bg-[#E9F2EC] text-[#4A7A5C]",
  in_kind: "bg-[#FBF3E3] text-[#9A7B2E]",
};

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
    <div className="mx-auto max-w-[80rem]">
      <header className="animate-rise mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="h-px w-7 bg-lyp-cherry/30" />
            <span className="font-body text-[10px] font-medium uppercase tracking-[0.32em] text-lyp-cherry/70">
              Catalogue
            </span>
          </div>
          <h1 className="mt-3 font-heading text-[28px] font-bold leading-[1.05] tracking-[-0.03em] text-lyp-black">
            Services
          </h1>
        </div>

        <Link
          href="/admin/services/new"
          className={`group inline-flex items-center gap-3 rounded-full bg-lyp-cherry py-1.5 pl-6 pr-1.5 font-body text-[13px] font-semibold tracking-wide text-lyp-white shadow-[0_10px_30px_-10px_rgba(178,38,38,0.5)] transition-all duration-500 ${EASE} hover:bg-[#c22e2e] active:scale-[0.985]`}
        >
          Add Service
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
            Failed to load services: {error}
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
                <th className={thClasses}>Name</th>
                <th className={thClasses}>Billing</th>
                <th className={thClasses}>Price</th>
                <th className={thClasses}>Discount</th>
                <th className={cn(thClasses, "text-right")}>Sequence</th>
              </tr>
            </thead>
            <tbody>
              {services && services.length > 0 ? (
                services.map((service) => (
                  <tr
                    key={service.id}
                    className={`border-b border-[#F7F1F1] transition-colors duration-500 last:border-0 ${EASE} hover:bg-[#FBF8F8]`}
                  >
                    <td className="whitespace-nowrap px-5 py-3">
                      <Link
                        href={`/admin/services/${service.slug}`}
                        className={`font-medium text-lyp-black transition-colors duration-500 ${EASE} hover:text-lyp-cherry`}
                      >
                        {service.name}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3">
                      <span
                        className={cn(
                          "inline-block rounded-full px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em]",
                          billingStyles[service.billing] ??
                            "bg-[#F2EDED] text-[#8A7A7A]",
                        )}
                      >
                        {getBillingLabel(service.billing)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 font-medium tabular-nums text-lyp-black">
                      {getPrice(service)}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 tabular-nums text-[#8A7A7A]">
                      {service.discount_pct != null
                        ? `${Math.round(service.discount_pct * 100)}%`
                        : "—"}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-right tabular-nums text-[#A89898]">
                      {service.sequence ?? "—"}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-8 py-12 text-center">
                    <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-lyp-cherry/[0.05] ring-1 ring-lyp-cherry/10">
                      <Package
                        strokeWidth={1}
                        className="h-6 w-6 text-lyp-cherry/60"
                      />
                    </span>
                    <p className="mt-5 font-body text-[14px] text-[#8A7A7A]">
                      No services yet.
                    </p>
                    <Link
                      href="/admin/services/new"
                      className={`mt-3 inline-block font-body text-[13px] font-semibold text-lyp-cherry transition-opacity duration-500 ${EASE} hover:opacity-70`}
                    >
                      Add your first service
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
