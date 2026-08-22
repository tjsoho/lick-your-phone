import { getReferenceData } from "@/server-actions/venues";
import VenueForm from "@/components/admin/venues/VenueForm";
import Link from "next/link";
import { ArrowLeft, AlertCircle } from "lucide-react";

const EASE = "ease-brand";

export default async function NewVenuePage() {
  const { data, error } = await getReferenceData();

  if (error) {
    return (
      <div className="mx-auto max-w-3xl">
        <div
          role="alert"
          className="animate-rise flex items-start gap-3 rounded-2xl border border-lyp-cherry/15 bg-lyp-cherry/[0.04] px-4 py-3.5"
        >
          <AlertCircle
            strokeWidth={1.25}
            className="mt-px h-4 w-4 flex-shrink-0 text-lyp-cherry"
          />
          <p className="font-body text-[13px] text-lyp-cherry">
            Error loading data: {error}
          </p>
        </div>
      </div>
    );
  }

  const clients = data?.clients || [];
  const states = data?.states || [];

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
            New Location
          </span>
        </div>
        <h1 className="mt-3 font-heading text-[28px] font-bold leading-[1.05] tracking-[-0.03em] text-lyp-black">
          Create Venue
        </h1>
      </header>

      <div className="animate-rise" style={{ animationDelay: "80ms" }}>
        <VenueForm clients={clients} states={states} />
      </div>
    </div>
  );
}
