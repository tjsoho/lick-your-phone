import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import { dispatchNotification } from "@/lib/notification-service";
import { logAuditEvent } from "@/lib/audit-service";

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
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("Supabase credentials not configured for webhook handler");
  }
  return createClient(url, key);
}

function verifyPinchSignature(
  rawBody: string,
  signatureHeader: string,
  secret: string,
): boolean {
  // 1. Pecah header (contoh: "t=1619577772,v2=e5db0532...")
  const parts = signatureHeader
    .split(",")
    .reduce<Record<string, string>>((acc, part) => {
      const [key, val] = part.split("=");
      acc[key] = val;
      return acc;
    }, {});

  const { t: timestamp, v2: signature } = parts as { t?: string; v2?: string };

  if (!timestamp || !signature) return false;

  // 2. Cek apakah timestamp dalam rentang waktu yang wajar (misal: 5 menit)
  const now = Math.floor(Date.now() / 1000);

  if (Math.abs(now - parseInt(timestamp)) > 300) {
    return false; // Replay attack atau terlalu lama
  }

  // 3. Buat signed payload
  const signedPayload = `${timestamp}.${rawBody}`;

  // 4. Hitung HMAC-SHA256
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(signedPayload)
    .digest("hex");

  // 5. Bandingkan dengan aman (menggunakan timingSafeEqual untuk mencegah timing attacks)
  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature, "utf8"),
    Buffer.from(signature, "utf8"),
  );
}

/* ------------------------------------------------------------------ */
/*  Webhook event types we care about                                 */
/* ------------------------------------------------------------------ */

export interface WebhookEvent {
  id: string;
  type: string;
  eventDate: string;
  metadata: Metadata;
  data: Data;
  merchantId: string;
  webhooks: Webhook[];
}

export interface Metadata {
  status: string;
  amount: number;
}

export interface Data {
  payment: Payment;
  eventId: string;
}

export interface Payment {
  id: string;
  attemptId: string;
  amount: number;
  currency: string;
  description: string;
  applicationFee: number;
  totalFee: number;
  totalFeeFractional: number;
  isSurcharged: boolean;
  sourceType: string;
  transactionDate: string;
  status: string;
  estimatedTransferDate: string;
  actualTransferDate: any;
  payer: any[];
  subscription: any;
  attempts: any[];
  refunds: any[];
  metadata: any;
  preAuthorisation: any;
  nonce: any;
  disputeId: any;
  dishonourType: any;
  cancellationReason: any;
}

export interface Webhook {
  id: string;
  webhookId: string;
  webhookUri: string;
  responseCode: number;
  responseBody?: string;
  requestStartUtc: string;
  requestEndUtc: string;
}

export interface BankResultWebhookEvent {
  id: string;
  type: string;
  eventDate: string;
  metadata: Metadata;
  data: BankResultData;
  merchantId: string;
  webhooks: Webhook[];
}

export interface Metadata {
  dishonourCount: number;
  dishonourAmount: number;
  successCount: number;
  successAmount: number;
}

export interface BankResultData {
  payments: BankResultPayment[];
  eventId: string;
}

export interface Payer {
  id: string;
  firstName: string;
  lastName: string;
  emailAddress: string;
  mobileNumber: any;
  streetAddress: any;
  suburb: any;
  postcode: any;
  state: any;
  country: any;
  countryCode: any;
  companyName: string;
  companyRegistrationNumber: any;
  metadata: any;
}

export interface BankResultPayment {
  id: string;
  attemptId: string;
  amount: number;
  description: string;
  sourceType: string;
  transactionDate: string;
  status: string;
  estimatedTransferDate: string;
  payer: Payer;
  dishonour: any;
  cancellationReason: any;
}

const MAP_STATE = {
  approved: "settled",
  dishonoured: "dishonoured",
  failed: "failed",
  pending: "pending",
};

const handleSettledEvent = async (payload: WebhookEvent) => {
  const supabase = getSupabaseAdmin();
  const pinchPaymentId = payload.data.payment.id;
  const eventType = payload.type;

  // Update the payment schedule record
  const { data: schedule, error: scheduleErr } = await supabase
    .from("payment_schedules")
    .update({
      status: "settled",
      updated_at: new Date().toISOString(),
    })
    .eq("pinch_payment_id", pinchPaymentId)
    .select("id, payment_id")
    .single();

  if (scheduleErr) {
    console.error("Webhook: failed to update schedule:", scheduleErr.message);
    return NextResponse.json({ ok: true, warning: "Schedule not found" });
  }

  // Check if all schedules for this payment are resolved
  const { data: allSchedules } = await supabase
    .from("payment_schedules")
    .select("status")
    .eq("payment_id", schedule.payment_id);

  const allSettled = allSchedules?.every((s) => s.status === "settled");
  if (allSettled) {
    await supabase
      .from("payments")
      .update({ status: "settled", updated_at: new Date().toISOString() })
      .eq("id", schedule.payment_id);
  }

  // Get payment info to send notifications and audit logs
  const clientRes = await supabase
    .from("payments")
    .select("client_id, amount, proposal_id, clients(name)")
    .eq("id", schedule.payment_id)
    .single();

  const notificationPayload = {
    clientName: clientRes.data?.clients?.[0]?.name || "Unknown Client",
    amount: payload.data.payment.amount,
    paymentId: schedule.payment_id,
  };

  await Promise.allSettled([
    dispatchNotification("PAYMENT_SUCCEEDED", notificationPayload),
    clientRes.data?.proposal_id
      ? logAuditEvent(
          clientRes.data.proposal_id,
          "PAYMENT_SUCCEEDED",
          notificationPayload,
        )
      : Promise.resolve(),
  ]);

  // Write audit event
  await supabase.from("audit_events").insert({
    entity_id: schedule.payment_id,
    entity_type: "payment",
    action: "pinch_webhook_settled",
    metadata: {
      pinch_payment_id: pinchPaymentId,
      schedule_id: schedule.id,
      payment_id: schedule.payment_id,
      raw_event: eventType,
    },
    actor_type: "system",
  });

  return NextResponse.json({ ok: true });
};

const handleBankResultEvent = async (payload: BankResultWebhookEvent) => {
  const supabase = getSupabaseAdmin();

  // For each payment in the bank result, update the corresponding schedule
  for (const payment of payload.data.payments) {
    const pinchPaymentId = payment.id;
    const newStatus =
      MAP_STATE[payment.status as keyof typeof MAP_STATE] || "pending";

    console.log(
      "Webhook: updating schedule for Pinch payment:",
      pinchPaymentId,
      "to status:",
      newStatus,
    );

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
      console.error(
        "Webhook: failed to update schedule for bank result:",
        scheduleErr.message,
      );
      continue; // Skip to next payment
    }

    // Propagate status to parent payments table
    const { data: allSchedules } = await supabase
      .from("payment_schedules")
      .select("status")
      .eq("payment_id", schedule.payment_id);

    const allSettled = allSchedules?.every((s) => s.status === "settled");
    const anyDishonoured = allSchedules?.some(
      (s) => s.status === "dishonoured" || s.status === "failed",
    );

    if (allSettled) {
      await supabase
        .from("payments")
        .update({ status: "settled", updated_at: new Date().toISOString() })
        .eq("id", schedule.payment_id);
    } else if (anyDishonoured) {
      await supabase
        .from("payments")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", schedule.payment_id);
    }

    // Dispatch notification if payment is settled
    if (newStatus === "settled") {
      const clientRes = await supabase
        .from("payments")
        .select("proposal_id, proposals(clients(name))")
        .eq("id", schedule.payment_id)
        .single();

      console.log(
        "Webhook: dispatching payment succeeded notification for proposal:",
        clientRes.data?.proposal_id,
        "client:",
        clientRes.data,
      );

      const proposalData = clientRes.data?.proposals as any;
      const clientData = Array.isArray(proposalData)
        ? proposalData[0]?.clients
        : proposalData?.clients;
      const clientName =
        (Array.isArray(clientData) ? clientData[0]?.name : clientData?.name) ||
        "Unknown Client";

      const payload = {
        clientName,
        amount: payment.amount,
        paymentId: schedule.payment_id,
      };

      console.log(
        "Dispatching payment succeeded notification:",
        payload,
        clientRes.data?.proposal_id,
        clientRes.error,
      );

      await Promise.allSettled([
        dispatchNotification("PAYMENT_SUCCEEDED", payload),
        clientRes.data?.proposal_id
          ? logAuditEvent(
              clientRes.data.proposal_id,
              "PAYMENT_SUCCEEDED",
              payload,
            )
          : Promise.resolve(),
      ]);
    }

    if (newStatus === "dishonoured" || newStatus === "failed") {
      const clientRes = await supabase
        .from("payments")
        .select("client_id, amount, proposal_id, clients(name)")
        .eq("id", schedule.payment_id)
        .single();

      const payload = {
        clientName: clientRes.data?.clients?.[0]?.name || "Unknown Client",
        amount: payment.amount,
        paymentId: schedule.payment_id,
      };

      await Promise.allSettled([
        dispatchNotification("PAYMENT_FAILED", payload),
        clientRes.data?.proposal_id
          ? logAuditEvent(clientRes.data.proposal_id, "PAYMENT_FAILED", payload)
          : Promise.resolve(),
      ]);
    }
  }

  return NextResponse.json({ ok: true });
};

/* ------------------------------------------------------------------ */
/*  POST /api/webhooks/pinch                                          */
/* ------------------------------------------------------------------ */

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const body = JSON.parse(rawBody);

    const eventType = body.type;

    console.log(`[Pinch Webhook] Received event: ${eventType}, body:`, body);

    if (!eventType) {
      return NextResponse.json(
        { error: "Missing event type" },
        { status: 400 },
      );
    }

    if (!process.env.PINCH_WEBHOOK_SECRET) {
      console.error("PINCH_WEBHOOK_SECRET not set — cannot verify signature");
      return NextResponse.json(
        { error: "Webhook secret not configured" },
        { status: 500 },
      );
    }

    const signatureHeader = request.headers.get("pinch-signature");
    if (!signatureHeader) {
      return NextResponse.json(
        { error: "Missing Pinch signature header" },
        { status: 400 },
      );
    }

    if (
      !verifyPinchSignature(
        rawBody,
        signatureHeader,
        process.env.PINCH_WEBHOOK_SECRET,
      )
    ) {
      return NextResponse.json(
        { error: "Invalid Pinch signature" },
        { status: 400 },
      );
    }

    // return NextResponse.json({ ok: true, received: true }, { status: 400 });

    switch (eventType) {
      // settled
      case "transfer":
        return handleSettledEvent(body as WebhookEvent);
      case "bank-results":
        return handleBankResultEvent(body as BankResultWebhookEvent);
      default:
        console.log(
          `[Pinch Webhook] Ignoring event type: ${eventType}, body:`,
          body,
        );
        return NextResponse.json({ ok: true, ignored: true });
    }
  } catch (error) {
    console.error("Webhook error:", (error as Error).message);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
