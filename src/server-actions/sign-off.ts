"use server";

import { createClient, createAdminClient } from "@/utils/server";
import { revalidatePath } from "next/cache";
import { onProposalSignedOff } from "@/lib/integrations";

/**
 * THE SALES CHECKPOINT BETWEEN A CLIENT FINISHING AND THE TEAM BEING TOLD.
 *
 * "Once the client completes everything, sales gets a notification, adds
 * their notes and clicks a Sign off button, and only then do the automations
 * run. This is also better for our notifications, as the team really needs
 * to be informed of the new client once everything has been submitted and no
 * follow up is pending."
 *
 * Before this, submitting the form fired the lot: Drive, ClickUp, Slack and
 * two emails in one go. Slack therefore announced a finished client while
 * the answers were still unread, and the sales notes, which had nowhere to
 * go, never reached the ClickUp task they were written for.
 *
 * The client's own two emails are not held back; they are sent on
 * submission. What waits here is everything the team sees.
 */
export async function signOffProposal(proposalId: string, notes: string) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: proposal, error } = await supabase
      .from("proposals")
      .select(
        `id, token, status, signed_at, signed_off_at, signer_email,
         client:clients!client_id ( name, email ),
         venue:venues!venue_id ( name, address )`,
      )
      .eq("id", proposalId)
      .single();

    if (error || !proposal) {
      return { error: error?.message ?? "Proposal not found." };
    }

    /**
     * SIGNED IS THE BAR, NOT THE FORM.
     *
     * "have a button for any clients that have signed but havent clicked
     * off so we can test this now."
     *
     * It used to insist on `intake_complete`, which meant a client who had
     * signed but not yet filled the form in could never be released, and
     * nothing already signed could be put through at all. The signature is
     * what makes them a client, so that is what opens this. Where the form
     * is still outstanding the panel says so before the button is pressed,
     * and the brief simply goes without answers attached.
     *
     * `signed_at` rather than the status, because finishing the form
     * overwrites `signed` with `intake_complete`.
     */
    if (!proposal.signed_at) {
      return {
        error:
          "This client has not signed their agreement yet, so there is nothing to sign off.",
      };
    }

    // Signing off twice would run the automations twice: a second Drive
    // upload, a second Slack post, a second set of ClickUp edits.
    if (proposal.signed_off_at) {
      return { error: "This one has already been signed off." };
    }

    const trimmed = notes.trim();

    // Service role: the same reason the signature writes do it. Who signed
    // off is recorded against their own user id either way.
    const admin = await createAdminClient();
    const { error: updateErr } = await admin
      .from("proposals")
      .update({
        signed_off_at: new Date().toISOString(),
        signed_off_by: user?.id ?? null,
        sign_off_notes: trimmed || null,
      })
      .eq("id", proposalId)
      // Two people pressing the button at the same moment: only the first
      // update matches, so the automations are only released once.
      .is("signed_off_at", null);

    if (updateErr) return { error: updateErr.message };

    const clientObj = proposal.client as unknown as {
      name: string;
      email: string | null;
    } | null;
    const venueObj = proposal.venue as unknown as {
      name: string;
      address: string;
    } | null;

    // The files the client uploaded, and their signed contract, both of
    // which the internal automation hands on to Drive and ClickUp. Read the
    // same way the submission reads them, so sign-off cannot pass on a
    // different set of files from the one the client sent.
    const [assets, { data: contractDoc }] = await Promise.all([
      collectAssets(admin, proposalId),
      admin
        .from("documents")
        .select("file_url")
        .eq("proposal_id", proposalId)
        .eq("type", "contract")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    await onProposalSignedOff({
      proposalId,
      proposalToken: proposal.token,
      clientName: clientObj?.name ?? "Client",
      clientEmail: proposal.signer_email ?? clientObj?.email ?? "",
      venueName: venueObj?.name ?? "Venue",
      venueAddress: venueObj?.address ?? "",
      assets,
      agreementFileUrl: contractDoc?.file_url ?? null,
      notes: trimmed,
    });

    revalidatePath("/admin");
    revalidatePath(`/admin/proposals/${proposalId}`);
    return { error: null };
  } catch (err) {
    return { error: (err as Error).message };
  }
}

/**
 * Every file the client attached anywhere in the form, as plain URLs.
 *
 * File answers are stored as a list of uploads, so the url is lifted out of
 * each. Anything else in the form is text and has nothing to hand on.
 */
async function collectAssets(
  admin: Awaited<ReturnType<typeof createAdminClient>>,
  proposalId: string,
): Promise<string[]> {
  const { data: fileQuestions } = await admin
    .from("intake_questions")
    .select("id")
    .eq("field_type", "file");

  if (!fileQuestions || fileQuestions.length === 0) return [];

  const { data: rows } = await admin
    .from("intake_responses")
    .select("value")
    .eq("proposal_id", proposalId)
    .in(
      "question_id",
      fileQuestions.map((q) => q.id),
    );

  return (rows ?? []).flatMap((row) => {
    const value = row.value;
    if (!Array.isArray(value)) return [];
    return value
      .filter((f: { url?: string }) => !!f?.url)
      .map((f: { url: string }) => f.url);
  });
}
