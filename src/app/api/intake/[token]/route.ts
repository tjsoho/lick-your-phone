import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/utils/server";
import {
  generateIntakePdf,
  type PdfIntakeAnswer,
  type PdfIntakePage,
  type PdfIntakePair,
  type PdfIntakeSection,
} from "@/lib/pdf";
import { getIntakePageTitles } from "@/server-actions/intake-questions";

/**
 * THE ONBOARDING FORM, AS A FILE THE CLIENT CAN KEEP.
 *
 * The third of the three things waiting at the end of the journey, beside the
 * signed agreement and the terms. It is generated on request rather than
 * stored: the answers live in `intake_responses`, and rendering them when
 * asked means there is never a stale copy of a form the team has since had
 * corrected.
 *
 * Reached by proposal token, like its two neighbours — the client holds that
 * token in their portal link, and nothing else identifies them to us.
 */

// PDF rendering needs node (the font files are read off disk), and the answers
// are per-client, so nothing here may be cached.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ------------------------------------------------------------------ */
/*  Answer shapes                                                     */
/* ------------------------------------------------------------------ */

/**
 * What a repeating group's question config holds: the sub-fields one entry is
 * made of, and what to call an entry. Mirrors `RepeatableGroupField`.
 */
interface GroupConfig {
  subFields?: { key: string; label: string }[];
  entryLabel?: string;
}

/** "Team member" + 2 → "Team member 2"; "Stop {number}" + 2 → "Stop 2". */
function numbered(label: string, number: number): string {
  return label.includes("{number}")
    ? label.replaceAll("{number}", String(number))
    : `${label} ${number}`;
}

function text(value: unknown): string {
  return value == null ? "" : String(value).trim();
}

/** An object whose every value is itself an object — opening hours, and only. */
function isMatrix(obj: Record<string, unknown>): boolean {
  const values = Object.values(obj);
  return (
    values.length > 0 &&
    values.every((v) => typeof v === "object" && v !== null && !Array.isArray(v))
  );
}

/** A file answer: `[{ name, url, size }]`, straight from `FileField`. */
function isFileList(arr: unknown[]): boolean {
  return arr.every(
    (item) =>
      typeof item === "object" &&
      item !== null &&
      !Array.isArray(item) &&
      ("url" in item || "name" in item),
  );
}

/** The envelope line: "12 Smith St, Brisbane QLD 4000, Australia". */
function formatAddress(a: Record<string, unknown>): string {
  const locality = [text(a.city), text(a.state), text(a.postcode)]
    .filter(Boolean)
    .join(" ");
  return [text(a.street), locality, text(a.country)].filter(Boolean).join(", ");
}

/**
 * One stored answer, reduced to something printable — or null when there is
 * nothing to print.
 *
 * Every field type stores jsonb in its own shape, so this is where those
 * shapes are known: a phone is `{countryCode, number}`, an address is its
 * five parts, opening hours are `{row: {column: value}}`, a repeating group
 * is a list of rows keyed by the sub-field keys its config names, a
 * multiselect is an array of strings, and a file answer is a list of uploads.
 * Anything that arrives in a shape not named here still prints: an unknown
 * object becomes its own key/value rows rather than nothing at all.
 */
function toAnswer(
  value: unknown,
  fieldType: string,
  config: unknown,
  providerNames: Map<string, string>,
): PdfIntakeAnswer | null {
  if (value == null) return null;

  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? { kind: "text", text: trimmed } : null;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return { kind: "text", text: String(value) };
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return null;

    // Files: their names, and the address only when a name is missing. The
    // uploads themselves stay where they are — this is a record, not a bundle.
    if (isFileList(value)) {
      const items = value
        .map((f) => {
          const file = f as { name?: unknown; url?: unknown };
          return text(file.name) || text(file.url);
        })
        .filter(Boolean);
      return items.length ? { kind: "list", items } : null;
    }

    // A repeating group: one block per entry, each sub-field under the label
    // the question gives it.
    if (fieldType === "repeatable_group") {
      const group = (config as GroupConfig | null) ?? {};
      const subFields = group.subFields ?? [];
      const entryLabel = group.entryLabel?.trim() || "Entry";

      const entries = value
        .map((row, i) => {
          const record = (row ?? {}) as Record<string, unknown>;
          // The config's order is the order the client filled them in; any
          // key the config has since dropped still prints, under its key.
          const keys = [
            ...subFields.map((f) => f.key),
            ...Object.keys(record).filter(
              (k) => !subFields.some((f) => f.key === k),
            ),
          ];
          const pairs: PdfIntakePair[] = keys
            .map((key) => ({
              label: subFields.find((f) => f.key === key)?.label ?? key,
              value: text(record[key]),
            }))
            .filter((pair) => pair.value);
          return { title: numbered(entryLabel, i + 1), pairs };
        })
        .filter((entry) => entry.pairs.length > 0);

      return entries.length ? { kind: "entries", entries } : null;
    }

    // Chosen providers are stored as ids; the client chose them by name.
    const items = value
      .map((item) => {
        const asText = text(item);
        return providerNames.get(asText) ?? asText;
      })
      .filter(Boolean);
    return items.length ? { kind: "list", items } : null;
  }

  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;

    if ("countryCode" in obj || "number" in obj) {
      const phone = [text(obj.countryCode), text(obj.number)]
        .filter(Boolean)
        .join(" ");
      return phone ? { kind: "text", text: phone } : null;
    }

    if ("street" in obj || "postcode" in obj || "city" in obj) {
      const line = formatAddress(obj);
      return line ? { kind: "text", text: line } : null;
    }

    // Opening hours and anything else shaped like a grid: one row per row,
    // with the column named beside the value only when there is more than one.
    if (isMatrix(obj)) {
      const pairs: PdfIntakePair[] = [];
      for (const [row, cells] of Object.entries(obj)) {
        const record = cells as Record<string, unknown>;
        const columns = Object.entries(record).filter(([, v]) => text(v));
        if (columns.length === 0) continue;
        pairs.push({
          label: row,
          value:
            columns.length === 1
              ? text(columns[0][1])
              : columns.map(([col, v]) => `${col}: ${text(v)}`).join(", "),
        });
      }
      return pairs.length ? { kind: "pairs", pairs } : null;
    }

    const pairs: PdfIntakePair[] = Object.entries(obj)
      .map(([key, v]) => ({ label: key, value: text(v) }))
      .filter((pair) => pair.value);
    return pairs.length ? { kind: "pairs", pairs } : null;
  }

  return null;
}

/* ------------------------------------------------------------------ */
/*  Route                                                             */
/* ------------------------------------------------------------------ */

/** A file name the client will recognise in their downloads folder. */
function fileNameFor(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return slug
    ? `lickyourphone-onboarding-form-${slug}.pdf`
    : "lickyourphone-onboarding-form.pdf";
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const supabase = await createClient();

  const { data: proposal, error } = await supabase
    .from("proposals")
    .select(
      `id, status,
       client:clients!client_id ( name ),
       venue:venues!venue_id ( name )`,
    )
    .eq("token", token)
    .single();

  if (error || !proposal) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Nothing to hand back until the form has been handed in. A part-filled
  // form is still the client's to change, and a document of it would be a
  // record of something that never happened.
  if (proposal.status !== "intake_complete") {
    return NextResponse.json(
      { error: "The onboarding form has not been submitted yet." },
      { status: 404 },
    );
  }

  const [
    { data: questions },
    { data: responses },
    { data: pageTitles },
    { data: providers },
  ] = await Promise.all([
    supabase
      .from("intake_questions")
      .select("id, page_number, section, field_label, field_type, config")
      // Hidden questions never reached this client's screen, so they are not
      // part of what they submitted — the same filter the form itself uses.
      .eq("hidden", false)
      .order("page_number", { ascending: true })
      .order("sequence", { ascending: true }),
    supabase
      .from("intake_responses")
      .select("question_id, value, created_at")
      .eq("proposal_id", proposal.id),
    getIntakePageTitles(),
    supabase.from("providers").select("id, name"),
  ]);

  if (!responses || responses.length === 0) {
    return NextResponse.json(
      { error: "No onboarding answers were found." },
      { status: 404 },
    );
  }

  const answerFor = new Map<string, unknown>(
    responses.map((r) => [r.question_id, r.value]),
  );
  const providerNames = new Map<string, string>(
    (providers ?? []).map((p) => [p.id, p.name]),
  );

  // Page, then section, then question — the order the form asks them in,
  // which is the order the client filled them in.
  const pages: PdfIntakePage[] = [];
  let currentPage: number | null = null;
  let currentSection: string | null | undefined = undefined;

  for (const q of questions ?? []) {
    // Static content is the form talking to the client, not a question they
    // answered, so it has no place in a record of their answers.
    if (q.field_type === "static_content") continue;

    const answer = toAnswer(
      answerFor.get(q.id),
      q.field_type ?? "text",
      q.config,
      providerNames,
    );
    // Skipped, conditioned away, or simply left blank: all the same here.
    if (!answer) continue;

    if (q.page_number !== currentPage) {
      currentPage = q.page_number;
      currentSection = undefined;
      pages.push({
        title: pageTitles?.[q.page_number] ?? `Page ${q.page_number}`,
        sections: [],
      });
    }

    const page = pages[pages.length - 1];
    if (q.section !== currentSection) {
      currentSection = q.section;
      const section: PdfIntakeSection = {
        heading: currentSection ?? null,
        questions: [],
      };
      page.sections.push(section);
    }

    page.sections[page.sections.length - 1].questions.push({
      label: q.field_label,
      answer,
    });
  }

  if (pages.length === 0) {
    return NextResponse.json(
      { error: "No onboarding answers were found." },
      { status: 404 },
    );
  }

  const client = proposal.client as unknown as { name: string } | null;
  const venue = proposal.venue as unknown as { name: string } | null;

  // The last answer saved is when the form was handed in.
  const submittedAt = responses
    .map((r) => r.created_at)
    .filter(Boolean)
    .sort()
    .pop();

  const pdf = await generateIntakePdf({
    pages,
    venueName: venue?.name ?? null,
    clientName: client?.name ?? null,
    generatedAt: new Date().toISOString(),
    submittedAt: submittedAt ?? null,
  });

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileNameFor(
        venue?.name ?? client?.name ?? "",
      )}"`,
      "Cache-Control": "no-store",
    },
  });
}
