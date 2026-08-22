import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getService } from "@/server-actions/services";
import { notFound } from "next/navigation";
import ServiceForm from "@/components/admin/ServiceForm";
import ServiceTiersSection from "@/components/admin/services/ServiceTiersSection";

const EASE = "ease-brand";

export default async function EditServicePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { data: service, error } = await getService(slug);
  if (error || !service) return notFound();

  return (
    <div className="mx-auto max-w-[80rem]">
      <header className="animate-rise mb-6">
        <Link
          href="/admin/services"
          className={`group inline-flex items-center gap-1.5 font-body text-[12px] font-semibold tracking-wide text-[#8A7A7A] transition-colors duration-500 ${EASE} hover:text-lyp-cherry`}
        >
          <ArrowLeft
            strokeWidth={1.5}
            className={`h-3.5 w-3.5 transition-transform duration-500 ${EASE} group-hover:-translate-x-0.5`}
          />
          All services
        </Link>

        <div className="mt-4 flex items-center gap-3">
          <span className="h-px w-7 bg-lyp-cherry/30" />
          <span className="font-body text-[10px] font-medium uppercase tracking-[0.32em] text-lyp-cherry/70">
            Edit Service
          </span>
        </div>
        <h1 className="mt-3 font-heading text-[28px] font-bold leading-[1.05] tracking-[-0.03em] text-lyp-black">
          {service.name}
        </h1>
      </header>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
        <div
          className="animate-rise lg:col-span-2"
          style={{ animationDelay: "80ms" }}
        >
          <ServiceForm service={service} />
        </div>
        <div
          className="animate-rise lg:col-span-1"
          style={{ animationDelay: "140ms" }}
        >
          <ServiceTiersSection serviceId={service.id} />
        </div>
      </div>
    </div>
  );
}
