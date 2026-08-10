import { getReferenceData } from "@/server-actions/venues";
import VenueForm from "@/components/admin/venues/VenueForm";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default async function NewVenuePage() {
  const { data, error } = await getReferenceData();

  if (error) {
    return (
      <div className="p-8">
        <div className="text-red-500">Error loading data: {error}</div>
      </div>
    );
  }

  const clients = data?.clients || [];
  const states = data?.states || [];

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
          Create Venue
        </h1>
      </div>

      <VenueForm clients={clients} states={states} />
    </div>
  );
}
