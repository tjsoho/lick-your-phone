import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/utils/server";
import { ArrowLeft, FileText, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

const EASE = "ease-brand";

const thClasses =
  "whitespace-nowrap px-3 py-2 text-left font-body text-[9px] font-medium uppercase tracking-[0.2em] text-[#A89898]";

export default async function AdminIntakePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // Fetch proposal with client/venue
  const { data: proposal, error: proposalError } = await supabase
    .from("proposals")
    .select("id, status, clients(name), venues(name)")
    .eq("id", id)
    .single();

  if (proposalError || !proposal) return notFound();

  // Fetch intake questions
  const { data: questionsRaw } = await supabase
    .from("intake_questions")
    .select("id, page_number, section, field_label, field_type, sequence")
    .order("page_number", { ascending: true })
    .order("sequence", { ascending: true });

  // Fetch responses for this proposal
  const { data: responsesRaw } = await supabase
    .from("intake_responses")
    .select("question_id, value")
    .eq("proposal_id", id);

  // Fetch all Provider data for provider_picker questions
  const { data: providersRaw } = await supabase
    .from("providers")
    .select("id, name");

  const responseMap: Record<string, unknown> = {};
  for (const r of responsesRaw ?? []) {
    responseMap[r.question_id] = r.value;
  }

  const questions = (questionsRaw ?? []).filter(
    (q) => (q.field_type ?? "text") !== "static_content",
  );

  // Group by page_number then section
  const grouped: {
    page: number;
    section: string | null;
    items: { label: string; type: string; value: unknown }[];
  }[] = [];

  let currentKey = "";
  for (const q of questions) {
    const key = `${q.page_number}::${q.section ?? ""}`;
    if (key !== currentKey) {
      currentKey = key;
      grouped.push({ page: q.page_number, section: q.section, items: [] });
    }
    grouped[grouped.length - 1].items.push({
      label: q.field_label,
      type: q.field_type ?? "text",
      value: responseMap[q.id],
    });
  }

  const clientName =
    (proposal.clients as unknown as { name: string } | null)?.name ??
    "Proposal";

  return (
    <div className="mx-auto max-w-[64rem]">
      {/* ─────────────── Header ─────────────── */}
      <header className="animate-rise mb-6">
        <Link
          href={`/admin/proposals/${id}`}
          className={`group inline-flex items-center gap-1.5 font-body text-[12px] font-semibold tracking-wide text-[#8A7A7A] transition-colors duration-500 ${EASE} hover:text-lyp-cherry`}
        >
          <ArrowLeft
            strokeWidth={1.5}
            className={`h-3.5 w-3.5 transition-transform duration-500 ${EASE} group-hover:-translate-x-0.5`}
          />
          Back to proposal
        </Link>

        <div className="mt-4 flex items-center gap-3">
          <span className="h-px w-7 bg-lyp-cherry/30" />
          <span className="font-body text-[10px] font-medium uppercase tracking-[0.32em] text-lyp-cherry/70">
            Intake
          </span>
        </div>
        <h1 className="mt-3 font-heading text-[28px] font-bold leading-[1.05] tracking-[-0.03em] text-lyp-black">
          Intake Responses
        </h1>
        <p className="mt-2 font-body text-[13px] text-[#8A7A7A]">
          {clientName}
        </p>
      </header>

      {questions.length === 0 ? (
        <div
          className="animate-rise rounded-2xl border border-[#EFE6E6] bg-lyp-white px-8 py-12 text-center"
          style={{ animationDelay: "80ms" }}
        >
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-lyp-cherry/[0.05] ring-1 ring-lyp-cherry/10">
            <FileText strokeWidth={1} className="h-6 w-6 text-lyp-cherry/60" />
          </span>
          <p className="mt-5 font-body text-[14px] text-[#8A7A7A]">
            No intake responses submitted yet.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map((group, gi) => (
            <section
              key={gi}
              className={`animate-rise rounded-2xl border border-[#EFE6E6] bg-lyp-white p-5 transition-all duration-500 ${EASE} hover:shadow-[0_12px_28px_-16px_rgba(61,11,17,0.25)] sm:p-6`}
              style={{ animationDelay: `${Math.min(80 + gi * 60, 260)}ms` }}
            >
              {group.section && (
                <h2 className="border-b border-[#F1E8E8] pb-3 font-heading text-[16px] font-bold tracking-[-0.02em] text-lyp-black">
                  {group.section}
                </h2>
              )}
              <dl
                className={cn(
                  "grid gap-5 sm:grid-cols-2",
                  group.section && "mt-5",
                )}
              >
                {group.items.map((item, ii) => (
                  <div key={ii} className="min-w-0">
                    <dt className="font-body text-[10px] font-medium uppercase tracking-[0.22em] text-[#A89898]">
                      {item.label}
                    </dt>
                    <dd className="mt-1.5 break-words font-body text-[14px] text-lyp-black">
                      <ResponseValue
                        type={item.type}
                        value={item.value}
                        providers={providersRaw ?? []}
                      />
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function ResponseValue({
  type,
  value,
  providers,
}: {
  type: string;
  value: unknown;
  providers: { id: string; name: string }[];
}) {
  if (value == null || value === "") {
    return <span className="text-[#C3B5B5]">—</span>;
  }

  // File uploads: array of { name, url, size }
  if (type === "file" && Array.isArray(value)) {
    return (
      <ul className="space-y-1.5">
        {value.map(
          (f: { name?: string; url?: string; size?: number }, i: number) => (
            <li key={i} className="flex items-center gap-2">
              <a
                href={f.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center gap-1.5 font-body text-[13px] font-medium text-lyp-cherry transition-opacity duration-500 ${EASE} hover:opacity-70`}
              >
                {f.name ?? "File"}
                <ExternalLink strokeWidth={1.5} className="h-3 w-3" />
              </a>
            </li>
          ),
        )}
      </ul>
    );
  }

  // Provider picker: array of { id, name, ... }
  if (type === "provider_picker" && Array.isArray(value)) {
    return (
      <ul className="space-y-1">
        {value.map((p: string, i: number) => {
          const provider = (providers ?? []).find((prov) => prov.id === p);
          return (
            <li key={i} className="flex items-start gap-2">
              <span className="mt-[7px] h-1 w-1 flex-shrink-0 rounded-full bg-lyp-cherry/40" />
              {provider?.name ?? p ?? "Unknown"}
            </li>
          );
        })}
      </ul>
    );
  }

  // Checkbox / multiselect: array of strings
  if (Array.isArray(value)) {
    return <span>{value.join(", ")}</span>;
  }

  // Matrix: object with nested {row: {col: val}} (e.g. opening hours)
  if (typeof value === "object" && value !== null) {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return <span className="text-[#C3B5B5]">—</span>;

    // Detect nested objects (matrix format)
    const firstVal = entries[0][1];
    if (
      typeof firstVal === "object" &&
      firstVal !== null &&
      !Array.isArray(firstVal)
    ) {
      const cols = [
        ...new Set(
          entries.flatMap(([, v]) => Object.keys(v as Record<string, unknown>)),
        ),
      ];
      return (
        <div className="overflow-x-auto rounded-xl border border-[#EFE6E6]">
          <table className="w-full font-body text-[12px]">
            <thead>
              <tr className="border-b border-[#F1E8E8]">
                <th className={thClasses}></th>
                {cols.map((c) => (
                  <th key={c} className={thClasses}>
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.map(([row, v]) => (
                <tr
                  key={row}
                  className="border-b border-[#F7F1F1] last:border-0"
                >
                  <td className="whitespace-nowrap px-3 py-2 font-medium text-lyp-black">
                    {row}
                  </td>
                  {cols.map((c) => (
                    <td
                      key={c}
                      className="whitespace-nowrap px-3 py-2 tabular-nums text-[#8A7A7A]"
                    >
                      {String((v as Record<string, unknown>)[c] ?? "—")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    // Flat key-value object
    return (
      <div className="overflow-x-auto">
        <table className="w-full font-body text-[12.5px]">
          <tbody>
            {entries.map(([k, v]) => (
              <tr key={k} className="border-b border-[#F7F1F1] last:border-0">
                <td className="whitespace-nowrap py-1.5 pr-4 font-medium text-[#8A7A7A]">
                  {k}
                </td>
                <td className="py-1.5 text-lyp-black">{String(v)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return <span>{String(value)}</span>;
}
