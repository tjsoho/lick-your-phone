"use server";

import { createClient, createAdminClient } from "@/utils/server";
import { revalidatePath } from "next/cache";
import { onIntakeCompleted } from "@/lib/integrations";

export interface IntakeQuestion {
  id: string;
  pageNumber: number;
  section: string | null;
  fieldLabel: string;
  fieldType: string;
  options: unknown;
  required: boolean;
  sequence: number;
  config: unknown;
  conditions: IntakeCondition[];
}

export interface IntakeCondition {
  id: string;
  conditionType: string;
  conditionServiceId: string | null;
  conditionStateId: string | null;
  conditionQuestionId: string | null;
  conditionValue: string | null;
}

export interface Provider {
  id: string;
  name: string;
  type: string | null;
  description: string | null;
  portfolioUrl: string | null;
  priceCents: number;
  imageUrl: string | null;
}

export async function getIntakeQuestions(): Promise<{
  data: IntakeQuestion[] | null;
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
      .order("page_number", { ascending: true })
      .order("sequence", { ascending: true });

    if (error) throw error;

    const questions: IntakeQuestion[] = (data ?? []).map((q) => ({
      id: q.id,
      pageNumber: q.page_number,
      section: q.section,
      fieldLabel: q.field_label,
      fieldType: q.field_type ?? "text",
      options: q.options,
      required: q.required ?? false,
      sequence: q.sequence,
      config: q.config,
      conditions: (
        (q.intake_conditions as unknown as Array<{
          id: string;
          condition_type: string;
          condition_service_id: string | null;
          condition_state_id: string | null;
          condition_question_id: string | null;
          condition_value: string | null;
        }>) ?? []
      ).map((c) => ({
        id: c.id,
        conditionType: c.condition_type,
        conditionServiceId: c.condition_service_id,
        conditionStateId: c.condition_state_id,
        conditionQuestionId: c.condition_question_id,
        conditionValue: c.condition_value,
      })),
    }));

    return { data: questions, error: null };
  } catch (error) {
    return { data: null, error: (error as Error).message };
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
        provider_states!inner ( state_id )
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
      portfolioUrl: p.portfolio_url,
      priceCents: p.price_cents ?? 0,
      imageUrl: p.image_url,
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
        image_url
      `,
      )
      .order("name");

    if (error) throw error;

    const providers: Provider[] = (data ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      type: p.type,
      description: p.description,
      portfolioUrl: p.portfolio_url,
      priceCents: p.price_cents ?? 0,
      imageUrl: p.image_url,
    }));

    return { data: providers, error: null };
  } catch (error) {
    return { data: null, error: (error as Error).message };
  }
}

export async function saveIntakeResponses(
  proposalId: string,
  responses: { questionId: string; value: unknown }[],
): Promise<{ error: string | null }> {
  try {
    const supabase = await createAdminClient();
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
): Promise<{ error: string | null }> {
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

    const isEdit = proposal?.status === "intake_complete";

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
      action: isEdit ? "intake_edited" : "intake_completed",
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
      isEdit,
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
