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

/** An empty string clears the field; undefined leaves it as it was. */
function readTime(value: string | null | undefined, label: string) {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (Number.isNaN(new Date(value).getTime())) {
    throw new Error(`That ${label} isn't a valid date.`);
  }
  return value;
}

export type DiscountTimerPatch = {
  active?: boolean;
  /** When the discount switches itself on. Null means "the moment it is on". */
  startsAt?: string | null;
  expiresAt?: string | null;
};

/**
 * Switches the client-facing discount countdown on or off, or moves its window.
 *
 * The window has two ends. A start lets the team set the offer up during a
 * meeting and have it begin later; until then the client sees full prices even
 * with the switch on. Switching on without an end still in the future starts a
 * fresh countdown, so the client never opens a timer that has already run out.
 */
export async function setDiscountTimer(
  proposalId: string,
  patch: DiscountTimerPatch,
) {
  try {
    const patchStartsAt = readTime(patch.startsAt, "start time");
    const patchExpiresAt = readTime(patch.expiresAt, "end time");

    const supabase = await createClient();

    const { data: current, error: readError } = await supabase
      .from("proposals")
      .select(
        "discount_timer_active, discount_starts_at, discount_expires_at",
      )
      .eq("id", proposalId)
      .single();

    if (readError) throw readError;

    const active: boolean = patch.active ?? current.discount_timer_active;
    const startsAt: string | null =
      patchStartsAt !== undefined ? patchStartsAt : current.discount_starts_at;
    let expiresAt: string | null =
      patchExpiresAt !== undefined
        ? patchExpiresAt
        : current.discount_expires_at;

    // A fresh countdown runs from the start where one is scheduled, so a window
    // set up in a meeting for tomorrow still gets its full length.
    const from = startsAt ? new Date(startsAt).getTime() : Date.now();
    const hasEndAfterStart =
      expiresAt != null && new Date(expiresAt).getTime() > from;

    if (patch.active && !hasEndAfterStart) {
      const hours = await defaultTimerHours(supabase);
      expiresAt = new Date(from + hours * 3_600_000).toISOString();
    }

    // An offer that ends before it begins would never reach the client, and
    // nothing downstream would say why — so refuse it here.
    if (startsAt && expiresAt) {
      const start = new Date(startsAt).getTime();
      const end = new Date(expiresAt).getTime();
      if (end <= start) {
        throw new Error("The discount has to end after it starts.");
      }
    }

    const { error } = await supabase
      .from("proposals")
      .update({
        discount_timer_active: active,
        discount_starts_at: startsAt,
        discount_expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq("id", proposalId);

    if (error) throw error;

    revalidatePath(`/admin/proposals/${proposalId}`);
    return { data: { active, startsAt, expiresAt }, error: null };
  } catch (error) {
    return { data: null, error: (error as Error).message };
  }
}
