"use server";

import { createClient } from "@/utils/server";
import { revalidatePath } from "next/cache";

export async function getServices<T = ServiceWithTiers>(
  selectQuery = "*, service_tiers(*)",
): Promise<{
  data: T[];
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("services")
      .select(selectQuery)
      .order("sequence");

    if (error) throw error;
    return { data: data as T[], error: null };
  } catch (error) {
    return { data: [], error: (error as Error).message };
  }
}

export async function getService(slug: string) {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("services")
      .select(
        "*, service_tiers(*), service_inclusions(*), service_client_obligations(*), service_disclaimers(*)",
      )
      .eq("slug", slug)
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error: (error as Error).message };
  }
}

/**
 * Just the client-facing text of a service — name, term and its three lists —
 * for editors that sit outside the service record and leave pricing alone.
 */
export async function getServiceText(slug: string) {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("services")
      .select(
        `id, slug, name, term,
         service_inclusions ( id, text, sequence ),
         service_client_obligations ( id, text, sequence ),
         service_disclaimers ( id, text, sequence ),
         service_tiers ( id, name, sequence )`,
      )
      .eq("slug", slug)
      .single();

    if (error) throw error;
    return {
      data: data as {
        id: string;
        slug: string;
        name: string;
        term: string | null;
        service_inclusions: ServiceInclusion[];
        service_client_obligations: ServiceObligation[];
        service_disclaimers: ServiceDisclaimer[];
        service_tiers: { id: string; name: string; sequence: number | null }[];
      },
      error: null,
    };
  } catch (error) {
    return { data: null, error: (error as Error).message };
  }
}

/**
 * Renames a service's pricing terms (e.g. "Annually"). Prices and lengths stay
 * on the tier form; only the wording the client reads changes here.
 */
export async function updateServiceTierNames(
  serviceId: string,
  tiers: { id: string; name: string }[],
) {
  try {
    const supabase = await createClient();
    for (const tier of tiers) {
      const { error } = await supabase
        .from("service_tiers")
        .update({ name: tier.name, updated_at: new Date().toISOString() })
        .eq("id", tier.id)
        .eq("service_id", serviceId);
      if (error) throw error;
    }
    return { error: null };
  } catch (error) {
    return { error: (error as Error).message };
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
    // null clears it; undefined leaves it as it is.
    term?: string | null;
    target_price_cents?: number;
    discount_pct?: number;
    discount_window_hours?: number;
    price_display_period?: string;
    requires_other_service?: boolean;
    sequence?: number;
  },
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
  inclusions: { text: string; sequence: number }[],
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
          })),
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
  obligations: { text: string; sequence: number }[],
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
          })),
        );

      if (insertError) throw insertError;
    }

    revalidatePath("/admin");
    return { data: true, error: null };
  } catch (error) {
    return { data: null, error: (error as Error).message };
  }
}

export async function updateServiceDisclaimers(
  serviceId: string,
  disclaimers: { text: string; sequence: number }[],
) {
  try {
    const supabase = await createClient();

    const { error: deleteError } = await supabase
      .from("service_disclaimers")
      .delete()
      .eq("service_id", serviceId);

    if (deleteError) throw deleteError;

    if (disclaimers.length > 0) {
      const { error: insertError } = await supabase
        .from("service_disclaimers")
        .insert(
          disclaimers.map((d) => ({
            service_id: serviceId,
            text: d.text,
            sequence: d.sequence,
          })),
        );

      if (insertError) throw insertError;
    }

    revalidatePath("/admin");
    return { data: true, error: null };
  } catch (error) {
    return { data: null, error: (error as Error).message };
  }
}
