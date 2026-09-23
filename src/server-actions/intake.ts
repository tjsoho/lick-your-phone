"use server";

import { createClient, createAdminClient } from "@/utils/server";
import { revalidatePath } from "next/cache";
import { onIntakeCompleted } from "@/lib/integrations";

export async function getIntakeQuestions(): Promise<{
  data: IntakeQuestionWithConditions[];
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("intake_questions")
      .select(
        `
        id,
        page_number,
        section,
        field_label,
        field_type,
        options,
        required,
        sequence,
        config,
        section_subtitle,
        intake_conditions!intake_conditions_question_id_intake_questions_id_fk (
          id,
          condition_type,
          condition_service_id,
          condition_state_id,
          condition_question_id,
          condition_value
        )
      `,
      )
      // Hidden questions stay in the database but never reach a client.
      .eq("hidden", false)
      .order("page_number", { ascending: true })
      .order("sequence", { ascending: true });

    if (error) throw error;

    return { data: data, error: null };
  } catch (error) {
    return { data: [], error: (error as Error).message };
  }
}

export async function getProvidersByState(stateId: string): Promise<{
  data: Provider[] | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("providers")
      .select(
        `
        id,
        name,
        type,
        description,
        portfolio_url,
        price_cents,
        image_url,
        provider_states!inner ( state_id, code, name )
      `,
      )
      .eq("provider_states.state_id", stateId)
      .order("name");

    if (error) throw error;

    const providers: Provider[] = (data ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      type: p.type,
      description: p.description,
      portfolio_url: p.portfolio_url,
      price_cents: p.price_cents ?? 0,
      image_url: p.image_url,
      provider_states: p.provider_states.map((ps) => ({
        states: {
          id: ps.state_id,
          code: ps.code,
          name: ps.name,
        },
      })),
    }));

    return { data: providers, error: null };
  } catch (error) {
    return { data: null, error: (error as Error).message };
  }
}

export async function getAllProviders(): Promise<{
  data: Provider[] | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("providers")
      .select(
        `
        id,
        name,
        type,
        description,
        portfolio_url,
        price_cents,
        image_url,
        provider_states!inner ( state_id, code, name )
      `,
      )
      .order("name");

    if (error) throw error;

    const providers: Provider[] = (data ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      type: p.type,
      description: p.description,
      portfolio_url: p.portfolio_url,
      price_cents: p.price_cents ?? 0,
      image_url: p.image_url,
      provider_states: p.provider_states.map((ps) => ({
        states: {
          id: ps.state_id,
          code: ps.code,
          name: ps.name,
        },
      })),
    }));

    return { data: providers, error: null };
  } catch (error) {
    return { data: null, error: (error as Error).message };
  }
}

/**
 * The onboarding answers are final once submitted: changes go through the
 * team, not the form. `intake_complete` is written by `completeIntake` alone,
 * so a client who is part-way through — status `signed` — is never caught by
 * this, and nothing here can strand someone in a form they haven't finished.
 *
 * Checked on the server as well as in the UI, because a disabled button is a
 * courtesy, not a lock: a stale tab, a second window or a replayed action all
 * reach these two writes directly.
 */
const INTAKE_LOCKED_MESSAGE =
  "These onboarding answers have already been submitted. Your marketer can make any changes with you.";

async function readIntakeLock(
  supabase: Awaited<ReturnType<typeof createAdminClient>>,
  proposalId: string,
): Promise<{ error: string; locked: boolean } | null> {
  const { data, error } = await supabase
    .from("proposals")
    .select("status")
    .eq("id", proposalId)
    .single();

  if (error || !data) return { error: "Proposal not found", locked: false };
  if (data.status === "intake_complete") {
    return { error: INTAKE_LOCKED_MESSAGE, locked: true };
  }
  return null;
}

export async function saveIntakeResponses(
  proposalId: string,
  responses: { questionId: string; value: unknown }[],
): Promise<{ error: string | null; locked?: boolean }> {
  try {
    const supabase = await createAdminClient();

    const lock = await readIntakeLock(supabase, proposalId);
    if (lock) return lock;

    for (const r of responses) {
      const { error } = await supabase.from("intake_responses").upsert(
        {
          proposal_id: proposalId,
          question_id: r.questionId,
          value: r.value as Record<string, unknown>,
        },
        {
          onConflict: "proposal_id,question_id",
        },
      );

      if (error) throw error;
    }

    return { error: null };
  } catch (error) {
    return { error: (error as Error).message };
  }
}

export async function completeIntake(
  proposalId: string,
): Promise<{ error: string | null; locked?: boolean }> {
  try {
    const supabase = await createAdminClient();

    const { data: proposal } = await supabase
      .from("proposals")
      .select(
        "signer_email, client:clients!client_id(name), venue:venues!venue_id(name, address), status, token",
      )
      .eq("id", proposalId)
      .single();

    if (!proposal) {
      throw new Error("Proposal not found");
    }

    // Submitting is a one-way door. A second attempt — a stale tab, a double
    // click that outran the UI — is refused rather than re-notifying the team.
    if (proposal.status === "intake_complete") {
      return { error: INTAKE_LOCKED_MESSAGE, locked: true };
    }

    // Collect asset URLs from file-type responses
    const { data: fileQuestionIds } = await supabase
      .from("intake_questions")
      .select("id")
      .eq("field_type", "file");

    let assets: string[] = [];
    if (fileQuestionIds && fileQuestionIds.length > 0) {
      const { data: fileResponses } = await supabase
        .from("intake_responses")
        .select("value")
        .eq("proposal_id", proposalId)
        .in(
          "question_id",
          fileQuestionIds.map((q) => q.id),
        );

      assets = (fileResponses ?? []).flatMap((r) => {
        const val = r.value;
        if (Array.isArray(val)) {
          return val
            .filter((f: { url?: string }) => f.url)
            .map((f: { url: string }) => f.url);
        }
        return [];
      });
    }

    // Update proposal status
    const { error: updateError } = await supabase
      .from("proposals")
      .update({ status: "intake_complete" })
      .eq("id", proposalId);

    if (updateError) throw updateError;

    // Write audit event
    const { error: auditError } = await supabase.from("audit_events").insert({
      entity_type: "proposal",
      entity_id: proposalId,
      // Only ever a first completion now — the guard above turns a repeat
      // into a refusal, so there is no "edited" case left to record.
      action: "intake_completed",
      metadata: { completed_at: new Date().toISOString() },
    });

    if (auditError) throw auditError;

    // Fire integrations (non-blocking)
    const clientObj = proposal.client as unknown as { name: string } | null;
    const venueObj = proposal.venue as unknown as {
      name: string;
      address: string;
    } | null;
    const clientName = clientObj?.name ?? "Client";

    onIntakeCompleted({
      proposalId,
      clientName,
      clientEmail: proposal.signer_email ?? "",

      venueName: venueObj?.name ?? "Venue",
      venueAddress: venueObj?.address ?? "",
      proposalToken: proposal.token,
      isEdit: false,
      assets,
    });

    revalidatePath("/admin");
    return { error: null };
  } catch (error) {
    return { error: (error as Error).message };
  }
}

export async function uploadIntakeFile(
  questionId: string,
  formData: FormData,
): Promise<{ name: string; url: string; size: number } | { error: string }> {
  try {
    const supabase = await createAdminClient();
    const file = formData.get("file") as File | null;
    if (!file) return { error: "No file provided" };

    const ext = file.name.split(".").pop();
    const path = `intake/${questionId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from("intake-uploads")
      .upload(path, Buffer.from(arrayBuffer), {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) return { error: uploadError.message };

    const {
      data: { publicUrl },
    } = supabase.storage.from("intake-uploads").getPublicUrl(path);

    return { name: file.name, url: publicUrl, size: file.size };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function getIntakeResponses(proposalId: string): Promise<{
  data: Record<string, unknown> | null;
  error: string | null;
}> {
  try {
    const supabase = await createAdminClient();
    const { data, error } = await supabase
      .from("intake_responses")
      .select("question_id, value")
      .eq("proposal_id", proposalId);

    if (error) throw error;

    const responses: Record<string, unknown> = {};
    for (const r of data ?? []) {
      responses[r.question_id] = r.value;
    }

    return { data: responses, error: null };
  } catch (error) {
    return { data: null, error: (error as Error).message };
  }
}
