"use server";

import { createClient } from "@/utils/server";
import { revalidatePath } from "next/cache";

export async function getProviders() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("providers")
      .select("*, provider_states(*, states(*))")
      .order("name");

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error: (error as Error).message };
  }
}

async function syncProviderStates(
  supabase: Awaited<ReturnType<typeof createClient>>,
  providerId: string,
  stateIds: string[],
) {
  await supabase.from("provider_states").delete().eq("provider_id", providerId);
  if (stateIds.length > 0) {
    const { error } = await supabase
      .from("provider_states")
      .insert(
        stateIds.map((state_id) => ({ provider_id: providerId, state_id })),
      );
    if (error) throw error;
  }
}

export async function createProvider(data: {
  name: string;
  type: "photographer" | "videographer";
  description?: string;
  portfolio_url?: string;
  price_cents?: number;
  image_url?: string;
  state_ids?: string[];
}) {
  try {
    const supabase = await createClient();
    const { state_ids, ...providerData } = data;
    const { data: result, error } = await supabase
      .from("providers")
      .insert(providerData)
      .select()
      .single();

    if (error) throw error;
    if (state_ids?.length)
      await syncProviderStates(supabase, result.id, state_ids);
    revalidatePath("/admin");
    return { data: result, error: null };
  } catch (error) {
    return { data: null, error: (error as Error).message };
  }
}

export async function updateProvider(
  id: string,
  data: {
    name?: string;
    type?: "photographer" | "videographer";
    description?: string;
    portfolio_url?: string;
    price_cents?: number;
    image_url?: string;
    state_ids?: string[];
  },
) {
  try {
    const supabase = await createClient();
    const { state_ids, ...providerData } = data;
    const { data: result, error } = await supabase
      .from("providers")
      .update(providerData)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    if (state_ids) await syncProviderStates(supabase, id, state_ids);
    revalidatePath("/admin");
    return { data: result, error: null };
  } catch (error) {
    return { data: null, error: (error as Error).message };
  }
}
