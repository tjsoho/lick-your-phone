import { getService } from "@/server-actions/services";
import { notFound } from "next/navigation";
import ServiceForm from "@/components/admin/ServiceForm";
import ServiceTiersSection from "@/components/admin/services/ServiceTiersSection";

export default async function EditServicePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { data: service, error } = await getService(slug);
  if (error || !service) return notFound();

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-heading font-bold text-lyp-black">
        Edit: {service.name}
      </h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-2">
          <ServiceForm service={service} />
        </div>
        <div className="lg:col-span-1">
          <ServiceTiersSection serviceId={service.id} />
        </div>
      </div>
    </div>
  );
}
