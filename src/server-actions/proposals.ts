"use server";

import { createClient } from "@/utils/server";
import { revalidatePath } from "next/cache";
import crypto from "crypto";
import { dispatchNotification } from "@/lib/notification-service";
import { logAuditEvent } from "@/lib/audit-service";

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
        "*, clients(*), venues(*), proposal_line_items(*, services(name), service_tiers(name)), internal_notes(*), payments(*, payment_schedules(*))",
      )
      .eq("id", id)
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error: (error as Error).message };
  }
}

export async function createProposal(data: {
  client_id: string;
  venue_id?: string;
  notes?: string;
}) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    let authorId = user?.id;
    console.log("createProposal authorId:", authorId); // Log the authorId for debugging
    if (!authorId) {
      const { data: dbUsers } = await supabase
        .from("users")
        .select("id")
        .limit(1);
      if (dbUsers && dbUsers.length > 0) {
        authorId = dbUsers[0].id;
      }
    }

    const { data: result, error } = await supabase
      .from("proposals")
      .insert({
        client_id: data.client_id,
        venue_id: data.venue_id || null,
        status: "draft",
        token: crypto.randomUUID(),
        created_by: authorId || null,
      })
      .select()
      .single();

    if (error) throw error;

    if (data.notes?.trim() && authorId) {
      await supabase.from("internal_notes").insert({
        proposal_id: result.id,
        author_id: authorId,
        content: data.notes.trim(),
      });
    }

    revalidatePath("/admin");
    return { data: result, error: null };
  } catch (error) {
    console.error("Error creating proposal:", error);
    return { data: null, error: (error as Error).message };
  }
}

export async function updateProposal(
  id: string,
  data: {
    client_id?: string;
    venue_id?: string;
    status?: "draft" | "sent" | "signed" | "superseded" | "intake_complete";
    discount_expires_at?: string;
    signed_at?: string;
    signer_email?: string;
    signer_ip?: string;
    signer_user_agent?: string;
    document_hash?: string;
    total_snapshot_cents?: number;
    notes?: string;
  },
) {
  try {
    const supabase = await createClient();

    // Extract notes if present, as it goes to internal_notes rather than proposals
    const { notes, ...proposalData } = data;

    const { data: result, error } = await supabase
      .from("proposals")
      .update(proposalData)
      .eq("id", id)
      .select(`*, clients(id, name, email), venues(name, address)`)
      .single();

    if (error) throw error;

    if (notes !== undefined) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      let authorId = user?.id;
      if (!authorId) {
        const { data: dbUsers } = await supabase
          .from("users")
          .select("id")
          .limit(1);
        if (dbUsers && dbUsers.length > 0) {
          authorId = dbUsers[0].id;
        }
      }

      if (authorId) {
        // Check if there is an existing internal note for this proposal
        const { data: existingNotes } = await supabase
          .from("internal_notes")
          .select("id")
          .eq("proposal_id", id)
          .order("created_at", { ascending: true })
          .limit(1);

        if (existingNotes && existingNotes.length > 0) {
          await supabase
            .from("internal_notes")
            .update({ content: notes.trim() })
            .eq("id", existingNotes[0].id);
        } else if (notes.trim()) {
          await supabase.from("internal_notes").insert({
            proposal_id: id,
            author_id: authorId,
            content: notes.trim(),
          });
        }
      }
    }

    // Only dispatch notification for status changes (not draft edits)
    if (data.status === "sent") {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const payload = {
        clientEmail: result.clients?.email,
        clientName: result.clients?.name,
        venueName: result.venues?.name,
        venueAddress: result.venues?.address,
        portalUrl: `${appUrl}/portal/${result.token}`,
      };
      await Promise.allSettled([
        dispatchNotification("PROPOSAL_SENT", payload),
        logAuditEvent(id, "PROPOSAL_SENT", payload),
      ]);
    }

    revalidatePath("/admin");
    return { data: result, error: null };
  } catch (error) {
    return { data: null, error: (error as Error).message };
  }
}

export const sendProposal = async (proposalId: string) => {
  try {
    const supabase = await createClient();
    const { data: proposal, error: proposalErr } = await supabase
      .from("proposals")
      .select("id, token, status, clients(email, name), venues(name, address)")
      .eq("id", proposalId)
      .single();

    if (proposalErr || !proposal) {
      throw new Error(proposalErr?.message || "Proposal not found");
    }

    const proposalData = proposal;
    if (proposalData.status === "draft") {
      const { error: updateErr } = await supabase
        .from("proposals")
        .update({ status: "sent" })
        .eq("id", proposalId);
      if (updateErr) throw updateErr;
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const clientData = Array.isArray(proposalData.clients)
      ? proposalData.clients[0]
      : proposalData.clients;
    const venueData = Array.isArray(proposalData.venues)
      ? proposalData.venues[0]
      : proposalData.venues;

    const payload = {
      clientEmail: clientData?.email,
      clientName: clientData?.name,
      venueName: venueData?.name,
      venueAddress: venueData?.address,
      portalUrl: `${appUrl}/portal/${proposal.token}`,
    };

    await Promise.allSettled([
      dispatchNotification("PROPOSAL_SENT", payload),
      logAuditEvent(proposalId, "PROPOSAL_SENT", payload),
    ]);

    revalidatePath("/admin");
    return { data: proposal, error: null };
  } catch (error) {
    return { data: null, error: (error as Error).message };
  }
};

export async function addInternalNote(proposalId: string, content: string) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    let authorId = user?.id;
    if (!authorId) {
      const { data: dbUsers } = await supabase
        .from("users")
        .select("id")
        .limit(1);
      if (dbUsers && dbUsers.length > 0) {
        authorId = dbUsers[0].id;
      }
    }

    if (!authorId) throw new Error("No user found");

    const { data, error } = await supabase
      .from("internal_notes")
      .insert({
        proposal_id: proposalId,
        author_id: authorId,
        content: content.trim(),
      })
      .select()
      .single();

    if (error) throw error;

    revalidatePath("/admin");
    return { data, error: null };
  } catch (error) {
    console.error("Error adding internal note:", error);
    return { data: null, error: (error as Error).message };
  }
}

export async function supersedeProposal(
  oldProposalId: string,
  data: {
    client_id: string;
    venue_id?: string;
    notes?: string;
  },
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    let authorId = user?.id;
    if (!authorId) {
      const { data: dbUsers } = await supabase
        .from("users")
        .select("id")
        .limit(1);
      if (dbUsers && dbUsers.length > 0) {
        authorId = dbUsers[0].id;
      }
    }

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
        venue_id: data.venue_id || null,
        status: "draft",
        token: crypto.randomUUID(),
        created_by: authorId || null,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    if (data.notes?.trim() && authorId) {
      await supabase.from("internal_notes").insert({
        proposal_id: result.id,
        author_id: authorId,
        content: data.notes.trim(),
      });
    }

    revalidatePath("/admin");
    return { data: result, error: null };
  } catch (error) {
    return { data: null, error: (error as Error).message };
  }
}
