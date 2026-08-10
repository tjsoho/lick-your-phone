"use server";

import { createClient } from "@/utils/server";
import { revalidatePath } from "next/cache";

export async function getTiersByServiceId(serviceId: string) {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("service_tiers")
      .select("*")
      .eq("service_id", serviceId)
      .order("sequence", { ascending: true });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error: (error as Error).message };
  }
}

export async function upsertTier(data: {
  id?: string;
  service_id: string;
  slug: string;
  name: string;
  target_price_cents: number;
  billing_cycle_months: number;
  sequence?: number;
}) {
  try {
    const supabase = await createClient();

    let sequence = data.sequence;
    if (sequence === undefined && !data.id) {
      // get max sequence
      const { data: tiers, error: seqError } = await supabase
        .from("service_tiers")
        .select("sequence")
        .eq("service_id", data.service_id)
        .order("sequence", { ascending: false })
        .limit(1);

      if (seqError) throw seqError;
      sequence = tiers && tiers.length > 0 ? tiers[0].sequence + 1 : 1;
    }

    const payload = {
      ...data,
      sequence,
      updated_at: new Date().toISOString(),
    };

    const { data: result, error } = await supabase
      .from("service_tiers")
      .upsert(payload)
      .select()
      .single();

    if (error) throw error;
    revalidatePath("/admin");
    return { data: result, error: null };
  } catch (error) {
    return { data: null, error: (error as Error).message };
  }
}

export async function deleteTier(id: string) {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("service_tiers")
      .delete()
      .eq("id", id);

    if (error) throw error;
    revalidatePath("/admin");
    return { error: null };
  } catch (error) {
    return { error: (error as Error).message };
  }
}

export async function reorderTiers(tierIds: string[]) {
  try {
    const supabase = await createClient();

    // Perform individual updates since Supabase/PostgreSQL client upserting multi-rows is standard,
    // but a loop is simplest and least error-prone for sequence updates.
    // admin client not strictly required if client is logged in and schema is open.
    for (let i = 0; i < tierIds.length; i++) {
      const { error } = await supabase
        .from("service_tiers")
        .update({ sequence: i + 1, updated_at: new Date().toISOString() })
        .eq("id", tierIds[i]);
      if (error) throw error;
    }

    revalidatePath("/admin");
    return { error: null };
  } catch (error) {
    return { error: (error as Error).message };
  }
}
