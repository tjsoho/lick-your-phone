"use server";

import { revalidatePath } from "next/cache";

export async function revalidateAllPages() {
  try {
    // Revalidate the home page + layout (header/footer). Add more paths here
    // as you add pages.
    revalidatePath("/", "layout");
    console.log("Revalidated all pages");
    return { success: true };
  } catch (error) {
    console.error("Revalidation error:", error);
    return { success: false, error };
  }
}
