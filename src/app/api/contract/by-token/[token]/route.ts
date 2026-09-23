import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/utils/server";

/**
 * THE SIGNED CONTRACT, BY PORTAL TOKEN.
 *
 * `/api/contract/[id]` needs the document's own id, which only the response to
 * the signing action carries. A client who signed yesterday — or who signed a
 * moment ago and was carried on to payment — has no way to name that id, but
 * they do still hold their portal link. This resolves the latest contract for
 * that token, so the signed agreement has one address that keeps working.
 */
export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const supabase = await createClient();

  const { data: proposal, error: proposalErr } = await supabase
    .from("proposals")
    .select("id")
    .eq("token", token)
    .single();

  if (proposalErr || !proposal) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: doc } = await supabase
    .from("documents")
    .select("file_url, created_at")
    .eq("proposal_id", proposal.id)
    .eq("type", "contract")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!doc?.file_url) {
    return NextResponse.json(
      { error: "No signed contract yet." },
      { status: 404 },
    );
  }

  return NextResponse.redirect(doc.file_url);
}
