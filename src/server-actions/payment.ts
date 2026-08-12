"use server";

import { createAdminClient } from "@/utils/server";
import { createPayer, vaultSource } from "@/lib/pinch";
import crypto from "crypto";
import { dispatchNotification } from "@/lib/notification-service";
import { logAuditEvent } from "@/lib/audit-service";

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

type DateBundle = {
  totalCents: number;
  lineItemIds: string[];
};

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
        "*, clients(id, name, email, phone), proposal_line_items(*, services(name, billing, term)), venues(name, address)",
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
      retry_count: number;
      metadata?: Record<string, unknown>;
    }> = [];

    // Determine campaign start date (use proposal signed_at + 14 days as default)
    const campaignStart = new Date();
    const signedAt = proposal.signed_at ? new Date(proposal.signed_at) : null;
    if (signedAt) {
      campaignStart.setTime(signedAt.getTime());
    }
    campaignStart.setDate(campaignStart.getDate() + 14);

    const bundles = new Map<string, DateBundle>();
    for (const item of lineItems) {
      const svc = item.services;
      if (!svc || svc.billing === "in_kind" || item.price_snapshot_cents <= 0)
        continue;

      if (svc.billing === "one_off") {
        const d = new Date(campaignStart);
        const dateKey = d.toISOString().split("T")[0];

        if (!bundles.has(dateKey)) {
          bundles.set(dateKey, { totalCents: 0, lineItemIds: [] });
        }

        const bundle = bundles.get(dateKey)!;
        bundle.totalCents += item.price_snapshot_cents;
        bundle.lineItemIds.push(item.id);
      } else if (svc.billing === "recurring_monthly") {
        // Recurring: first debit 7 days before campaign start, then monthly
        const termMonths = item.billing_cycle_snapshot_months || 1;

        for (let month = 0; month < termMonths; month++) {
          const d = new Date(campaignStart);

          if (month === 0) {
            d.setDate(d.getDate() - 7); // First debit 7 days before campaign start
          } else {
            d.setMonth(d.getMonth() + month); // Subsequent debits monthly
          }

          const dateKey = d.toISOString().split("T")[0];

          if (!bundles.has(dateKey)) {
            bundles.set(dateKey, { totalCents: 0, lineItemIds: [] });
          }

          const bundle = bundles.get(dateKey)!;
          bundle.totalCents += item.price_snapshot_cents;
          bundle.lineItemIds.push(item.id);
        }
      }
    }

    const sortedEntries = Array.from(bundles.entries()).sort((a, b) =>
      a[0].localeCompare(b[0]),
    );

    let sequence = 1;
    for (const [dateKey, bundle] of sortedEntries) {
      const idempotencyKey = `${payment.id}-bundle-${dateKey}-${crypto.randomUUID()}`;

      // Create a description for the payment schedule
      const clientName = client.name || "Client";
      const description =
        sequence === 1
          ? `LickYourPhone (${clientName}) - Initial Deposit / Setup`
          : `LickYourPhone (${clientName}) - Scheduled Payment (${dateKey})`;

      schedules.push({
        payment_id: payment.id,
        pinch_payment_id: null,
        amount_cents: bundle.totalCents,
        scheduled_date: dateKey,
        status: "pending",
        idempotency_key: idempotencyKey,
        retry_count: 0,
        metadata: { included_items: bundle.lineItemIds },
        description,
      });

      sequence++;
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

    const payload = {
      amount: schedules.reduce((sum, s) => sum + s.amount_cents, 0),
      paymentId: payment.id,
      paymentSchedules: schedules.map((s) => ({
        date: s.scheduled_date,
        description: s.description,
        amount: s.amount_cents,
      })),
      client: {
        clientName: client.name,
        clientEmail: proposal.signer_email || "",
        venueName: proposal.venues?.name || "",
        venueAddress: proposal.venues?.address || "",
        portalUrl: `${process.env.NEXT_PUBLIC_APP_URL}/portal/${proposal.token}`,
      },
      intakeUrl: `${process.env.NEXT_PUBLIC_APP_URL}/intake/${proposal.token}`,
    };

    // 7. Write audit event and dispatch notification
    await Promise.allSettled([
      logAuditEvent(proposalId, "PAYMENT_CAPTURED", payload),
      dispatchNotification("PAYMENT_CAPTURED", payload),
    ]);

    return { data: { paymentId: payment.id }, error: null };
  } catch (error) {
    return { data: null, error: (error as Error).message };
  }
}

export async function resedNotificationForPayment(proposalId: string) {
  try {
    const supabase = await createAdminClient();
    const { data: payment, error: paymentErr } = await supabase
      .from("payments")
      .select("*, proposal_id, payment_schedules(*)")
      .eq("proposal_id", proposalId)
      .single();

    if (paymentErr || !payment) {
      console.error(
        `Failed to fetch payment for proposal ${proposalId}:`,
        paymentErr,
      );
      throw new Error("Payment not found");
    }

    const { data: proposal, error: proposalErr } = await supabase
      .from("proposals")
      .select("*, clients(id, name, email, phone), venues(name, address)")
      .eq("id", proposalId)
      .single();

    if (proposalErr || !proposal) {
      throw new Error("Proposal not found");
    }

    const totalAmount = payment.payment_schedules.reduce(
      (sum: number, s: { amount_cents: number }) => sum + s.amount_cents,
      0,
    );

    const payload = {
      amount: totalAmount,
      paymentId: payment.id,
      paymentSchedules: payment.payment_schedules.map(
        (s: {
          scheduled_date: Date;
          description: string;
          amount_cents: number;
        }) => ({
          date: s.scheduled_date,
          description: s.description,
          amount: s.amount_cents,
        }),
      ),
      client: {
        clientName: proposal.clients?.name || "",
        clientEmail: proposal.signer_email || "",
        venueName: proposal.venues?.name || "",
        venueAddress: proposal.venues?.address || "",
        portalUrl: `${process.env.NEXT_PUBLIC_APP_URL}/portal/${proposal.token}`,
      },
      intakeUrl: `${process.env.NEXT_PUBLIC_APP_URL}/intake/${proposal.token}`,
    };

    await dispatchNotification("PAYMENT_CAPTURED", payload);
  } catch (error) {
    throw new Error(
      `Failed to resend notification: ${(error as Error).message}`,
    );
  }
}
