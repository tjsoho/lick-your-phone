import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/utils/server";
import { logAuditEvent } from "@/lib/audit-service";

/**
 * THE CLIENT OPENED THEIR PROPOSAL.
 *
 * The agency asked to know this: "sometimes people just open it and they don't
 * really start completing it, so it makes us understand the status — whether
 * they're doubting, whether to chase." And, if we could manage it, how far
 * they read.
 *
 * Three facts are kept on the proposal itself, because the pipeline list wants
 * them at a glance: when it was first opened, when it was last opened, and the
 * furthest slide reached. The first open is also written to the activity
 * timeline, so the proposal's own history reads in order.
 *
 * Deliberately a fire-and-forget POST from the portal rather than a write in
 * the page's render: a server component re-renders for reasons that have
 * nothing to do with the client (a revalidation, a refetch), and each of those
 * would otherwise look like a fresh visit.
 */
export async function POST(request: NextRequest) {
  try {
    const { token, page } = (await request.json()) as {
      token?: unknown;
      page?: unknown;
    };

    if (typeof token !== "string" || !token) {
      return NextResponse.json({ error: "Missing token" }, { status: 400 });
    }

    // The slide index is advisory — a malformed one costs us the page number,
    // not the visit.
    const pageIndex =
      typeof page === "number" && Number.isFinite(page) && page >= 0
        ? Math.floor(page)
        : null;

    // Service role: the client holds no session, and this is the one write
    // their visit is allowed to make.
    const supabase = await createAdminClient();

    const { data: proposal } = await supabase
      .from("proposals")
      .select("id, status, first_viewed_at, furthest_page")
      .eq("token", token)
      .single();

    // An unknown token is not an error worth telling the caller about: there
    // is nothing here for them either way.
    if (!proposal) return NextResponse.json({ ok: true });

    const now = new Date().toISOString();
    const firstVisit = !proposal.first_viewed_at;

    const update: Record<string, unknown> = { last_viewed_at: now };
    if (firstVisit) update.first_viewed_at = now;
    if (
      pageIndex !== null &&
      (proposal.furthest_page == null || pageIndex > proposal.furthest_page)
    ) {
      update.furthest_page = pageIndex;
    }

    await supabase.from("proposals").update(update).eq("id", proposal.id);

    if (firstVisit) {
      // Only the first one. A client who returns four times should not push
      // the rest of the timeline off the page.
      await logAuditEvent(proposal.id, "PROPOSAL_VIEWED", {
        firstViewedAt: now,
      });
    }

    return NextResponse.json({ ok: true });
  } catch {
    // Never let tracking break a client's proposal.
    return NextResponse.json({ ok: true });
  }
}
