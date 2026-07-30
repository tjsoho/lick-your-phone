"use server";

import { createClient } from "@/utils/server";
import { revalidatePath } from "next/cache";

export async function getStates() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("states")
      .select("*")
      .order("name");

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error: (error as Error).message };
  }
}

export async function createState(data: { code: string; name: string }) {
  try {
    const supabase = await createClient();
    const { data: result, error } = await supabase
      .from("states")
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
