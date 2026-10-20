"use server";

import { createAdminClient, createClient } from "@/utils/server";
import { headers } from "next/headers";
import crypto from "crypto";
import { generateContractPdf, type PdfLineItem } from "@/lib/pdf";
import { onProposalSigned } from "@/lib/integrations";
import {
  getAgreementSettings,
  getTermsClauses,
} from "@/server-actions/agreement-settings";
import {
  applyComplimentary,
  DISCOUNT_GRACE_MS,
  isDiscountLive,
  payableCents,
} from "@/lib/pricing";

function calculateMonthlyCents(
  targetCents: number,
  displayPeriod: string | null,
): number {
  if (displayPeriod === "week") {
    return Math.round((targetCents * 52) / 12);
  }
  return targetCents;
}

interface SignatureSelection {
  serviceId: string;
  tierId: string | null;
}

interface SignProposalInput {
  proposalId: string;
  signerEmail: string;
  signatureDataUrl: string;
  selections: SignatureSelection[];
}

export async function signProposal(input: SignProposalInput) {
  try {
    const supabase = await createClient();

    // The person signing is not logged in, and the tables this writes to are
    // closed to anonymous writes on purpose — otherwise anyone holding a
    // portal link could insert line items or contracts against any proposal.
    // Reads stay on the anon client; only these writes are elevated.
    const admin = await createAdminClient();

    const hdrs = await headers();

    const signerIp =
      hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const signerUserAgent = hdrs.get("user-agent") ?? "unknown";

    // 1. Validate proposal exists and is signable
    const { data: proposal, error: proposalErr } = await supabase
      .from("proposals")
      .select(
        `
        id, status, token, discount_timer_active, discount_expires_at,
        discount_starts_at,
        client:clients!client_id ( id, name, contact_name, logo_url ),
        venue:venues!venue_id ( id, name, address, logo_url )
      `,
      )
      .eq("id", input.proposalId)
      .single();

    if (proposalErr || !proposal) {
      return { error: "Proposal not found." };
    }

    if (proposal.status !== "sent" && proposal.status !== "draft") {
      return {
        error:
          "This proposal has already been signed or is no longer available.",
      };
    }

    // 2. Look up service + tier data for each selection
    const serviceIds = input.selections.map((s) => s.serviceId);
    const { data: services, error: svcErr } = await supabase
      .from("services")
      .select(
        "id, name, billing, term, billing_cycle_months, price_display_period, target_price_cents, discount_pct, service_tiers(id, name, target_price_cents, billing_cycle_months), service_inclusions(text, sequence)",
      )
      .in("id", serviceIds);

    if (svcErr || !services) {
      return { error: "Failed to load service data." };
    }

    // 2b. Price exactly as the portal showed it: full price unless the
    //     discount timer was running, with this proposal's own discounts.
    const discountLive = isDiscountLive({
      active: proposal.discount_timer_active ?? false,
      startsAt: proposal.discount_starts_at,
      expiresAt: proposal.discount_expires_at,
      at: Date.now(),
      graceMs: DISCOUNT_GRACE_MS,
    });

    // Both per-proposal overrides in one read: the discount, and whether the
    // service was given away. The second is not a discount and does not
    // depend on the timer, so a row carrying only that one still matters.
    const { data: overrideRows } = await supabase
      .from("proposal_page_settings")
      .select("page_id, discount_pct, complimentary")
      .eq("proposal_id", input.proposalId)
      .or("discount_pct.not.is.null,complimentary.is.true");

    const overridePageIds = (overrideRows ?? []).map((row) => row.page_id);
    const { data: overridePages } =
      overridePageIds.length > 0
        ? await supabase
            .from("pages")
            .select("id, service_id")
            .in("id", overridePageIds)
        : { data: [] as { id: string; service_id: string | null }[] };

    const discountOverrides: Record<string, number> = {};
    const complimentaryServiceIds: string[] = [];
    for (const row of overrideRows ?? []) {
      const serviceId = overridePages?.find(
        (page) => page.id === row.page_id,
      )?.service_id;
      if (!serviceId) continue;
      if (row.discount_pct != null) {
        discountOverrides[serviceId] = row.discount_pct;
      }
      if (row.complimentary) complimentaryServiceIds.push(serviceId);
    }

    // THE CONTRACT AGREES WITH THE SLIDE, BY USING THE SAME RULE.
    //
    // A service given away is rewritten here exactly as the portal rewrites
    // it: billed in kind, at nothing, with no struck-through price. The total
    // below already skips anything in kind, so the gift costs the client
    // nothing on the document for the same reason it costs them nothing on
    // screen, rather than because a second rule was written to say so.
    const pricedServices = applyComplimentary(services, complimentaryServiceIds);
    const serviceMap = Object.fromEntries(pricedServices.map((s) => [s.id, s]));

    // 3. Build line items and compute total
    const lineItemRows: Array<{
      proposal_id: string;
      service_id: string;
      service_tier_id: string | null;
      price_snapshot_cents: number;
      billing: string;
      term: string | null;
      billing_cycle_snapshot_months: number | null;
    }> = [];

    const pdfLineItems: PdfLineItem[] = [];
    let totalCents = 0;

    const tiers = pricedServices.flatMap((s) => s.service_tiers || []);

    for (const sel of input.selections) {
      const svc = serviceMap[sel.serviceId];
      if (!svc) continue;

      let basePriceCents: number;
      let tierName: string | null = null;
      let finalBillingCycle: number | null = svc.billing_cycle_months;

      // 1. Dapatkan harga dasar dari Tier atau Service
      if (sel.tierId && tiers) {
        const tier = tiers.find((t) => t.id === sel.tierId);
        basePriceCents = tier
          ? tier.target_price_cents
          : svc.target_price_cents;
        tierName = tier?.name ?? null;

        if (tier && tier.billing_cycle_months) {
          finalBillingCycle = tier.billing_cycle_months;
        }
      } else {
        basePriceCents = svc.target_price_cents;
      }

      const payable = payableCents({
        targetCents: basePriceCents,
        standingPct: svc.discount_pct,
        effectivePct: discountOverrides[svc.id] ?? svc.discount_pct,
        discountLive,
      });

      const priceCents = calculateMonthlyCents(
        payable,
        svc.price_display_period,
      );

      lineItemRows.push({
        proposal_id: input.proposalId,
        service_id: sel.serviceId,
        service_tier_id: sel.tierId,
        price_snapshot_cents: priceCents,
        billing: svc.billing,
        term: svc.term,
        billing_cycle_snapshot_months: finalBillingCycle,
      });

      const billing = svc.billing as
        | "one_off"
        | "recurring_monthly"
        | "in_kind";

      const inclusions = (
        (svc as unknown as {
          service_inclusions?: { text: string; sequence: number | null }[];
        }).service_inclusions ?? []
      )
        .slice()
        .sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0))
        .map((inc) => inc.text);

      pdfLineItems.push({
        name: svc.name,
        tierName,
        billing,
        priceCents,
        term: svc.term,
        billingCycleMonths: finalBillingCycle || 1,
        inclusions,
      });

      if (billing !== "in_kind") {
        if (billing === "recurring_monthly") {
          totalCents += priceCents * (finalBillingCycle || 1);
        } else {
          totalCents += priceCents;
        }
      }
    }

    // 4. Insert line items
    const { error: lineItemErr } = await admin
      .from("proposal_line_items")
      // .insert(lineItemRows);
      .upsert(lineItemRows, {
        onConflict: "proposal_id,service_id,service_tier_id",
      });

    if (lineItemErr) {
      return { error: "Failed to save line items: " + lineItemErr.message };
    }

    // 5. Generate PDF
    const clientObj = proposal.client as unknown as {
      id: string;
      name: string;
      contact_name: string | null;
      logo_url: string | null;
    } | null;
    const venueObj = proposal.venue as unknown as {
      id: string;
      name: string;
      address: string;
      logo_url: string | null;
    } | null;

    const signedAt = new Date().toISOString();

    const [settings, termsClauses] = await Promise.all([
      getAgreementSettings(),
      getTermsClauses(),
    ]);

    const pdfBuffer = await generateContractPdf({
      clientName: clientObj?.name ?? "Client",
      // The person signing. `contact_name` is legacy: records made before the
      // client record became the person still carry them there.
      contactName: clientObj?.contact_name ?? clientObj?.name ?? null,
      venueName: venueObj?.name ?? "Venue",
      lineItems: pdfLineItems,
      totalCents,
      signerEmail: input.signerEmail,
      signedAt,
      signatureDataUrl: input.signatureDataUrl,
      termsClauses,
      countersignatureImage: settings.countersignatureImage,
      countersignatureName: settings.countersignatureName,
      countersignatureTitle: settings.countersignatureTitle,
      // The venue's own mark first, the client record's behind it — the same
      // precedence the deck's cover uses, so the contract is branded the way
      // the proposal that led to it was.
      clientLogoUrl: venueObj?.logo_url ?? clientObj?.logo_url ?? null,
    });

    // 6. Compute document hash
    const documentHash = crypto
      .createHash("sha256")
      .update(pdfBuffer)
      .digest("hex");

    // 7. Upload PDF to Supabase Storage
    const fileName = `contract-${input.proposalId}-${Date.now()}.pdf`;
    const storagePath = `contracts/${fileName}`;

    const { error: uploadErr } = await admin.storage
      .from("site-images")
      .upload(storagePath, pdfBuffer, {
        contentType: "application/pdf",
        upsert: false,
      });

    if (uploadErr) {
      return { error: "Failed to upload contract PDF: " + uploadErr.message };
    }

    const { data: urlData } = admin.storage
      .from("site-images")
      .getPublicUrl(storagePath);

    const fileUrl = urlData.publicUrl;

    // 8. Create document record
    const { data: doc, error: docErr } = await admin
      .from("documents")
      .insert({
        proposal_id: input.proposalId,
        type: "contract",
        file_url: fileUrl,
        file_hash: documentHash,
      })
      .select("id")
      .single();

    if (docErr) {
      return { error: "Failed to create document record: " + docErr.message };
    }

    // 9. Update proposal to signed
    const { error: updateErr } = await admin
      .from("proposals")
      .update({
        status: "signed",
        signed_at: signedAt,
        signer_email: input.signerEmail,
        signer_ip: signerIp,
        signer_user_agent: signerUserAgent,
        document_hash: documentHash,
        total_snapshot_cents: totalCents,
      })
      .eq("id", input.proposalId);

    if (updateErr) {
      return { error: "Failed to update proposal: " + updateErr.message };
    }

    // 11. Fire integrations (non-blocking — failures don't affect the client)
    const clientSlug = (clientObj?.name ?? "client")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    onProposalSigned({
      proposalId: input.proposalId,
      clientName: clientObj?.name ?? "Client",
      clientSlug,
      venueName: venueObj?.name ?? "Venue",
      venueAddress: venueObj?.address ?? "",
      signerEmail: input.signerEmail,
      totalCents,
      lineItems: pdfLineItems.map((li) => ({
        serviceName: li.name,
        priceCents: li.priceCents,
        billing: li.billing,
      })),
      documentUrl: fileUrl,
      documentHash,
    }).catch((err) =>
      console.error("[integrations] onProposalSigned error:", err),
    );

    return {
      error: null,
      documentId: doc.id,
      documentUrl: fileUrl,
    };
  } catch (err) {
    return { error: (err as Error).message };
  }
}
