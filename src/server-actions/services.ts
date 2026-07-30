"use server";

import { createClient } from "@/utils/server";
import { revalidatePath } from "next/cache";

export async function getServices() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("services")
      .select("*, service_tiers(*)")
      .order("sequence");

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error: (error as Error).message };
  }
}

export async function getService(slug: string) {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("services")
      .select(
        "*, service_tiers(*), service_inclusions(*), service_client_obligations(*)"
      )
      .eq("slug", slug)
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error: (error as Error).message };
  }
}

export async function createService(data: {
  slug: string;
  name: string;
  template?: string;
  billing: "one_off" | "recurring_monthly" | "in_kind";
  term?: string;
  target_price_cents?: number;
  discount_pct?: number;
  discount_window_hours?: number;
  price_display_period?: string;
  requires_other_service?: boolean;
  sequence?: number;
}) {
  try {
    const supabase = await createClient();
    const { data: result, error } = await supabase
      .from("services")
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

export async function updateService(
  id: string,
  data: {
    slug?: string;
    name?: string;
    template?: string;
    billing?: "one_off" | "recurring_monthly" | "in_kind";
    term?: string;
    target_price_cents?: number;
    discount_pct?: number;
    discount_window_hours?: number;
    price_display_period?: string;
    requires_other_service?: boolean;
    sequence?: number;
  }
) {
  try {
    const supabase = await createClient();
    const { data: result, error } = await supabase
      .from("services")
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

export async function deleteService(id: string) {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("services").delete().eq("id", id);

    if (error) throw error;
    revalidatePath("/admin");
    return { data: true, error: null };
  } catch (error) {
    return { data: null, error: (error as Error).message };
  }
}

export async function updateServiceInclusions(
  serviceId: string,
  inclusions: { text: string; sequence: number }[]
) {
  try {
    const supabase = await createClient();

    const { error: deleteError } = await supabase
      .from("service_inclusions")
      .delete()
      .eq("service_id", serviceId);

    if (deleteError) throw deleteError;

    if (inclusions.length > 0) {
      const { error: insertError } = await supabase
        .from("service_inclusions")
        .insert(
          inclusions.map((i) => ({
            service_id: serviceId,
            text: i.text,
            sequence: i.sequence,
          }))
        );

      if (insertError) throw insertError;
    }

    revalidatePath("/admin");
    return { data: true, error: null };
  } catch (error) {
    return { data: null, error: (error as Error).message };
  }
}

export async function updateServiceObligations(
  serviceId: string,
  obligations: { text: string; sequence: number }[]
) {
  try {
    const supabase = await createClient();

    const { error: deleteError } = await supabase
      .from("service_client_obligations")
      .delete()
      .eq("service_id", serviceId);

    if (deleteError) throw deleteError;

    if (obligations.length > 0) {
      const { error: insertError } = await supabase
        .from("service_client_obligations")
        .insert(
          obligations.map((o) => ({
            service_id: serviceId,
            text: o.text,
            sequence: o.sequence,
          }))
        );

      if (insertError) throw insertError;
    }

    revalidatePath("/admin");
    return { data: true, error: null };
  } catch (error) {
    return { data: null, error: (error as Error).message };
  }
}
