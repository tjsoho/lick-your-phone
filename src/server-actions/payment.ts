"use server";

import { createAdminClient, createClient } from "@/utils/server";
import {
  createPayer,
  vaultSource,
  chargeRealtime,
  schedulePayment,
} from "@/lib/pinch";
import crypto from "crypto";
import { dispatchNotification } from "@/lib/notification-service";

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

interface ProposalLineItem {
  id: string;
  proposal_id: string;
  service_id: string;
  price_snapshot_cents: number;
  billing_cycle_snapshot_months: number | null;
  services: {
    name: string;
    billing: "one_off" | "recurring_monthly" | "in_kind";
    term: string | null;
  } | null;
}

/* ------------------------------------------------------------------ */
/*  Main action – capture payment details and schedule payments       */
/* ------------------------------------------------------------------ */

export async function capturePaymentDetails(
  proposalId: string,
  token: string,
  cardMeta: CardMeta,
): Promise<CaptureResult> {
  try {
    const supabase = await createAdminClient();

    // 1. Fetch proposal + client + line items
    const { data: proposal, error: proposalErr } = await supabase
      .from("proposals")
      .select(
        "*, clients(id, name, email, phone), proposal_line_items(*, services(name, billing, term))",
      )
      .eq("id", proposalId)
      .single();

    if (proposalErr || !proposal) {
      throw new Error(proposalErr?.message || "Proposal not found");
    }

    if (proposal.status !== "signed") {
      throw new Error(
        "Proposal must be signed before payment details can be captured",
      );
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

    console.log("Creating Pinch payer for client:", client.id, client.name);

    const payer = await createPayer({
      firstName,
      lastName,
      emailAddress: client.email,
      companyName: client.name,
    });

    console.log("Created Pinch payer:", payer.id, "for client:", client.id);

    // 3. Vault the tokenised card
    const source = await vaultSource(payer.id, token);
    console.log("Vaulted source:", source.id, "for payer:", payer.id);

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
    const lineItems = (proposal.proposal_line_items ||
      []) as Array<ProposalLineItem>;

    const schedules: Array<{
      payment_id: string;
      pinch_payment_id: string | null;
      amount_cents: number;
      scheduled_date: string;
      status: string;
      idempotency_key: string;
      description: string;
      proposal_line_item_id: string;
    }> = [];

    // Determine campaign start date (use proposal signed_at + 14 days as default)
    const campaignStart = new Date();
    campaignStart.setDate(campaignStart.getDate() + 14);

    for (const item of lineItems) {
      const svc = item.services;
      if (!svc || svc.billing === "in_kind" || item.price_snapshot_cents <= 0)
        continue;

      if (svc.billing === "one_off") {
        // One-off: charge at campaign start
        const schedDate = new Date(campaignStart);
        const idempotencyKey = `${payment.id}-oneoff-${item.id}-${crypto.randomUUID()}`;
        const description = `LickYourPhone campaign - ${svc.name} (One-time)`;

        schedules.push({
          payment_id: payment.id,
          pinch_payment_id: null,
          amount_cents: item.price_snapshot_cents,
          scheduled_date: schedDate.toISOString().split("T")[0],
          status: "pending",
          idempotency_key: idempotencyKey,
          description,
          proposal_line_item_id: item.id,
        });
        await new Promise((resolve) => setTimeout(resolve, 500));
      } else if (svc.billing === "recurring_monthly") {
        // Recurring: first debit 7 days before campaign start, then monthly
        const termMonths = item.billing_cycle_snapshot_months || 1;

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
          const description = `LickYourPhone campaign - ${svc.name} (Month ${month + 1})`;

          schedules.push({
            payment_id: payment.id,
            pinch_payment_id: null,
            amount_cents: item.price_snapshot_cents,
            scheduled_date: schedDate.toISOString().split("T")[0],
            status: "pending",
            idempotency_key: idempotencyKey,
            description,
            proposal_line_item_id: item.id,
          });

          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }
    }

    // 6. Insert payment schedules
    if (schedules.length > 0) {
      const { error: schedErr } = await supabase
        .from("payment_schedules")
        .insert(schedules);

      if (schedErr) {
        throw new Error(
          `Failed to save payment schedules: ${schedErr.message}`,
        );
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

    // 8. Dispatch notification
    dispatchNotification("PAYMENT_CAPTURED", {
      clientName: client.name,
      amount: schedules.reduce((sum, s) => sum + s.amount_cents, 0),
      paymentId: payment.id,
    });

    return { data: { paymentId: payment.id }, error: null };
  } catch (error) {
    return { data: null, error: (error as Error).message };
  }
}
