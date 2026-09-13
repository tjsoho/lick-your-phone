"use server";

import { createClient } from "@/utils/server";
import { revalidatePath } from "next/cache";

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** Used when no discounted service has a window set. */
const FALLBACK_HOURS = 48;

/**
 * How long a freshly started timer runs: the shortest discount window on any
 * discounted service, since that is the soonest one of those offers lapses.
 */
async function defaultTimerHours(supabase: Supabase) {
  const { data } = await supabase
    .from("services")
    .select("discount_window_hours")
    .gt("discount_pct", 0)
    .gt("discount_window_hours", 0);

  const hours = ((data ?? []) as { discount_window_hours: number | null }[])
    .map((row) => row.discount_window_hours)
    .filter((h): h is number => typeof h === "number" && h > 0);

  return hours.length > 0 ? Math.min(...hours) : FALLBACK_HOURS;
}

/**
 * Switches the client-facing discount countdown on or off, or moves its end.
 *
 * Switching on without an end still in the future starts a fresh countdown,
 * so the client never opens a timer that has already run out.
 */
export async function setDiscountTimer(
  proposalId: string,
  patch: { active?: boolean; expiresAt?: string },
) {
  try {
    if (patch.expiresAt && Number.isNaN(new Date(patch.expiresAt).getTime())) {
      throw new Error("That end time isn't a valid date.");
    }

    const supabase = await createClient();

    const { data: current, error: readError } = await supabase
      .from("proposals")
      .select("discount_timer_active, discount_expires_at")
      .eq("id", proposalId)
      .single();

    if (readError) throw readError;

    const active: boolean = patch.active ?? current.discount_timer_active;
    let expiresAt: string | null =
      patch.expiresAt ?? current.discount_expires_at;

    const hasFutureEnd =
      expiresAt != null && new Date(expiresAt).getTime() > Date.now();

    if (patch.active && !patch.expiresAt && !hasFutureEnd) {
      const hours = await defaultTimerHours(supabase);
      expiresAt = new Date(Date.now() + hours * 3_600_000).toISOString();
    }

    const { error } = await supabase
      .from("proposals")
      .update({
        discount_timer_active: active,
        discount_expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq("id", proposalId);

    if (error) throw error;

    revalidatePath(`/admin/proposals/${proposalId}`);
    return { data: { active, expiresAt }, error: null };
  } catch (error) {
    return { data: null, error: (error as Error).message };
  }
}
