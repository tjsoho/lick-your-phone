import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import ServiceForm from "@/components/admin/ServiceForm";

const EASE = "ease-brand";

export default function NewServicePage() {
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
            New Service
          </span>
        </div>
        <h1 className="mt-3 font-heading text-[28px] font-bold leading-[1.05] tracking-[-0.03em] text-lyp-black">
          Add New Service
        </h1>
      </header>

      <ServiceForm />
    </div>
  );
}
