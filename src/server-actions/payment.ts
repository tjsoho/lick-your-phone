"use server";

import { createClient } from "@/utils/server";
import {
  createPayer,
  vaultSource,
  schedulePayment,
} from "@/lib/pinch";
import crypto from "crypto";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface CardMeta {
  lastFour: string;
  brand: string;
  expiry: string; // MM/YY
}

interface CaptureResult {
  data: { paymentId: string } | null;
  error: string | null;
}

/* ------------------------------------------------------------------ */
/*  Main action – capture payment details and schedule payments       */
/* ------------------------------------------------------------------ */

export async function capturePaymentDetails(
  proposalId: string,
  token: string,
  cardMeta: CardMeta
): Promise<CaptureResult> {
  try {
    const supabase = await createClient();

    // 1. Fetch proposal + client + line items
    const { data: proposal, error: proposalErr } = await supabase
      .from("proposals")
      .select(
        "*, clients(id, name, email, phone), proposal_line_items(*, services(name, billing, term))"
      )
      .eq("id", proposalId)
      .single();

    if (proposalErr || !proposal) {
      throw new Error(proposalErr?.message || "Proposal not found");
    }

    if (proposal.status !== "signed") {
      throw new Error("Proposal must be signed before payment details can be captured");
    }

    const client = proposal.clients as {
      id: string;
      name: string;
      email: string;
      phone: string | null;
    };

    // 2. Create Pinch payer
    const nameParts = (client.name || "").trim().split(/\s+/);
    const firstName = nameParts[0] || "Client";
    const lastName = nameParts.slice(1).join(" ") || "-";

    const payer = await createPayer({
      firstName,
      lastName,
      emailAddress: client.email,
      companyName: client.name,
    });

    // 3. Vault the tokenised card
    const source = await vaultSource(payer.id, token);

    // 4. Create payment record
    const { data: payment, error: paymentErr } = await supabase
      .from("payments")
      .insert({
        proposal_id: proposalId,
        pinch_payer_id: payer.id,
        pinch_source_id: source.id,
        card_last_four: cardMeta.lastFour,
        card_brand: cardMeta.brand,
        card_expiry: cardMeta.expiry,
        status: "details_captured",
        details_captured_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (paymentErr || !payment) {
      throw new Error(paymentErr?.message || "Failed to create payment record");
    }

    // 5. Schedule payments based on line items
    const lineItems = (proposal.proposal_line_items || []) as Array<{
      id: string;
      price_cents: number;
      services: {
        name: string;
        billing: "one_off" | "recurring_monthly" | "in_kind";
        term: string | null;
      } | null;
    }>;

    const schedules: Array<{
      payment_id: string;
      pinch_payment_id: string;
      amount_cents: number;
      scheduled_date: string;
      status: string;
      idempotency_key: string;
    }> = [];

    // Determine campaign start date (use proposal signed_at + 14 days as default)
    const campaignStart = new Date();
    campaignStart.setDate(campaignStart.getDate() + 14);

    for (const item of lineItems) {
      const svc = item.services;
      if (!svc || svc.billing === "in_kind" || item.price_cents <= 0) continue;

      if (svc.billing === "one_off") {
        // One-off: charge at campaign start
        const schedDate = new Date(campaignStart);
        const idempotencyKey = `${payment.id}-oneoff-${item.id}-${crypto.randomUUID()}`;

        const pinchPayment = await schedulePayment(
          payer.id,
          source.id,
          item.price_cents,
          schedDate.toISOString().split("T")[0],
          idempotencyKey
        );

        schedules.push({
          payment_id: payment.id,
          pinch_payment_id: pinchPayment.id,
          amount_cents: item.price_cents,
          scheduled_date: schedDate.toISOString().split("T")[0],
          status: "scheduled",
          idempotency_key: idempotencyKey,
        });
      } else if (svc.billing === "recurring_monthly") {
        // Recurring: first debit 7 days before campaign start, then monthly
        const termMonths = parseInt(svc.term || "3", 10) || 3;

        for (let month = 0; month < termMonths; month++) {
          const schedDate = new Date(campaignStart);
          // First payment is 7 days before campaign start
          if (month === 0) {
            schedDate.setDate(schedDate.getDate() - 7);
          } else {
            // Subsequent months from campaign start
            schedDate.setMonth(schedDate.getMonth() + month);
          }

          const idempotencyKey = `${payment.id}-monthly-${item.id}-m${month}-${crypto.randomUUID()}`;

          const pinchPayment = await schedulePayment(
            payer.id,
            source.id,
            item.price_cents,
            schedDate.toISOString().split("T")[0],
            idempotencyKey
          );

          schedules.push({
            payment_id: payment.id,
            pinch_payment_id: pinchPayment.id,
            amount_cents: item.price_cents,
            scheduled_date: schedDate.toISOString().split("T")[0],
            status: "scheduled",
            idempotency_key: idempotencyKey,
          });
        }
      }
    }

    // 6. Insert payment schedules
    if (schedules.length > 0) {
      const { error: schedErr } = await supabase
        .from("payment_schedules")
        .insert(schedules);

      if (schedErr) {
        throw new Error(`Failed to save payment schedules: ${schedErr.message}`);
      }
    }

    // 7. Write audit event
    await supabase.from("audit_events").insert({
      proposal_id: proposalId,
      event_type: "payment_details_captured",
      payload: {
        payment_id: payment.id,
        card_brand: cardMeta.brand,
        card_last_four: cardMeta.lastFour,
        scheduled_count: schedules.length,
      },
    });

    return { data: { paymentId: payment.id }, error: null };
  } catch (error) {
    return { data: null, error: (error as Error).message };
  }
}
