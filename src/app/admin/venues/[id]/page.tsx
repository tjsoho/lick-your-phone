import { getVenueById, getReferenceData } from "@/server-actions/venues";
import VenueForm from "@/components/admin/venues/VenueForm";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";

const EASE = "ease-brand";

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
    <div className="mx-auto max-w-3xl">
      <header className="animate-rise mb-6">
        <Link
          href="/admin/venues"
          className={`group inline-flex items-center gap-1.5 font-body text-[12px] font-semibold tracking-wide text-[#8A7A7A] transition-colors duration-500 ${EASE} hover:text-lyp-cherry`}
        >
          <ArrowLeft
            strokeWidth={1.5}
            aria-hidden="true"
            className={`h-3.5 w-3.5 transition-transform duration-500 ${EASE} group-hover:-translate-x-0.5`}
          />
          Venues
        </Link>

        <div className="mt-4 flex items-center gap-3">
          <span className="h-px w-7 bg-lyp-cherry/30" />
          <span className="font-body text-[10px] font-medium uppercase tracking-[0.32em] text-lyp-cherry/70">
            Location
          </span>
        </div>
        <h1 className="mt-3 font-heading text-[28px] font-bold leading-[1.05] tracking-[-0.03em] text-lyp-black">
          Edit Venue
        </h1>
      </header>

      <div className="animate-rise" style={{ animationDelay: "80ms" }}>
        <VenueForm venue={venue} clients={clients} states={states} />
      </div>
    </div>
  );
}
