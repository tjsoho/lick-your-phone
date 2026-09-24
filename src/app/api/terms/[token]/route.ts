import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/utils/server";
import { generateTermsPdf } from "@/lib/pdf";
import {
  getAgreementSettings,
  getTermsClauses,
} from "@/server-actions/agreement-settings";
import { resolveTermsTarget } from "@/lib/terms";

/**
 * THE FULL TERMS, AS ONE ADDRESS.
 *
 * Everywhere the portal offers the full terms it points here, and this route
 * decides what "the full terms" is today: the document the agency uploaded,
 * the T&Cs they host themselves, or the clause list rendered on request by the
 * generator that draws the signed contracts. The order is `resolveTermsTarget`
 * in src/lib/terms.ts and lives nowhere else, so a setting changed in Settings
 * is live on the next click with nothing else to update.
 *
 * Reached by proposal token rather than an id: the client already holds that
 * token in their portal link, and nothing else identifies them to us.
 */

// pdf rendering needs node (the font files are read off disk), and the terms
// change whenever the agency edits them, so nothing here may be cached.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** A file name the client will recognise in their downloads folder. */
function fileNameFor(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return slug
    ? `lickyourphone-terms-and-conditions-${slug}.pdf`
    : "lickyourphone-terms-and-conditions.pdf";
}

/**
 * A stored address we are prepared to redirect to, or nothing.
 *
 * Settings only accepts an absolute http(s) link and uploads always produce
 * one, so this is the belt to that braces: a hand-edited row can't turn a
 * client's click into a 500.
 */
/**
 * Send them on, without letting the browser remember where to.
 *
 * The same link has to follow the agency's settings: someone who opened the
 * generated PDF this morning must get the uploaded document this afternoon,
 * not a cached hop to yesterday's answer.
 */
function redirectTo(url: URL): NextResponse {
  const response = NextResponse.redirect(url, { status: 302 });
  response.headers.set("Cache-Control", "no-store");
  return response;
}

function absolute(href: string): URL | null {
  try {
    const url = new URL(href);
    return url.protocol === "https:" || url.protocol === "http:" ? url : null;
  } catch {
    return null;
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const supabase = await createClient();

  const [{ data: proposal, error }, settings, clauses] = await Promise.all([
    supabase
      .from("proposals")
      .select(
        `id, status,
       client:clients!client_id ( name ),
       venue:venues!venue_id ( name )`,
      )
      .eq("token", token)
      .single(),
    getAgreementSettings(),
    getTermsClauses(),
  ]);

  if (error || !proposal) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const target = resolveTermsTarget({
    termsDocumentUrl: settings.termsDocumentUrl,
    termsDocumentName: settings.termsDocumentName,
    termsUrl: settings.termsUrl,
    clauseCount: clauses.length,
  });

  // The agency's own document. Handed over as a download, because the client
  // is meant to keep it: Supabase honours `?download=` on a public object and
  // names the file, so they get "terms.pdf" rather than a timestamped key.
  if (target.kind === "document") {
    const url = absolute(target.href);
    if (url) {
      url.searchParams.set(
        "download",
        target.fileName ?? "terms-and-conditions",
      );
      return redirectTo(url);
    }
  }

  // The agency's own page. Left as a plain redirect — it is a website, and the
  // portal opens this link in a new tab so the signing slide is not lost.
  if (target.kind === "link") {
    const url = absolute(target.href);
    if (url) return redirectTo(url);
  }

  // Either nothing is set, or what is set isn't an address we can send anyone
  // to. Both fall back to the clauses, which are always ours to render.
  if (clauses.length === 0) {
    return NextResponse.json(
      { error: "No terms have been published yet." },
      { status: 404 },
    );
  }

  const client = proposal.client as unknown as { name: string } | null;
  const venue = proposal.venue as unknown as { name: string } | null;

  const pdf = await generateTermsPdf({
    clauses,
    venueName: venue?.name ?? null,
    clientName: client?.name ?? null,
    generatedAt: new Date().toISOString(),
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
