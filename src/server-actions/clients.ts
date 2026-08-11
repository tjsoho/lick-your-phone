"use server";

import { createClient as createSupabaseClient } from "@/utils/server";
import { revalidatePath } from "next/cache";

export async function getClients() {
  try {
    const supabase = await createSupabaseClient();
    const { data, error } = await supabase
      .from("clients")
      .select("*, venues(id, name)")
      .order("name");

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error: (error as Error).message };
  }
}

export async function getClient(id: string) {
  try {
    const supabase = await createSupabaseClient();
    const { data, error } = await supabase
      .from("clients")
      .select(
        `*,
        venues(*, state:states(*)),
        contacts(*),
        proposals(
          *,
          proposal_line_items(*, services(name, slug)),
          documents(id, type, file_url, created_at),
          payments(id, status, card_last_four, card_brand, details_captured_at),
          intake_responses(id),
          internal_notes(id, content, created_at)
        )`,
      )
      .eq("id", id)
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error: (error as Error).message };
  }
}

export async function createClient(data: {
  name: string;
  slug: string;
  abn?: string;
  entity_name?: string;
  email: string;
}) {
  try {
    const supabase = await createSupabaseClient();
    const { data: result, error } = await supabase
      .from("clients")
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

export async function updateClient(
  id: string,
  data: {
    name?: string;
    slug?: string;
    abn?: string;
    entity_name?: string;
    email?: string;
  },
) {
  try {
    const supabase = await createSupabaseClient();
    const { data: result, error } = await supabase
      .from("clients")
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

export async function createVenue(data: {
  client_id: string;
  name: string;
  address?: string;
  state_id: string;
}) {
  try {
    const supabase = await createSupabaseClient();
    const { data: result, error } = await supabase
      .from("venues")
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

export async function updateVenue(
  id: string,
  data: {
    name?: string;
    address?: string;
    state_id?: string;
  },
) {
  try {
    const supabase = await createSupabaseClient();
    const { data: result, error } = await supabase
      .from("venues")
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

export async function createContact(data: {
  client_id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  role?: string;
  is_primary?: boolean;
}) {
  try {
    const supabase = await createSupabaseClient();
    const { data: result, error } = await supabase
      .from("contacts")
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

export async function updateContact(
  id: string,
  data: {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
    role?: string;
    is_primary?: boolean;
  },
) {
  try {
    const supabase = await createSupabaseClient();
    const { data: result, error } = await supabase
      .from("contacts")
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
