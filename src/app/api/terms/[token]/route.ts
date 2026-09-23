import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/utils/server";
import { generateTermsPdf } from "@/lib/pdf";
import { getTermsClauses } from "@/server-actions/agreement-settings";

/**
 * THE TERMS, AS A FILE THE CLIENT CAN KEEP.
 *
 * The signing slide reads the terms on screen; this is the same terms to take
 * away. There is no second document for the agency to maintain — the clauses
 * are Agreement Settings' own, rendered on request by the generator that
 * draws the signed contracts, so a wording change in Settings is live on the
 * next download.
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

  const clauses = await getTermsClauses();

  // Nothing published yet. The slide hides the download in that case, so this
  // is only reachable by someone holding an old link to it.
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
