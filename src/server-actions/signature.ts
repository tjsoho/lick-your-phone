"use server";

import { createClient } from "@/utils/server";
import { headers } from "next/headers";
import crypto from "crypto";
import { generateContractPdf, type PdfLineItem } from "@/lib/pdf";
import { onProposalSigned } from "@/lib/integrations";

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
    const hdrs = await headers();

    const signerIp =
      hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const signerUserAgent = hdrs.get("user-agent") ?? "unknown";

    // 1. Validate proposal exists and is signable
    const { data: proposal, error: proposalErr } = await supabase
      .from("proposals")
      .select(
        `
        id, status, token,
        client:clients!client_id ( id, name ),
        venue:venues!venue_id ( id, name, address )
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
        "id, name, billing, term, billing_cycle_months, price_display_period, target_price_cents, discount_pct, service_tiers(id, name, target_price_cents, billing_cycle_months)",
      )
      .in("id", serviceIds);

    if (svcErr || !services) {
      return { error: "Failed to load service data." };
    }

    const serviceMap = Object.fromEntries(services.map((s) => [s.id, s]));

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

    const tiers = services.flatMap((s) => s.service_tiers || []);

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

      const priceCents = calculateMonthlyCents(
        basePriceCents,
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

      pdfLineItems.push({
        name: svc.name,
        tierName,
        billing,
        priceCents,
        term: svc.term,
        billingCycleMonths: finalBillingCycle || 1,
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
    const { error: lineItemErr } = await supabase
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
    } | null;
    const venueObj = proposal.venue as unknown as {
      id: string;
      name: string;
      address: string;
    } | null;

    const signedAt = new Date().toISOString();

    const pdfBuffer = await generateContractPdf({
      clientName: clientObj?.name ?? "Client",
      venueName: venueObj?.name ?? "Venue",
      lineItems: pdfLineItems,
      totalCents,
      signerEmail: input.signerEmail,
      signedAt,
      signatureDataUrl: input.signatureDataUrl,
    });

    // 6. Compute document hash
    const documentHash = crypto
      .createHash("sha256")
      .update(pdfBuffer)
      .digest("hex");

    // 7. Upload PDF to Supabase Storage
    const fileName = `contract-${input.proposalId}-${Date.now()}.pdf`;
    const storagePath = `contracts/${fileName}`;

    const { error: uploadErr } = await supabase.storage
      .from("site-images")
      .upload(storagePath, pdfBuffer, {
        contentType: "application/pdf",
        upsert: false,
      });

    if (uploadErr) {
      return { error: "Failed to upload contract PDF: " + uploadErr.message };
    }

    const { data: urlData } = supabase.storage
      .from("site-images")
      .getPublicUrl(storagePath);

    const fileUrl = urlData.publicUrl;

    // 8. Create document record
    const { data: doc, error: docErr } = await supabase
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
    const { error: updateErr } = await supabase
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
