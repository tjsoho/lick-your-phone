"use server";

import { createClient } from "@/utils/server";
import { revalidatePath } from "next/cache";

export async function togglePageVisibility(id: string, visible: boolean) {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("pages")
      .update({ visible })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    revalidatePath("/admin/pages");
    return { data, error: null };
  } catch (error) {
    return { data: null, error: (error as Error).message };
  }
}
