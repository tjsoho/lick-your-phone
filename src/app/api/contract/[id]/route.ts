import { createClient } from "@/utils/server"
import { NextRequest, NextResponse } from "next/server"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = await createClient()

  // Look up the document
  const { data: doc, error: docErr } = await supabase
    .from("documents")
    .select("id, proposal_id, file_url, type")
    .eq("id", id)
    .eq("type", "contract")
    .single()

  if (docErr || !doc) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 })
  }

  // Verify access: check for a matching proposal token in query params
  const token = request.nextUrl.searchParams.get("token")

  if (token) {
    const { data: proposal } = await supabase
      .from("proposals")
      .select("id")
      .eq("id", doc.proposal_id)
      .eq("token", token)
      .single()

    if (proposal) {
      return NextResponse.redirect(doc.file_url)
    }
  }

  // Alternatively, check if the user is authenticated (admin access)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    return NextResponse.redirect(doc.file_url)
  }

  return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
}
