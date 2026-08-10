import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/server";
import { schedulePayment } from "@/lib/pinch";

export async function GET(req: Request) {
  const supabase = await createAdminClient();
  const MAX_RETRIES = 5;

  try {
    const { data: pendingSchedules, error: fetchErr } = await supabase
      .from("payment_schedules")
      .select("*, payments(pinch_payer_id, pinch_source_id)")
      .eq("status", "pending")
      .lt("retry_count", MAX_RETRIES)
      .limit(20);

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
        const newStatus = newRetryCount >= MAX_RETRIES ? "failed" : "pending";

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
