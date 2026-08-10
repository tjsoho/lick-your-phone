"use server";

import { createClient } from "@/utils/server";
import { revalidatePath } from "next/cache";

export async function getVenues(clientId?: string) {
  try {
    const supabase = await createClient();
    let query = supabase
      .from("venues")
      .select("*, clients(name), states(name)")
      .order("created_at", { ascending: false });

    if (clientId) {
      query = query.eq("client_id", clientId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error: (error as Error).message };
  }
}

export async function getVenueById(id: string) {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("venues")
      .select("*, clients(name), states(name)")
      .eq("id", id)
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error: (error as Error).message };
  }
}

export async function upsertVenue(data: {
  id?: string;
  client_id?: string | null;
  name: string;
  address?: string | null;
  state_id: string;
}) {
  try {
    const supabase = await createClient();
    const payload = {
      client_id: data.client_id || null,
      name: data.name,
      address: data.address || null,
      state_id: data.state_id,
      updated_at: new Date().toISOString(),
    };

    let result;
    if (data.id) {
      const { data: updateData, error } = await supabase
        .from("venues")
        .update(payload)
        .eq("id", data.id)
        .select()
        .single();
      if (error) throw error;
      result = updateData;
    } else {
      const { data: insertData, error } = await supabase
        .from("venues")
        .insert({
          ...payload,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (error) throw error;
      result = insertData;
    }

    revalidatePath("/admin/venues");
    return { data: result, error: null };
  } catch (error) {
    return { data: null, error: (error as Error).message };
  }
}

export async function deleteVenue(id: string) {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("venues").delete().eq("id", id);
    if (error) throw error;

    revalidatePath("/admin/venues");
    return { success: true, error: null };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

export async function getReferenceData() {
  try {
    const supabase = await createClient();

    const [clientsRes, statesRes] = await Promise.all([
      supabase.from("clients").select("id, name").order("name"),
      supabase.from("states").select("id, name").order("name"),
    ]);

    if (clientsRes.error) throw clientsRes.error;
    if (statesRes.error) throw statesRes.error;

    return {
      data: {
        clients: clientsRes.data || [],
        states: statesRes.data || [],
      },
      error: null,
    };
  } catch (error) {
    return { data: null, error: (error as Error).message };
  }
}
