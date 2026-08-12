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
  dishonour: {
    type: string;
    reason: string;
  };
}

const MAP_STATE = {
  approved: "settled",
  dishonoured: "dishonoured",
  failed: "failed",
  pending: "pending",
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

    if (
      newStatus === "settled" ||
      newStatus === "dishonoured" ||
      newStatus === "failed"
    ) {
      const { data: paymentData, error: fetchErr } = await supabase
        .from("payments")
        .select(
          `
          proposal_id,
          proposals (
            token,
            clients ( name, email ),
            venues ( name, address )
          )
        `,
        )
        .eq("id", schedule.payment_id)
        .single();

      if (fetchErr || !paymentData) {
        console.error(
          "Webhook: failed to fetch related data for notification",
          fetchErr,
        );
        continue;
      }

      const proposal = Array.isArray(paymentData.proposals)
        ? paymentData.proposals[0]
        : paymentData.proposals;
      const client = Array.isArray(proposal?.clients)
        ? proposal?.clients[0]
        : proposal?.clients;
      const venue = Array.isArray(proposal?.venues)
        ? proposal?.venues[0]
        : proposal?.venues;

      const notificationPayload = {
        client: {
          clientName: client?.name || "Unknown Client",
          clientEmail: client?.email || "",
          portalUrl: proposal?.token
            ? `${process.env.NEXT_PUBLIC_APP_URL}/portal/${proposal.token}`
            : "",
          venueName: venue?.name || "",
          venueAddress: venue?.address || "",
        },
        payment: {
          description: payment.description,
          amount: payment.amount,
          date: payment.transactionDate,
          id: payment.id,
        },
      };

      const eventType =
        newStatus === "settled" ? "PAYMENT_SUCCEEDED" : "PAYMENT_FAILED";

      console.log(
        `Webhook: dispatching ${eventType} notification for proposal:`,
        paymentData.proposal_id,
      );

      await Promise.allSettled([
        dispatchNotification(eventType, notificationPayload),
        paymentData.proposal_id
          ? logAuditEvent(
              paymentData.proposal_id,
              eventType,
              notificationPayload,
            )
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
