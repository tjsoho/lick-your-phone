"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
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
  signedOffAt,
  signedOffByName,
  existingNotes,
}: {
  proposalId: string;
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
          The team has been told and the notes are on the ClickUp task. If the
          client changes an answer, this opens again so the new version gets
          read too.
        </p>
      </div>
    );
  }

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
        The client has finished their form and has had their emails. Read the
        answers above, add anything the marketing team needs to know, then
        sign off. Nothing reaches ClickUp, Drive or Slack until you do.
      </p>

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

      <button
        type="button"
        onClick={handleSignOff}
        disabled={saving}
        title="Release the automations and tell the team"
        className={`group mt-3 inline-flex items-center gap-3 rounded-full bg-lyp-cherry py-1.5 pl-6 pr-1.5 font-body text-[13px] font-semibold tracking-wide text-lyp-white shadow-[0_10px_30px_-10px_rgba(178,38,38,0.5)] outline-none transition-all duration-500 ${EASE} hover:bg-[#c22e2e] focus-visible:ring-2 focus-visible:ring-lyp-cherry/40 active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none`}
      >
        Sign off
        <span
          className={`flex h-8 w-8 items-center justify-center rounded-full bg-lyp-white/15 transition-transform duration-500 ${EASE} group-hover:scale-105`}
        >
          {saving ? (
            <Loader2 strokeWidth={1.75} className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <CheckCircle2 strokeWidth={1.5} className="h-3.5 w-3.5" />
          )}
        </span>
      </button>
    </div>
  );
}
