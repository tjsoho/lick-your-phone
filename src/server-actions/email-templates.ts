"use server";

import { createAdminClient, createClient } from "@/utils/server";
import { revalidatePath } from "next/cache";
import { renderTemplate, sanitiseEmailHtml } from "@/lib/email-template";

export interface EmailTemplate {
  id: string;
  key: string;
  title: string;
  description: string | null;
  audience: "client" | "internal";
  subject: string;
  bodyHtml: string;
  sequence: number;
  placeholders: string[];
  enabled: boolean;
  updatedAt: string;
}

async function requireUser() {
  const session = await createClient();
  const {
    data: { user },
  } = await session.auth.getUser();
  return user;
}

export async function listEmailTemplates(): Promise<{
  data: EmailTemplate[];
  error: string | null;
}> {
  try {
    if (!(await requireUser())) return { data: [], error: "Not signed in." };

    const admin = await createAdminClient();
    const { data, error } = await admin
      .from("email_templates")
      .select(
        "id, key, title, description, audience, subject, body_html, sequence, placeholders, enabled, updated_at",
      )
      .order("sequence", { ascending: true });

    if (error) throw new Error(error.message);

    return {
      data: (data ?? []).map((r) => ({
        id: r.id,
        key: r.key,
        title: r.title,
        description: r.description,
        audience: r.audience as "client" | "internal",
        subject: r.subject,
        bodyHtml: r.body_html,
        sequence: r.sequence,
        placeholders: Array.isArray(r.placeholders)
          ? (r.placeholders as string[])
          : [],
        enabled: r.enabled,
        updatedAt: r.updated_at,
      })),
      error: null,
    };
  } catch (err) {
    return { data: [], error: (err as Error).message };
  }
}

/**
 * Save a change to one email.
 *
 * The HTML is cleaned on the way in as well as on the way out. Cleaning it
 * only at send time would mean the editor shows one thing and the client
 * reads another, and the first anybody would know of it is a client asking
 * why half the email is missing.
 */
export async function saveEmailTemplate(input: {
  key: string;
  subject: string;
  bodyHtml: string;
}): Promise<{ error: string | null }> {
  try {
    const user = await requireUser();
    if (!user) return { error: "Not signed in." };

    const subject = input.subject.trim();
    if (!subject) return { error: "An email needs a subject line." };

    const bodyHtml = sanitiseEmailHtml(input.bodyHtml);
    if (!bodyHtml.replace(/<[^>]*>/g, "").trim()) {
      return { error: "There is nothing in the body of this email." };
    }

    const admin = await createAdminClient();
    const { error } = await admin
      .from("email_templates")
      .update({
        subject,
        body_html: bodyHtml,
        updated_at: new Date().toISOString(),
        updated_by: user.id,
      })
      .eq("key", input.key);

    if (error) throw new Error(error.message);

    revalidatePath("/admin/email-templates");
    return { error: null };
  } catch (err) {
    return { error: (err as Error).message };
  }
}

/**
 * What this email looks like with somebody's details in it.
 *
 * Rendered on the server with the same code the Make-facing route uses, so
 * the preview cannot drift away from the real thing. Placeholders the
 * template does not use are simply ignored.
 */
export async function previewEmailTemplate(input: {
  subject: string;
  bodyHtml: string;
}): Promise<{ subject: string; html: string }> {
  const sample: Record<string, string> = {
    first_name: "Martin",
    last_name: "Lynch",
    client_email: "marty@thebuena.com.au",
    business_name: "The Buena",
    venue_address: "76 Mowbray Road, Chatswood NSW",
    portal_url: "https://lick-your-phone.vercel.app/portal/example",
    intake_url: "https://lick-your-phone.vercel.app/intake/example",
    contract_url: "https://lick-your-phone.vercel.app/api/contract/example",
    sign_off_url: "https://lick-your-phone.vercel.app/admin/proposals/example",
    signed_at: new Date().toLocaleDateString("en-AU", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
    total: "25,327.22",
    currency: "AUD",
  };

  return {
    subject: renderTemplate(input.subject, sample).replace(/<[^>]*>/g, ""),
    html: sanitiseEmailHtml(renderTemplate(input.bodyHtml, sample)),
  };
}
