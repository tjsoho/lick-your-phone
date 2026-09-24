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
      section_subtitle: input.section_subtitle || null,
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

/**
 * The names the agency gives each page of the onboarding form.
 *
 * Keyed by page number rather than by a page record: questions already carry
 * the number, so a title is a label for a number, and a page with no title
 * simply falls back to "Page N" wherever it is shown.
 */
export async function getIntakePageTitles() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("intake_pages")
      .select("page_number, title")
      .order("page_number", { ascending: true });

    if (error) throw error;

    const titles: Record<number, string> = {};
    for (const row of data ?? []) titles[row.page_number] = row.title;
    return { data: titles, error: null };
  } catch (error) {
    return { data: {} as Record<number, string>, error: (error as Error).message };
  }
}

export async function setIntakePageTitle(pageNumber: number, title: string) {
  try {
    const supabase = await createAdminClient();
    const trimmed = title.trim();

    // An emptied field means "no name", which is a deletion rather than a row
    // holding an empty string: the fallback is what should show again.
    if (!trimmed) {
      const { error } = await supabase
        .from("intake_pages")
        .delete()
        .eq("page_number", pageNumber);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from("intake_pages")
        .upsert(
          { page_number: pageNumber, title: trimmed, updated_at: new Date().toISOString() },
          { onConflict: "page_number" },
        );
      if (error) throw error;
    }

    revalidatePath("/admin/intake-questions");
    return { data: true, error: null };
  } catch (error) {
    return { data: null, error: (error as Error).message };
  }
}

/**
 * Show or hide one question.
 *
 * Hidden questions are filtered out before the client's form is even built
 * (`getIntakeQuestions` asks for `hidden = false`), so a hidden question never
 * appears however its conditions read. That was invisible from the dashboard
 * until now, which made a switched-off question look like a broken condition.
 */
export async function setQuestionHidden(id: string, hidden: boolean) {
  try {
    const supabase = await createAdminClient();
    const { error } = await supabase
      .from("intake_questions")
      .update({ hidden, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) throw error;

    revalidatePath("/admin/intake-questions");
    return { data: true, error: null };
  } catch (error) {
    return { data: null, error: (error as Error).message };
  }
}
