"use server";

import { createAdminClient, createClient } from "@/utils/server";
import {
  bankDetailsConfigured,
  decryptField,
  encryptField,
  formatBsb,
  lastThree,
  normaliseAccountNumber,
  normaliseBsb,
} from "@/lib/bank-details";
import { createPayer, vaultSource } from "@/lib/pinch";
import crypto from "crypto";
import { dispatchNotification } from "@/lib/notification-service";
import { logAuditEvent } from "@/lib/audit-service";
import { getAppUrl } from "@/lib/app-url";

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
  options?: {
    /**
     * Whether to lay down the debit schedule as well as vaulting the card.
     *
     * Off by default, and off from the portal: "we're not actually making any
     * payment we're simply storing". The card is held at Pinch so accounting
     * can charge it when they choose. Turn this on and the old behaviour
     * comes back, a row per instalment for the cron to work through.
     */
    schedulePayments?: boolean;
  },
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

    // 6. Insert payment schedules, if this capture is meant to charge at all.
    if (options?.schedulePayments && schedules.length > 0) {
      const { error: schedErr } = await supabase
        .from("payment_schedules")
        .insert(schedules);

      if (schedErr) {
        throw new Error(
          `Failed to save payment schedules: ${schedErr.message}`,
        );
      }
    }

    const appUrl = await getAppUrl();
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
        portalUrl: `${appUrl}/portal/${proposal.token}`,
      },
      intakeUrl: `${appUrl}/intake/${proposal.token}`,
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

    const appUrl = await getAppUrl();
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
        portalUrl: `${appUrl}/portal/${proposal.token}`,
      },
      intakeUrl: `${appUrl}/intake/${proposal.token}`,
    };

    await dispatchNotification("PAYMENT_CAPTURED", payload);
  } catch (error) {
    throw new Error(
      `Failed to resend notification: ${(error as Error).message}`,
    );
  }
}

/* ------------------------------------------------------------------ */
/*  Bank account details, held for accounting                         */
/* ------------------------------------------------------------------ */

/**
 * HOLDING AN ACCOUNT, NOT CHARGING IT.
 *
 * "Collect BSB and account number instead of credit card details", and no
 * payment is taken: accounting debits the account later out of band. So this
 * does none of the Pinch work above. It validates, encrypts, and records that
 * the client gave their authority.
 *
 * The numbers are encrypted before they reach the database and never come
 * back to a browser from here. Reading them again is a separate, deliberate
 * act by a signed-in member of staff, and it leaves a line in the timeline.
 */
export async function captureBankDetails(
  proposalId: string,
  input: { accountName: string; bsb: string; accountNumber: string },
): Promise<CaptureResult> {
  try {
    if (!bankDetailsConfigured()) {
      throw new Error(
        "Bank details cannot be stored yet: the server is missing BANK_DETAILS_KEY.",
      );
    }

    const accountName = input.accountName.trim();
    if (accountName.length < 2) {
      throw new Error("Enter the name on the account.");
    }

    const bsb = normaliseBsb(input.bsb);
    if (!bsb) throw new Error("A BSB is six digits, e.g. 083-004.");

    const accountNumber = normaliseAccountNumber(input.accountNumber);
    if (!accountNumber) {
      throw new Error("An account number is between six and ten digits.");
    }

    const supabase = await createAdminClient();

    const { data: proposal, error: proposalErr } = await supabase
      .from("proposals")
      .select(
        "id, status, token, signer_email, clients(id, name, email), venues(name, address)",
      )
      .eq("id", proposalId)
      .single();

    if (proposalErr || !proposal) {
      throw new Error(proposalErr?.message || "Proposal not found");
    }
    // The same gate the card path has: nothing is collected before signing.
    if (proposal.status !== "signed") {
      throw new Error(
        "Proposal must be signed before bank details can be captured",
      );
    }

    const now = new Date().toISOString();
    const { data: payment, error: paymentErr } = await supabase
      .from("payments")
      .insert({
        proposal_id: proposalId,
        bank_account_name: accountName,
        bank_bsb_encrypted: encryptField(bsb),
        bank_account_number_encrypted: encryptField(accountNumber),
        bank_account_last_three: lastThree(accountNumber),
        // Submitting the form IS the authority; the wording sits above the
        // button and the tick is required before it can be pressed.
        bank_authorised_at: now,
        status: "details_captured",
        details_captured_at: now,
      })
      .select("id")
      .single();

    if (paymentErr || !payment) {
      throw new Error(paymentErr?.message || "Failed to store bank details");
    }

    const client = proposal.clients as unknown as {
      name: string;
      email: string;
    } | null;
    const venue = proposal.venues as unknown as {
      name: string;
      address: string | null;
    } | null;
    const appUrl = await getAppUrl();

    // No card, no schedule, so the payload says what there is: an account on
    // file, by its last three digits, which is all anyone needs to recognise
    // it. The digits themselves never go in a notification or an audit row.
    const payload = {
      proposalId,
      accountName,
      accountLastThree: lastThree(accountNumber),
      client: {
        clientName: client?.name || "",
        clientEmail: proposal.signer_email || client?.email || "",
        venueName: venue?.name || "",
        venueAddress: venue?.address || "",
        portalUrl: `${appUrl}/portal/${proposal.token}`,
      },
      intakeUrl: `${appUrl}/intake/${proposal.token}`,
    };

    await Promise.allSettled([
      logAuditEvent(proposalId, "PAYMENT_CAPTURED", payload),
      dispatchNotification("PAYMENT_CAPTURED", payload),
    ]);

    return { data: { paymentId: payment.id }, error: null };
  } catch (error) {
    return { data: null, error: (error as Error).message };
  }
}

/**
 * Show a member of staff the whole account, once, on purpose.
 *
 * Guarded by a real session rather than the service role alone, and every
 * look is written to the proposal's timeline with the email of whoever asked.
 * Accounting needs the numbers; nobody needs them by accident.
 */
export async function revealBankDetails(proposalId: string): Promise<{
  data: { accountName: string; bsb: string; accountNumber: string } | null;
  error: string | null;
}> {
  try {
    const session = await createClient();
    const {
      data: { user },
    } = await session.auth.getUser();
    if (!user) return { data: null, error: "Not signed in." };

    const supabase = await createAdminClient();
    const { data: payment, error } = await supabase
      .from("payments")
      .select(
        "bank_account_name, bank_bsb_encrypted, bank_account_number_encrypted",
      )
      .eq("proposal_id", proposalId)
      .not("bank_bsb_encrypted", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!payment?.bank_bsb_encrypted || !payment.bank_account_number_encrypted) {
      return { data: null, error: "No bank details on file." };
    }

    const bsb = decryptField(payment.bank_bsb_encrypted);
    const accountNumber = decryptField(payment.bank_account_number_encrypted);

    await logAuditEvent(proposalId, "BANK_DETAILS_VIEWED", {
      proposalId,
      viewedBy: user.email ?? user.id,
    });

    return {
      data: {
        accountName: payment.bank_account_name ?? "",
        bsb: formatBsb(bsb),
        accountNumber,
      },
      error: null,
    };
  } catch (error) {
    return { data: null, error: (error as Error).message };
  }
}
