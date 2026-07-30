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

export async function createProvider(data: {
  name: string;
  type: "photographer" | "videographer";
  description?: string;
  portfolio_url?: string;
  price_cents?: number;
  image_url?: string;
}) {
  try {
    const supabase = await createClient();
    const { data: result, error } = await supabase
      .from("providers")
      .insert(data)
      .select()
      .single();

    if (error) throw error;
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
  }
) {
  try {
    const supabase = await createClient();
    const { data: result, error } = await supabase
      .from("providers")
      .update(data)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    revalidatePath("/admin");
    return { data: result, error: null };
  } catch (error) {
    return { data: null, error: (error as Error).message };
  }
}
