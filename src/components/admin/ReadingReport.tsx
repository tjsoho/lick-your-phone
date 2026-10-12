import { Eye } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * WHAT THE CLIENT ACTUALLY DID WITH THE PROPOSAL.
 *
 * The three things the agency said they get from PandaDoc and miss here:
 * "the date and time they last opened the proposal", a sense of their
 * activity, and "a heat map showing which pages the client spends the most
 * time on."
 *
 * The bars are relative to the longest page, not to an absolute scale. What
 * matters is which slide held them, not whether ninety seconds is a lot.
 */

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** 95s reads as "1m 35s"; 42s stays as "42s". Nobody wants 0.7 minutes. */
function formatSeconds(total: number): string {
  if (total < 60) return `${total}s`;
  const m = Math.floor(total / 60);
  const s = total % 60;
  return s === 0 ? `${m}m` : `${m}m ${s}s`;
}

/** "3 days ago", so a stalled proposal says so without arithmetic. */
function since(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  return `${days} days ago`;
}

export default function ReadingReport({
  firstViewedAt,
  lastViewedAt,
  furthestPage,
  pageSeconds,
  pageTitles,
}: {
  firstViewedAt: string | null;
  lastViewedAt: string | null;
  furthestPage: number | null;
  /** Slide index as a string, to seconds. */
  pageSeconds: Record<string, number>;
  /** Slide titles in deck order, so an index can be named. */
  pageTitles: string[];
}) {
  if (!firstViewedAt) {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-[#EFE6E6] bg-[#FCFAFA] px-4 py-3.5">
        <span className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#F7F1F1]">
          <Eye strokeWidth={1.25} className="h-4 w-4 text-[#867474]" />
        </span>
        <div>
          <p className="font-body text-[13px] font-semibold text-lyp-black">
            Not opened yet
          </p>
          <p className="mt-0.5 font-body text-[12px] text-[#6B5A5A]">
            Nothing to report until the client opens their link.
          </p>
        </div>
      </div>
    );
  }

  const rows = Object.entries(pageSeconds)
    .map(([index, seconds]) => ({
      index: Number(index),
      seconds: Number(seconds) || 0,
      title: pageTitles[Number(index)] ?? `Page ${Number(index) + 1}`,
    }))
    .filter((row) => row.seconds > 0)
    .sort((a, b) => b.seconds - a.seconds);

  const longest = rows[0]?.seconds ?? 0;
  const total = rows.reduce((sum, row) => sum + row.seconds, 0);

  return (
    <div className="rounded-2xl border border-[#EFE6E6] bg-[#FCFAFA] px-4 py-3.5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-lyp-cherry/[0.08]">
            <Eye strokeWidth={1.25} className="h-4 w-4 text-lyp-cherry" />
          </span>
          <div>
            <p className="font-body text-[13px] font-semibold text-lyp-black">
              How they read it
            </p>
            <p className="mt-0.5 font-body text-[12px] text-[#6B5A5A]">
              First opened {formatWhen(firstViewedAt)}
              {lastViewedAt && lastViewedAt !== firstViewedAt && (
                <>
                  {" · last opened "}
                  {formatWhen(lastViewedAt)}{" "}
                  <span className="text-[#867474]">({since(lastViewedAt)})</span>
                </>
              )}
            </p>
            <p className="mt-0.5 font-body text-[12px] text-[#6B5A5A]">
              {furthestPage != null
                ? `Read as far as ${pageTitles[furthestPage] ?? `page ${furthestPage + 1}`}`
                : "Reach not recorded"}
              {total > 0 && ` · ${formatSeconds(total)} in total`}
            </p>
          </div>
        </div>
      </div>

      {rows.length > 0 && (
        <div className="mt-4 border-t border-[#F1E8E8] pt-3.5">
          <p className="mb-2.5 font-body text-[10px] font-medium uppercase tracking-[0.22em] text-[#867474]">
            Where the time went
          </p>
          <ul className="space-y-1.5">
            {rows.map((row) => (
              <li key={row.index} className="flex items-center gap-3">
                <span className="w-[13rem] flex-shrink-0 truncate font-body text-[12px] text-lyp-black">
                  {row.title}
                </span>
                <span className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-[#F1E8E8]">
                  <span
                    className={cn(
                      "block h-full rounded-full",
                      // The page they lingered on longest is the story, so it
                      // is the only one in full cherry.
                      row.seconds === longest
                        ? "bg-lyp-cherry"
                        : "bg-lyp-cherry/35",
                    )}
                    style={{
                      width: `${longest > 0 ? Math.max(4, (row.seconds / longest) * 100) : 0}%`,
                    }}
                  />
                </span>
                <span className="w-16 flex-shrink-0 text-right font-body text-[12px] tabular-nums text-[#6B5A5A]">
                  {formatSeconds(row.seconds)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
