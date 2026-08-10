import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/utils/server";
import { ArrowLeft, FileText, ExternalLink } from "lucide-react";

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
    <div className="max-w-4xl">
      <div className="mb-6">
        <Link
          href={`/admin/proposals/${id}`}
          className="text-sm text-gray-500 hover:text-lyp-cherry flex items-center gap-1 mb-3"
        >
          <ArrowLeft className="h-3 w-3" /> Back to proposal
        </Link>
        <div className="flex items-center gap-3">
          <FileText className="h-5 w-5 text-gray-400" />
          <h1 className="text-2xl font-heading font-bold text-lyp-black">
            Intake Responses — {clientName}
          </h1>
        </div>
      </div>

      {questions.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-sm text-gray-500">
            No intake responses submitted yet.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map((group, gi) => (
            <div
              key={gi}
              className="bg-white border border-gray-200 rounded-lg p-4"
            >
              {group.section && (
                <h2 className="text-sm font-heading font-semibold text-lyp-black mb-4 border-b border-gray-100 pb-2">
                  {group.section}
                </h2>
              )}
              <dl className="space-y-4">
                {group.items.map((item, ii) => (
                  <div key={ii}>
                    <dt className="text-xs font-medium text-gray-500 mb-1">
                      {item.label}
                    </dt>
                    <dd className="text-sm text-gray-900">
                      <ResponseValue
                        type={item.type}
                        value={item.value}
                        providers={providersRaw ?? []}
                      />
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
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
    return <span className="text-gray-400">—</span>;
  }

  // File uploads: array of { name, url, size }
  if (type === "file" && Array.isArray(value)) {
    return (
      <ul className="space-y-1">
        {value.map(
          (f: { name?: string; url?: string; size?: number }, i: number) => (
            <li key={i} className="flex items-center gap-2">
              <a
                href={f.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-lyp-cherry hover:underline flex items-center gap-1"
              >
                {f.name ?? "File"}
                <ExternalLink className="h-3 w-3" />
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
      <ul className="list-disc list-inside">
        {value.map((p: string, i: number) => {
          const provider = (providers ?? []).find((prov) => prov.id === p);
          return <li key={i}>{provider?.name ?? p ?? "Unknown"}</li>;
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
    if (entries.length === 0) return <span className="text-gray-400">—</span>;

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
        <table className="text-xs w-full border border-gray-100 rounded">
          <thead>
            <tr className="bg-gray-50">
              <th className="py-1.5 px-2 text-left font-medium text-gray-500"></th>
              {cols.map((c) => (
                <th
                  key={c}
                  className="py-1.5 px-2 text-left font-medium text-gray-500"
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {entries.map(([row, v]) => (
              <tr key={row} className="border-t border-gray-50">
                <td className="py-1.5 px-2 font-medium text-gray-700">{row}</td>
                {cols.map((c) => (
                  <td key={c} className="py-1.5 px-2 text-gray-900">
                    {String((v as Record<string, unknown>)[c] ?? "—")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    // Flat key-value object
    return (
      <table className="text-xs w-full">
        <tbody>
          {entries.map(([k, v]) => (
            <tr key={k} className="border-b border-gray-50">
              <td className="py-1 pr-3 font-medium text-gray-600">{k}</td>
              <td className="py-1">{String(v)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  return <span>{String(value)}</span>;
}
