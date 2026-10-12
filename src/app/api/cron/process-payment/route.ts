import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/server";
import { schedulePayment } from "@/lib/pinch";

/**
 * AUTOMATIC CHARGING IS OFF, AND STAYS OFF UNTIL SOMEONE MEANS IT.
 *
 * The agency does not take payments through this system: "we don't want
 * automatic payment we are simply storing details to pass on to accounting."
 * Details are captured in the portal and charged by hand elsewhere.
 *
 * This route used to be scheduled daily in vercel.json, at
 * `/api/cron/process-payments`. That path has a trailing "s" and this route
 * does not, so the job has been answering 404 every morning since it was
 * written and nothing has ever been charged by it. The cron entry has been
 * removed rather than corrected.
 *
 * The flag below is the real protection. At the time of writing there are ten
 * overdue schedules worth about $36,900 sitting in `pending`, left behind by
 * captures that happened while the job was silently broken. Correcting a path
 * one day and watching thirty-six thousand dollars leave ten clients' accounts
 * in one morning is exactly the accident this prevents. Nothing here runs
 * unless PAYMENTS_AUTOMATED is explicitly "true", and if that day comes those
 * stale rows want reviewing first.
 */
export async function GET() {
  if (process.env.PAYMENTS_AUTOMATED !== "true") {
    return NextResponse.json(
      {
        message:
          "Automatic payment processing is switched off. Payment details are " +
          "captured in the portal and charged by accounting. Set " +
          "PAYMENTS_AUTOMATED=true to enable this job, after reviewing any " +
          "schedules left pending.",
      },
      { status: 200 },
    );
  }

  const supabase = await createAdminClient();
  const todayStr = new Date().toISOString().split("T")[0];
  console.log("CRON: Processing payment schedules for date:", todayStr);
  const MAX_RETRIES = 6;

  try {
    const { data: pendingSchedules, error: fetchErr } = await supabase
      .from("payment_schedules")
      .select("*, payments(pinch_payer_id, pinch_source_id)")
      .in("status", ["pending", "dishonoured"])
      .lte("scheduled_date", todayStr)
      .lt("retry_count", MAX_RETRIES)
      .order("scheduled_date", { ascending: true });

    if (fetchErr || !pendingSchedules || pendingSchedules.length === 0) {
      return NextResponse.json({ message: "No pending schedules found." });
    }

    let successCount = 0;
    let failCount = 0;

    for (const schedule of pendingSchedules) {
      const payerId = schedule.payments.pinch_payer_id;
      const sourceId = schedule.payments.pinch_source_id;

      try {
        const pinchRes = await schedulePayment(
          payerId,
          sourceId,
          schedule.amount_cents,
          schedule.scheduled_date,
          schedule.idempotency_key + "-" + schedule.retry_count, // Append retry count to idempotency key
          schedule.description,
        );

        await supabase
          .from("payment_schedules")
          .update({
            status: "scheduled",
            pinch_payment_id: pinchRes.id,
          })
          .eq("id", schedule.id);

        successCount++;
      } catch (err) {
        console.error(`Failed to schedule payment ${schedule.id}:`, err);

        const newRetryCount = schedule.retry_count + 1;
        const newStatus =
          newRetryCount >= MAX_RETRIES ? "failed" : "dishonoured";

        await supabase
          .from("payment_schedules")
          .update({
            retry_count: newRetryCount,
            status: newStatus,
          })
          .eq("id", schedule.id);

        failCount++;
      }

      await new Promise((res) => setTimeout(res, 500));
    }

    return NextResponse.json({
      success: true,
      processed: pendingSchedules.length,
      successCount,
      failCount,
    });
  } catch (error) {
    console.error("CRON Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
