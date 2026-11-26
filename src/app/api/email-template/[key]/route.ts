import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/utils/server";
import { renderTemplate, sanitiseEmailHtml } from "@/lib/email-template";

/**
 * WHAT MAKE ASKS FOR, JUST BEFORE IT SENDS.
 *
 * Make posts the values it holds for a client, and gets back the subject and
 * the finished HTML. The copy itself lives in `email_templates`, where the
 * agency edits it, so a wording change reaches the next email without
 * anybody opening a scenario.
 *
 * Deliberately a POST rather than a GET with a query string: these bodies
 * carry a client's name, email and portal link, and a URL ends up in logs,
 * in proxies and in browser history. A body does not.
 *
 * It answers 200 with a `found: false` rather than a 404 when a key is
 * unknown. A 404 would stop the Make scenario dead and park the run, which
 * would mean a copy change could stop a client's email going out at all.
 * Make checks the flag and falls back to its own copy instead.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> },
) {
  const { key } = await params;

  let values: Record<string, unknown> = {};
  try {
    const body = await request.json();
    if (body && typeof body === "object") values = body as Record<string, unknown>;
  } catch {
    // An empty body is fine. The template may have no placeholders at all.
  }

  const supabase = await createAdminClient();
  const { data: template, error } = await supabase
    .from("email_templates")
    .select("key, title, subject, body_html, enabled, audience")
    .eq("key", key)
    .maybeSingle();

  if (error) {
    console.error(`[email-template] ${key} lookup failed:`, error.message);
    return NextResponse.json(
      { found: false, reason: "lookup-failed" },
      { status: 200 },
    );
  }

  if (!template || !template.enabled) {
    return NextResponse.json(
      { found: false, reason: template ? "disabled" : "unknown-key" },
      { status: 200 },
    );
  }

  // Lower-cased so Make can send `First_Name` without anybody noticing a
  // difference, which is the sort of thing that would otherwise be debugged
  // for an hour.
  const lowered: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(values)) lowered[k.toLowerCase()] = v;

  return NextResponse.json(
    {
      found: true,
      key: template.key,
      audience: template.audience,
      // Plain text. A subject line with markup in it is a broken subject line.
      subject: renderTemplate(template.subject, lowered).replace(/<[^>]*>/g, ""),
      html: sanitiseEmailHtml(renderTemplate(template.body_html, lowered)),
    },
    { status: 200, headers: { "Cache-Control": "no-store" } },
  );
}
