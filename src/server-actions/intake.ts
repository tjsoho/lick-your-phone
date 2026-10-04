"use server";

import { createClient, createAdminClient } from "@/utils/server";
import { revalidatePath } from "next/cache";
import { onIntakeCompleted } from "@/lib/integrations";
import {
  contactKey,
  intakeContacts,
  type ContactSourceQuestion,
} from "@/lib/intake-contacts";

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

/**
 * Puts the people named in the onboarding form onto the client record.
 *
 * The form was already collecting a primary contact and a list of other team
 * members, and none of it reached the `contacts` table — the agency opened a
 * client the day after onboarding and found nobody there. Which questions
 * hold which part of a contact is worked out in `@/lib/intake-contacts`,
 * which explains itself at length; in short, nothing here depends on a
 * question's wording.
 *
 * Returns how many contacts were written. Throws on a database failure, and
 * the caller is where that is caught: by the time this runs the submission
 * is already recorded, and a contact that doesn't land is a row the agency
 * can add by hand — not a reason to hand the client an error for answers
 * that are safely in.
 */
async function syncContactsFromIntake(
  supabase: Awaited<ReturnType<typeof createAdminClient>>,
  clientId: string,
  proposalId: string,
): Promise<number> {
  // Hidden questions are excluded for the same reason the form excludes
  // them: a question the client never saw has no answer, and an empty one
  // must not take the place of a question they did answer.
  const { data: questions, error: questionsError } = await supabase
    .from("intake_questions")
    .select("id, page_number, sequence, section, field_label, field_type, config")
    .eq("hidden", false);
  if (questionsError) throw questionsError;

  const { data: responses, error: responsesError } = await supabase
    .from("intake_responses")
    .select("question_id, value")
    .eq("proposal_id", proposalId);
  if (responsesError) throw responsesError;

  const found = intakeContacts(
    (questions ?? []) as ContactSourceQuestion[],
    responses ?? [],
  );
  if (found.length === 0) return 0;

  // Submissions are one-way now, so the client who gets here twice is one who
  // was already set up by hand. Matching on email — or on a name, where there
  // is no email — updates that row instead of sitting a duplicate beside it.
  const { data: existing, error: existingError } = await supabase
    .from("contacts")
    .select("id, first_name, last_name, email")
    .eq("client_id", clientId);
  if (existingError) throw existingError;

  const byKey = new Map(
    (existing ?? []).map((c) => [contactKey(c), c] as const),
  );

  for (const contact of found) {
    // Only what the client actually filled in. A blank answer leaves whatever
    // the agency already holds alone rather than erasing it.
    const filled = {
      ...(contact.first_name ? { first_name: contact.first_name } : {}),
      ...(contact.last_name ? { last_name: contact.last_name } : {}),
      ...(contact.email ? { email: contact.email } : {}),
      ...(contact.phone ? { phone: contact.phone } : {}),
      ...(contact.role ? { role: contact.role } : {}),
    };

    const match = byKey.get(contactKey(contact));
    if (match) {
      // Promoting to primary is a change the client just made; nobody is
      // demoted to make room for them.
      const { error } = await supabase
        .from("contacts")
        .update(contact.is_primary ? { ...filled, is_primary: true } : filled)
        .eq("id", match.id);
      if (error) throw error;
      continue;
    }

    const { data: inserted, error } = await supabase
      .from("contacts")
      .insert({
        client_id: clientId,
        first_name: contact.first_name,
        last_name: contact.last_name,
        email: contact.email || null,
        phone: contact.phone || null,
        role: contact.role || null,
        is_primary: contact.is_primary,
      })
      .select("id, first_name, last_name, email")
      .single();
    if (error) throw error;
    if (inserted) byKey.set(contactKey(inserted), inserted);
  }

  return found.length;
}

export async function completeIntake(
  proposalId: string,
): Promise<{ error: string | null; locked?: boolean }> {
  try {
    const supabase = await createAdminClient();

    const { data: proposal } = await supabase
      .from("proposals")
      .select(
        "signer_email, client_id, client:clients!client_id(name), venue:venues!venue_id(name, address), status, token",
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

    // The answers are in and recorded by this point, so nothing below may
    // throw its way out of here: a contact that fails to write is a note in
    // the log and an audit row the team can act on, never a client told
    // their submission failed when it didn't.
    if (proposal.client_id) {
      try {
        await syncContactsFromIntake(supabase, proposal.client_id, proposalId);
      } catch (err) {
        console.error("[intake] contact sync failed:", err);
        await supabase
          .from("audit_events")
          .insert({
            entity_type: "proposal",
            entity_id: proposalId,
            action: "intake_contacts_failed",
            metadata: { message: (err as Error).message },
          })
          // Logging the failure must not become a second failure.
          .then(({ error }) => {
            if (error) console.error("[intake] contact sync audit failed:", error);
          });
      }
    }

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
    // The submission now writes the client's contacts, and those are read on
    // the client's own page — which would otherwise serve a cached copy
    // without them.
    revalidatePath("/admin/clients", "layout");
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
