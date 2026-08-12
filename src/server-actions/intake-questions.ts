"use server";

import { createClient, createAdminClient } from "@/utils/server";
import { revalidatePath } from "next/cache";

export async function getQuestions() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("intake_questions")
      .select(
        `
        *,
        intake_conditions!intake_conditions_question_id_intake_questions_id_fk (
          *
        )
      `,
      )
      .order("page_number", { ascending: true })
      .order("sequence", { ascending: true });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error: (error as Error).message };
  }
}

export async function upsertQuestion(input: IntakeQuestionInput) {
  try {
    const supabase = await createAdminClient();

    const questionData = {
      page_number: input.page_number,
      section: input.section || null,
      field_label: input.field_label,
      field_type: input.field_type,
      options: input.options || null,
      required: input.required || false,
      sequence: input.sequence,
      config: input.config || null,
      ...(input.id ? { id: input.id } : {}),
    };

    const { data: question, error: qError } = await supabase
      .from("intake_questions")
      .upsert(questionData)
      .select()
      .single();

    if (qError) throw qError;

    // Manage conditions
    if (input.id) {
      const { error: deleteError } = await supabase
        .from("intake_conditions")
        .delete()
        .eq("question_id", input.id);
      if (deleteError) throw deleteError;
    }

    if (input.intake_conditions && input.intake_conditions.length > 0) {
      const conditionsToInsert = input.intake_conditions.map((c) => ({
        question_id: question.id,
        condition_type: c.condition_type,
        condition_service_id: c.condition_service_id || null,
        condition_state_id: c.condition_state_id || null,
        condition_question_id: c.condition_question_id || null,
        condition_value: c.condition_value || null,
      }));

      const { error: cError } = await supabase
        .from("intake_conditions")
        .insert(conditionsToInsert);

      if (cError) throw cError;
    }

    revalidatePath("/admin/intake-questions");
    return { data: question, error: null };
  } catch (error) {
    return { data: null, error: (error as Error).message };
  }
}

export async function deleteQuestion(id: string) {
  try {
    const supabase = await createAdminClient();

    const { error: cError } = await supabase
      .from("intake_conditions")
      .delete()
      .eq("question_id", id);
    if (cError) throw cError;

    const { error: qError } = await supabase
      .from("intake_questions")
      .delete()
      .eq("id", id);
    if (qError) throw qError;

    revalidatePath("/admin/intake-questions");
    return { data: true, error: null };
  } catch (error) {
    return { data: null, error: (error as Error).message };
  }
}

export async function reorderQuestions(
  updates: { id: string; sequence: number; page_number: number }[],
) {
  try {
    const supabase = await createAdminClient();

    for (const update of updates) {
      const { error } = await supabase
        .from("intake_questions")
        .update({ sequence: update.sequence, page_number: update.page_number })
        .eq("id", update.id);

      if (error) throw error;
    }

    revalidatePath("/admin/intake-questions");
    return { data: true, error: null };
  } catch (error) {
    return { data: null, error: (error as Error).message };
  }
}
