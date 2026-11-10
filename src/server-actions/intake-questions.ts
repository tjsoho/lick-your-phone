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
  updates: {
    id: string;
    sequence: number;
    page_number: number;
    /**
     * The section the question now belongs to, where the move changed it.
     *
     * A question dropped under a different heading, or onto another page,
     * takes the section of whatever it landed among. Leaving this off means
     * "unchanged", which is the common case of a row moving inside its own
     * section, so an ordinary reorder never rewrites the field.
     */
    section?: string | null;
  }[],
) {
  try {
    const supabase = await createAdminClient();

    for (const update of updates) {
      const fields: Record<string, unknown> = {
        sequence: update.sequence,
        page_number: update.page_number,
      };
      if (update.section !== undefined) fields.section = update.section;

      const { error } = await supabase
        .from("intake_questions")
        .update(fields)
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

/**
 * Puts the form's pages in a new order.
 *
 * `order` is the page numbers as they should now read, first to last, so
 * dragging page 4 to the front sends [4, 1, 2, 3] and they become 1, 2, 3, 4.
 *
 * TWO PASSES, BECAUSE A PAGE NUMBER IS A PRIMARY KEY.
 *
 * `intake_pages` is keyed by the number itself, so writing page 4 as page 2
 * while a page 2 still exists collides. Everything is moved out to numbers
 * nothing uses, then brought back down into place. The questions are carried
 * the same way so the two can never disagree halfway through.
 *
 * Nobody's answers move. They hang off the question, not the page, so a
 * client who filled this form in last week still has every answer against
 * the question they answered, wherever that question now sits.
 */
export async function reorderIntakePages(order: number[]) {
  try {
    const supabase = await createAdminClient();

    // Far enough above anything real that the parking space is always free.
    const PARK = 10_000;
    const destination = new Map(order.map((page, index) => [page, index + 1]));

    // Nothing to do, and worth leaving early rather than rewriting every row
    // for an order that already reads that way.
    if (order.every((page, index) => page === index + 1)) {
      return { data: true, error: null };
    }

    for (const pass of ["park", "land"] as const) {
      for (const [from, to] of destination) {
        const was = pass === "park" ? from : PARK + to;
        const now = pass === "park" ? PARK + to : to;

        const { error: qError } = await supabase
          .from("intake_questions")
          .update({ page_number: now })
          .eq("page_number", was);
        if (qError) throw qError;

        // A page with no name has no row here, so this updates nothing and
        // that is the correct outcome rather than an error.
        const { error: pError } = await supabase
          .from("intake_pages")
          .update({ page_number: now })
          .eq("page_number", was);
        if (pError) throw pError;
      }
    }

    revalidatePath("/admin/intake-questions");
    return { data: true, error: null };
  } catch (error) {
    return { data: null, error: (error as Error).message };
  }
}

export async function setIntakePageTitle(pageNumber: number, title: string) {
  try {
    const supabase = await createAdminClient();
    const trimmed = title.trim();

    // An emptied field means "no name", so the fallback shows again. That is
    // normally a deletion rather than a row holding an empty string. But a
    // page with no questions on it yet exists ONLY as this row, so deleting it
    // would delete the page the moment its name was cleared. Such a page keeps
    // its row and holds an empty title instead.
    if (!trimmed) {
      const { count, error: countError } = await supabase
        .from("intake_questions")
        .select("id", { count: "exact", head: true })
        .eq("page_number", pageNumber);
      if (countError) throw countError;

      if (count && count > 0) {
        const { error } = await supabase
          .from("intake_pages")
          .delete()
          .eq("page_number", pageNumber);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("intake_pages")
          .upsert(
            { page_number: pageNumber, title: "", updated_at: new Date().toISOString() },
            { onConflict: "page_number" },
          );
        if (error) throw error;
      }
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

/**
 * Start a new, empty page at the end of the onboarding form.
 *
 * "If we add a new service, we might need a new page so that we can hide it
 * or show it accordingly." A page used to exist only because a question
 * claimed its number, so there was no way to make one and then fill it.
 *
 * The row in `intake_pages` is what makes the page real before any question
 * is on it. It holds an empty title so the screen falls back to "Page N"
 * until someone names it.
 */
export async function createIntakePage() {
  try {
    const supabase = await createAdminClient();

    // The next number has to clear both tables: the highest page a question
    // sits on, and the highest page that exists but is still empty.
    const [{ data: lastQuestion, error: qError }, { data: lastPage, error: pError }] =
      await Promise.all([
        supabase
          .from("intake_questions")
          .select("page_number")
          .order("page_number", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("intake_pages")
          .select("page_number")
          .order("page_number", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

    if (qError) throw qError;
    if (pError) throw pError;

    const highest = Math.max(
      lastQuestion?.page_number ?? 0,
      lastPage?.page_number ?? 0,
    );

    // Tidy the numbering before adding to it.
    //
    // A page left over from testing sat on number 100, so the next page would
    // have been 101 and the form would have read "page 7 of 7" over a page
    // numbered 101. Normalising first means the numbers always run 1 upwards
    // with no gaps, whatever state they were left in.
    let pageNumber = highest + 1;
    if (highest > 0) {
      const { data: numbered, error: listError } = await supabase
        .from("intake_questions")
        .select("page_number");
      if (listError) throw listError;

      const existing = new Set<number>((numbered ?? []).map((r) => r.page_number));
      const { data: namedPages, error: namedError } = await supabase
        .from("intake_pages")
        .select("page_number");
      if (namedError) throw namedError;
      for (const row of namedPages ?? []) existing.add(row.page_number);

      const order = [...existing].sort((a, b) => a - b);
      if (!order.every((page, index) => page === index + 1)) {
        const { error: tidyError } = await reorderIntakePages(order);
        if (tidyError) throw new Error(tidyError);
      }
      pageNumber = order.length + 1;
    }

    const { error } = await supabase
      .from("intake_pages")
      .upsert(
        { page_number: pageNumber, title: "", updated_at: new Date().toISOString() },
        { onConflict: "page_number" },
      );
    if (error) throw error;

    revalidatePath("/admin/intake-questions");
    return { data: pageNumber, error: null };
  } catch (error) {
    return { data: null, error: (error as Error).message };
  }
}

/**
 * Remove a page that has nothing on it.
 *
 * Only ever an empty one. A page with questions on it would take them with
 * it, and deleting a client's questions is not something a stray click
 * should be able to do.
 */
export async function deleteIntakePage(pageNumber: number) {
  try {
    const supabase = await createAdminClient();

    const { count, error: countError } = await supabase
      .from("intake_questions")
      .select("id", { count: "exact", head: true })
      .eq("page_number", pageNumber);
    if (countError) throw countError;

    if (count && count > 0) {
      return {
        data: null,
        error: "That page still has questions on it. Move or delete them first.",
      };
    }

    const { error } = await supabase
      .from("intake_pages")
      .delete()
      .eq("page_number", pageNumber);
    if (error) throw error;

    revalidatePath("/admin/intake-questions");
    return { data: true, error: null };
  } catch (error) {
    return { data: null, error: (error as Error).message };
  }
}
