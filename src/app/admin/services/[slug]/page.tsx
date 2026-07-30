import { getService } from "@/server-actions/services";
import { notFound } from "next/navigation";
import ServiceForm from "@/components/admin/ServiceForm";

export default async function EditServicePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { data: service, error } = await getService(slug);
  if (error || !service) return notFound();

  return (
    <div>
      <h1 className="text-2xl font-heading font-bold text-lyp-black mb-6">Edit: {service.name}</h1>
      <ServiceForm service={service} />
    </div>
  );
}
