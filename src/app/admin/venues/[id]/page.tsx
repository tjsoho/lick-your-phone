import { getVenueById, getReferenceData } from "@/server-actions/venues";
import VenueForm from "@/components/admin/venues/VenueForm";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { notFound } from "next/navigation";

export default async function EditVenuePage(props: {
  params: Promise<{ id: string }>;
}) {
  const params = await props.params;
  const [venueRes, refRes] = await Promise.all([
    getVenueById(params.id),
    getReferenceData(),
  ]);

  if (venueRes.error || refRes.error || !venueRes.data) {
    notFound();
  }

  const venue = venueRes.data;
  const clients = refRes.data?.clients || [];
  const states = refRes.data?.states || [];

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <Link
          href="/admin/venues"
          className="text-gray-500 hover:text-lyp-black transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="font-heading text-2xl font-bold text-lyp-black">
          Edit Venue
        </h1>
      </div>

      <VenueForm venue={venue} clients={clients} states={states} />
    </div>
  );
}
