"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { signOffProposal } from "@/server-actions/sign-off";

const EASE = "ease-brand";

/**
 * THE LAST HUMAN STEP BEFORE THE TEAM IS TOLD.
 *
 * "Once the client completes everything, sales gets a notification, adds
 * their notes and clicks a Sign off button, and only then do the automations
 * run."
 *
 * Two things happen on that click. The notes go into the Client Onboarding
 * task's description, which is where they were always meant to land and
 * never did. And the internal automations are released: the Drive upload,
 * the ClickUp statuses and the Slack post that announces a new client.
 *
 * The client's own emails went when they pressed Submit, so nothing here
 * keeps a client waiting.
 */
export default function SignOffPanel({
  proposalId,
  status,
  signedAt,
  signedOffAt,
  signedOffByName,
  existingNotes,
}: {
  proposalId: string;
  /**
   * Where the client has got to. Only used for the warning below now: the
   * button itself opens as soon as they have signed, so a contract signed
   * before the form is in can still be released to the team.
   */
  status: string;
  /**
   * When they signed. This is what opens the button, not the status, because
   * finishing the onboarding form overwrites `signed` with
   * `intake_complete` and the signature itself has to survive that.
   */
  signedAt: string | null;
  signedOffAt: string | null;
  /** Who released it, where the record knows. */
  signedOffByName: string | null;
  existingNotes: string | null;
}) {
  const router = useRouter();
  const [notes, setNotes] = useState(existingNotes ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSignOff() {
    setSaving(true);
    const res = await signOffProposal(proposalId, notes);
    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success("Signed off. The team has been told.");
      router.refresh();
    }
    setSaving(false);
  }

  if (signedOffAt) {
    return (
      <div className="rounded-2xl border border-[#CFE3D5] bg-[#F3F9F4] px-4 py-3.5">
        <div className="flex items-center gap-2.5">
          <CheckCircle2
            strokeWidth={1.75}
            className="h-4 w-4 flex-shrink-0 text-[#4A7A5C]"
          />
          <p className="font-body text-[13px] font-semibold text-[#2F5A3E]">
            Signed off{signedOffByName ? ` by ${signedOffByName}` : ""} on{" "}
            {new Date(signedOffAt).toLocaleDateString("en-AU", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>

        {existingNotes ? (
          <p className="mt-2.5 whitespace-pre-wrap font-body text-[12.5px] leading-relaxed text-[#3F6B4E]">
            {existingNotes}
          </p>
        ) : (
          <p className="mt-2.5 font-body text-[11px] leading-relaxed text-[#5A8468]">
            No notes were added.
          </p>
        )}

        <p className="mt-2.5 font-body text-[11px] leading-relaxed text-[#5A8468]">
          The team has been told and the notes are on the ClickUp task. The
          client cannot change their answers now, so anything else they tell
          you goes on the task by hand.
        </p>
      </div>
    );
  }

  // Nothing to sign off until there is a signed contract to sign off on.
  if (!signedAt) {
    return (
      <div className="rounded-2xl border border-[#EFE6E6] bg-[#FCFAFA] px-4 py-3.5">
        <div className="flex items-center gap-2.5">
          <Clock
            strokeWidth={1.75}
            className="h-4 w-4 flex-shrink-0 text-[#BFADAD]"
          />
          <p className="font-body text-[13px] font-semibold text-[#867474]">
            Waiting on the client
          </p>
        </div>
        <p className="mt-2 font-body text-[11px] leading-relaxed text-[#867474]">
          There is nothing to sign off until they have signed their agreement.
          This opens on its own when they do.
        </p>
      </div>
    );
  }

  /**
   * Signed, but the form is not in yet.
   *
   * The button is still offered, because a signed client is a real client
   * and the team sometimes needs releasing before the form comes back. It
   * says plainly that the answers will be missing, so nobody presses it
   * expecting a brief that is not there yet.
   */
  const formIsIn = status === "intake_complete";

  return (
    <div className="rounded-2xl border border-[#EFE6E6] bg-[#FCFAFA] px-4 py-3.5">
      <div className="flex items-center gap-2.5">
        <ShieldCheck
          strokeWidth={1.75}
          className="h-4 w-4 flex-shrink-0 text-lyp-cherry"
        />
        <p className="font-body text-[13px] font-semibold text-lyp-black">
          Waiting on you
        </p>
      </div>

      <p className="mt-2 font-body text-[11px] leading-relaxed text-[#867474]">
        {formIsIn
          ? "The client has signed and finished their form, and has had their emails. Read the answers above, add anything the marketing team needs to know, then sign off. Nothing reaches ClickUp, Drive or Slack until you do."
          : "The client has signed their agreement. Add anything the marketing team needs to know, then sign off. Nothing reaches ClickUp, Drive or Slack until you do."}
      </p>

      {!formIsIn ? (
        <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-[#F2E2C4] bg-[#FDF8EE] px-3.5 py-3">
          <AlertTriangle
            strokeWidth={1.75}
            className="mt-px h-3.5 w-3.5 flex-shrink-0 text-[#9A7B2E]"
          />
          <p className="font-body text-[11px] leading-relaxed text-[#8A6E2A]">
            Their onboarding form is not in yet. You can still sign off, but
            the team will get the brief without any answers attached.
          </p>
        </div>
      ) : null}

      <label htmlFor="sign-off-notes" className="sr-only">
        Notes for the marketing team
      </label>
      <textarea
        id="sign-off-notes"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={4}
        placeholder="Anything the marketing team should know before they start. This goes straight onto the ClickUp task."
        className={`mt-3 w-full resize-y rounded-xl border border-[#EFE6E6] bg-lyp-white px-3.5 py-3 font-body text-[13px] leading-relaxed text-lyp-black outline-none transition-all duration-500 ${EASE} placeholder:text-[#BFADAD] focus:border-lyp-cherry/35 focus-visible:ring-2 focus-visible:ring-lyp-cherry/25`}
      />

      {/* THE BUTTON THEY ASKED FOR: big, red, and unmistakably the one that
          sets everything off. "add a button in the client proposal big and
          red that says click to sign off." */}
      <button
        type="button"
        onClick={handleSignOff}
        disabled={saving}
        title="Release the automations and tell the team"
        className={`mt-3.5 flex w-full items-center justify-center gap-3 rounded-2xl bg-[#D32020] px-6 py-5 font-body text-[16px] font-bold uppercase tracking-[0.06em] text-lyp-white shadow-[0_14px_38px_-12px_rgba(211,32,32,0.65)] outline-none transition-all duration-500 ${EASE} hover:bg-[#B81A1A] focus-visible:ring-2 focus-visible:ring-[#D32020]/45 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-55 disabled:shadow-none`}
      >
        {saving ? (
          <Loader2 strokeWidth={2} className="h-5 w-5 animate-spin" />
        ) : (
          <CheckCircle2 strokeWidth={2} className="h-5 w-5" />
        )}
        {saving ? "Signing off" : "Click to sign off"}
      </button>

      <p className="mt-2.5 text-center font-body text-[10.5px] leading-relaxed text-[#867474]">
        This happens once and cannot be undone.
      </p>
    </div>
  );
}
