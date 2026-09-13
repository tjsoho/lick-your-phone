import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";

const EASE = "ease-brand";

type Neighbour = { id: string; title: string | null } | null;

type Props = {
  previous: Neighbour;
  next: Neighbour;
  position: number;
  total: number;
};

const pill = `group flex min-w-0 items-center gap-2.5 rounded-full border border-[#EFE6E6] bg-lyp-white py-1.5 pl-2 pr-4 font-body text-[12.5px] font-semibold tracking-wide text-lyp-black transition-all duration-500 ${EASE} hover:border-lyp-cherry/25 hover:text-lyp-cherry active:scale-[0.985]`;

const icon = `flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[#F7F1F1] transition-transform duration-500 ${EASE}`;

/**
 * Step through the deck in its client-facing order, so editing several pages
 * in a row doesn't mean returning to the list between each one.
 */
export default function PageEditorNav({
  previous,
  next,
  position,
  total,
}: Props) {
  return (
    <nav
      aria-label="Page navigation"
      className="flex items-center justify-between gap-3"
    >
      {previous ? (
        <Link
          href={`/admin/pages/${previous.id}`}
          className={`${pill} pr-5`}
          aria-label={`Previous page: ${previous.title ?? "Untitled"}`}
        >
          <span className={`${icon} group-hover:-translate-x-0.5`}>
            <ArrowLeft strokeWidth={1.5} className="h-3.5 w-3.5" />
          </span>
          <span className="min-w-0">
            <span className="block font-body text-[9px] font-medium uppercase tracking-[0.2em] text-[#A89898]">
              Previous
            </span>
            <span className="block truncate">
              {previous.title ?? "Untitled"}
            </span>
          </span>
        </Link>
      ) : (
        <span aria-hidden className="flex-1" />
      )}

      <span className="flex-shrink-0 font-body text-[11px] tabular-nums tracking-wide text-[#A89898]">
        {position} / {total}
      </span>

      {next ? (
        <Link
          href={`/admin/pages/${next.id}`}
          className={`${pill} pl-5 pr-2 text-right`}
          aria-label={`Next page: ${next.title ?? "Untitled"}`}
        >
          <span className="min-w-0">
            <span className="block font-body text-[9px] font-medium uppercase tracking-[0.2em] text-[#A89898]">
              Next
            </span>
            <span className="block truncate">{next.title ?? "Untitled"}</span>
          </span>
          <span className={`${icon} group-hover:translate-x-0.5`}>
            <ArrowRight strokeWidth={1.5} className="h-3.5 w-3.5" />
          </span>
        </Link>
      ) : (
        <span aria-hidden className="flex-1" />
      )}
    </nav>
  );
}
