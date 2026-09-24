"use server";

import { createClient } from "@/utils/server";
import { revalidatePath } from "next/cache";
import type { CopyOverrides } from "@/lib/portal-copy";

export type AgreementSettings = {
  termsAndConditions: string;
  postSignatureText: string;
  countersignatureImage: string | null;
  countersignatureName: string;
  countersignatureTitle: string;
  /**
   * The full T&Cs, where the clause list above is only the on-screen summary:
   * a link the agency hosts, a document they uploaded, or neither. Which one
   * the client is given is decided in `src/lib/terms.ts`.
   */
  termsUrl: string;
  termsDocumentUrl: string | null;
  termsDocumentName: string | null;
  /** Workspace-wide portal wording (the `global` copy kind). */
  portalCopy: CopyOverrides;
};

/** Used when the row is missing, so a contract never renders empty. */
const FALLBACK: AgreementSettings = {
  termsAndConditions: "",
  postSignatureText:
    "Thank you for signing. A copy of your contract has been generated.",
  countersignatureImage: null,
  countersignatureName: "",
  countersignatureTitle: "",
  termsUrl: "",
  termsDocumentUrl: null,
  termsDocumentName: null,
  portalCopy: {},
};

/**
 * The single settings row. Read by the portal (anonymously, for the terms a
 * client is agreeing to) and by the contract generator.
 */
export async function getAgreementSettings(): Promise<AgreementSettings> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("agreement_settings")
      .select(
        "terms_and_conditions, post_signature_text, countersignature_image, countersignature_name, countersignature_title, terms_url, terms_document_url, terms_document_name, portal_copy",
      )
      .eq("id", 1)
      .maybeSingle();

    if (error || !data) return FALLBACK;

    return {
      termsAndConditions: data.terms_and_conditions ?? "",
      postSignatureText:
        data.post_signature_text ?? FALLBACK.postSignatureText,
      countersignatureImage: data.countersignature_image ?? null,
      countersignatureName: data.countersignature_name ?? "",
      countersignatureTitle: data.countersignature_title ?? "",
      termsUrl: data.terms_url ?? "",
      termsDocumentUrl: data.terms_document_url ?? null,
      termsDocumentName: data.terms_document_name ?? null,
      portalCopy: (data.portal_copy as CopyOverrides | null) ?? {},
    };
  } catch {
    return FALLBACK;
  }
}

export async function updateAgreementSettings(patch: {
  terms_and_conditions?: string;
  post_signature_text?: string;
  countersignature_image?: string | null;
  countersignature_name?: string;
  countersignature_title?: string;
  terms_url?: string | null;
  terms_document_url?: string | null;
  terms_document_name?: string | null;
  portal_copy?: CopyOverrides;
}) {
  try {
    const supabase = await createClient();

    // upsert, so a wiped row repairs itself rather than silently dropping edits
    const { error } = await supabase
      .from("agreement_settings")
      .upsert(
        { id: 1, ...patch, updated_at: new Date().toISOString() },
        { onConflict: "id" },
      );

    if (error) throw error;

    revalidatePath("/admin/settings");
    return { error: null };
  } catch (error) {
    return { error: (error as Error).message };
  }
}

/**
 * Terms as discrete clauses.
 *
 * Authors write one clause per line; blank lines are ignored so they can
 * space things out while editing.
 */
export async function getTermsClauses(): Promise<string[]> {
  const { termsAndConditions } = await getAgreementSettings();
  return termsAndConditions
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}
