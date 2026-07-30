import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Pinch webhook handler
 *
 * Receives payment status updates (settled, dishonoured, failed, etc.)
 * and updates the corresponding payment_schedules record.
 *
 * Uses the Supabase service-role client (no cookies needed for webhooks).
 */

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("Supabase credentials not configured for webhook handler");
  }
  return createClient(url, key);
}

/* ------------------------------------------------------------------ */
/*  Webhook event types we care about                                 */
/* ------------------------------------------------------------------ */

const STATUS_MAP: Record<string, string> = {
  "payment.settled": "settled",
  "payment.dishonoured": "dishonoured",
  "payment.failed": "failed",
  "payment.pending": "pending",
};

/* ------------------------------------------------------------------ */
/*  POST /api/webhooks/pinch                                          */
/* ------------------------------------------------------------------ */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const eventType = body.event || body.eventType;
    const paymentData = body.data || body.payment || {};
    const pinchPaymentId = paymentData.id || paymentData.paymentId;

    if (!eventType || !pinchPaymentId) {
      return NextResponse.json(
        { error: "Missing event type or payment ID" },
        { status: 400 }
      );
    }

    const newStatus = STATUS_MAP[eventType];
    if (!newStatus) {
      // Event type we don't handle — acknowledge it
      return NextResponse.json({ ok: true, ignored: true });
    }

    const supabase = getSupabaseAdmin();

    // Update the payment schedule record
    const { data: schedule, error: scheduleErr } = await supabase
      .from("payment_schedules")
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("pinch_payment_id", pinchPaymentId)
      .select("id, payment_id")
      .single();

    if (scheduleErr) {
      // Log but still return 200 to prevent Pinch from retrying
      console.error("Webhook: failed to update schedule:", scheduleErr.message);
      return NextResponse.json({ ok: true, warning: "Schedule not found" });
    }

    // If settled or failed, check if all schedules for this payment are resolved
    if (newStatus === "settled" || newStatus === "failed" || newStatus === "dishonoured") {
      const { data: allSchedules } = await supabase
        .from("payment_schedules")
        .select("status")
        .eq("payment_id", schedule.payment_id);

      const allSettled = allSchedules?.every((s) => s.status === "settled");
      const anyFailed = allSchedules?.some(
        (s) => s.status === "failed" || s.status === "dishonoured"
      );

      if (allSettled) {
        await supabase
          .from("payments")
          .update({ status: "settled", updated_at: new Date().toISOString() })
          .eq("id", schedule.payment_id);
      } else if (anyFailed) {
        await supabase
          .from("payments")
          .update({ status: newStatus, updated_at: new Date().toISOString() })
          .eq("id", schedule.payment_id);
      }
    }

    // Write audit event
    await supabase.from("audit_events").insert({
      event_type: `pinch_webhook_${newStatus}`,
      payload: {
        pinch_payment_id: pinchPaymentId,
        schedule_id: schedule.id,
        payment_id: schedule.payment_id,
        raw_event: eventType,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Webhook error:", (error as Error).message);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
