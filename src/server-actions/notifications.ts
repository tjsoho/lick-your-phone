"use server";

import { createAdminClient, createClient } from "@/utils/server";

/**
 * WHAT THE AGENCY WANTS TO BE TOLD.
 *
 * "maybe like a bell here, an internal notification, so that it shows when
 * something's been signed" — and deliberately only the big moments. Toby's
 * line on the call was that granular notifications (someone opened it, someone
 * hovered) would be a lot to build and more to ignore; these four are the ones
 * that change what the team does next.
 *
 * Read straight off the activity that is already audited, so there is no
 * second record to keep in step.
 */
const NOTIFIABLE = [
  "PROPOSAL_SIGNED",
  "PAYMENT_CAPTURED",
  "INTAKE_COMPLETED",
  "PAYMENT_FAILED",
] as const;

export type NotificationItem = {
  id: string;
  action: string;
  proposalId: string;
  createdAt: string;
  clientName: string | null;
  venueName: string | null;
};

export async function getNotifications(limit = 12) {
  try {
    // `audit_events` is closed to everyone but the service role, which is how
    // the proposal workspace reads it too. A server action is reachable by
    // anyone who can reach the app, so the staff session is checked first —
    // otherwise this would hand the activity log, client names included, to
    // whoever asked.
    const session = await createClient();
    const {
      data: { user },
    } = await session.auth.getUser();
    if (!user) return { data: [] as NotificationItem[], error: null };

    const supabase = await createAdminClient();

    const { data, error } = await supabase
      .from("audit_events")
      .select("id, action, entity_id, created_at, metadata")
      .eq("entity_type", "proposal")
      .in("action", NOTIFIABLE as unknown as string[])
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;

    const items: NotificationItem[] = (data ?? []).map((row) => {
      // The payloads differ by event: some carry the client at the top level,
      // some nest it. Neither shape is guaranteed, so a missing name just
      // leaves the line reading by its venue, or by neither.
      const meta = (row.metadata ?? {}) as Record<string, unknown>;
      const nested = (meta.client ?? {}) as Record<string, unknown>;
      const pick = (key: string) =>
        typeof meta[key] === "string"
          ? (meta[key] as string)
          : typeof nested[key] === "string"
            ? (nested[key] as string)
            : null;

      return {
        id: row.id,
        action: row.action,
        proposalId: row.entity_id,
        createdAt: row.created_at,
        clientName: pick("clientName"),
        venueName: pick("venueName"),
      };
    });

    return { data: items, error: null };
  } catch (error) {
    return { data: [] as NotificationItem[], error: (error as Error).message };
  }
}
