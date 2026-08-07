"use server";

import { createClient } from "@/utils/server";
import { revalidatePath } from "next/cache";
import crypto from "crypto";
import { dispatchNotification } from "@/lib/notification-service";

export async function getProposals() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("proposals")
      .select(
        `
        *,
        clients(id, name),
        venues(name),
        payments(status),
        intake_responses(id)
      `,
      )
      .order("created_at", { ascending: false });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error: (error as Error).message };
  }
}

export async function getProposal(id: string) {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("proposals")
      .select(
        "*, clients(*), venues(*), proposal_line_items(*, services(name)), internal_notes(*), payments(*, payment_schedules(*))",
      )
      .eq("id", id)
      .single();

    console.log("getProposal data:", data); // Log the data for debugging

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error: (error as Error).message };
  }
}

export async function createProposal(data: {
  client_id: string;
  venue_id: string;
  notes?: string;
}) {
  try {
    const supabase = await createClient();
    const { data: result, error } = await supabase
      .from("proposals")
      .insert({
        client_id: data.client_id,
        venue_id: data.venue_id,
        status: "draft",
        token: crypto.randomUUID(),
      })
      .select()
      .single();

    if (error) throw error;
    revalidatePath("/admin");
    return { data: result, error: null };
  } catch (error) {
    return { data: null, error: (error as Error).message };
  }
}

export async function updateProposal(
  id: string,
  data: {
    client_id?: string;
    venue_id?: string;
    status?: "draft" | "sent" | "signed" | "superseded";
    discount_expires_at?: string;
    signed_at?: string;
    signer_email?: string;
    signer_ip?: string;
    signer_user_agent?: string;
    document_hash?: string;
    total_snapshot_cents?: number;
  },
) {
  try {
    const supabase = await createClient();
    const { data: result, error } = await supabase
      .from("proposals")
      .update(data)
      .eq("id", id)
      .select(`*, clients(id, name, email), venues(name, address)`)
      .single();

    if (error) throw error;

    // Only dispatch notification for status changes (not draft edits)
    if (data.status === "sent") {
      const appUrl = process.env.APP_URL || "http://localhost:3000";
      await dispatchNotification("PROPOSAL_SENT", {
        clientEmail: result.clients?.email,
        clientName: result.clients?.name,
        venueName: result.venues?.name,
        venueAddress: result.venues?.address,
        portalUrl: `${appUrl}/portal/${result.token}`,
      });
    }

    revalidatePath("/admin");
    return { data: result, error: null };
  } catch (error) {
    return { data: null, error: (error as Error).message };
  }
}

export async function supersedeProposal(
  oldProposalId: string,
  data: {
    client_id: string;
    venue_id: string;
    notes?: string;
  },
) {
  try {
    const supabase = await createClient();

    // Mark old proposal as superseded
    const { error: updateError } = await supabase
      .from("proposals")
      .update({ status: "superseded" })
      .eq("id", oldProposalId);

    if (updateError) throw updateError;

    // Create new draft proposal
    const { data: result, error: insertError } = await supabase
      .from("proposals")
      .insert({
        client_id: data.client_id,
        venue_id: data.venue_id,
        status: "draft",
        token: crypto.randomUUID(),
      })
      .select()
      .single();

    if (insertError) throw insertError;

    revalidatePath("/admin");
    return { data: result, error: null };
  } catch (error) {
    return { data: null, error: (error as Error).message };
  }
}
