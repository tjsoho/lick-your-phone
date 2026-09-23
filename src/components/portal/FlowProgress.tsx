"use client";

import { Check } from "lucide-react";
import { useCopy, useProposal } from "./ProposalContext";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------
   THE CLOSING TRACKER

   "Page 21 of 24" is an honest answer while the client is reading the deck
   and a useless one once they reach the checkout: what they want to know
   there is how many things are left to DO, not how many slides remain. So on
   the closing stretch the counter gives its slot to three named stages.

   The state is read from the proposal, never from which slide is on screen.
   A client can wander back to the summary after signing, and the tracker has
   to keep saying "signed" when they do — it reports the deal, not the deck.
   ------------------------------------------------------------------------- */

type StageKey = "signed" | "payment" | "onboarding";
type StageState = "done" | "current" | "ahead";

/** In order, with the wording slot for each label and its phone-sized twin. */
const STAGES: { key: StageKey; copyKey: string; shortCopyKey: string }[] = [
  { key: "signed", copyKey: "flowStageSigned", shortCopyKey: "flowStageSignedShort" },
  { key: "payment", copyKey: "flowStagePayment", shortCopyKey: "flowStagePaymentShort" },
  {
    key: "onboarding",
    copyKey: "flowStageOnboarding",
    shortCopyKey: "flowStageOnboardingShort",
  },
];

/**
 * The marker: a tick once the stage has landed, a ringed dot on the one being
 * worked, a hairline circle on the ones still ahead.
 *
 * Re-keyed on its state by the caller so the tick arrives with a pop rather
 * than appearing between two renders. `portal-reveal` is neutralised wholesale
 * under `prefers-reduced-motion`, so there is nothing extra to guard here.
 */
function StageMarker({ state }: { state: StageState }) {
  if (state === "done") {
    return (
      <span
        aria-hidden
        className="portal-reveal portal-reveal-pop flex h-3 w-3 flex-shrink-0 items-center justify-center rounded-full bg-lyp-cherry sm:h-4 sm:w-4"
        style={{ animationDelay: "0ms" }}
      >
        <Check
          strokeWidth={3.5}
          className="h-2 w-2 text-lyp-white sm:h-2.5 sm:w-2.5"
        />
      </span>
    );
  }

  if (state === "current") {
    return (
      <span
        aria-hidden
        className="flex h-3 w-3 flex-shrink-0 items-center justify-center rounded-full border border-lyp-cherry sm:h-4 sm:w-4"
      >
        <span className="h-1 w-1 rounded-full bg-lyp-cherry sm:h-1.5 sm:w-1.5" />
      </span>
    );
  }

  return (
    <span
      aria-hidden
      className="h-3 w-3 flex-shrink-0 rounded-full border border-lyp-white/25 sm:h-4 sm:w-4"
    />
  );
}

/**
 * Three stages in place of the page counter. No props: everything it shows is
 * already in the proposal, so there is no way for a caller to tell it a
 * different story than the one the record holds.
 */
export default function FlowProgress() {
  const { proposal, paymentCaptured, selections, serviceMap } = useProposal();
  const t = useCopy("global");

  // `signedAt` is the belt to the status's braces — a proposal that carries a
  // signature timestamp has been signed whatever else has happened since.
  const onboarded = proposal.status === "intake_complete";
  const signed = proposal.status === "signed" || onboarded || !!proposal.signedAt;
  // A proposal made entirely of complimentary services never asks for a card,
  // so that stage is satisfied by the signature — leaving it open would stall
  // the row on something the client can never do.
  const nothingPayable =
    selections.length === 0 ||
    selections.every((sel) => serviceMap[sel.serviceId]?.billing === "in_kind");
  // Onboarding is gated behind the card, so a proposal that has come back
  // from the intake form has paid, whether or not the payment row says so.
  const paid = paymentCaptured || onboarded || (signed && nothingPayable);

  const done: Record<StageKey, boolean> = {
    signed,
    payment: paid,
    onboarding: onboarded,
  };

  // The current stage is the first one still outstanding. When they are all
  // behind, nothing is current and the row is simply three ticks.
  const currentIndex = STAGES.findIndex((s) => !done[s.key]);

  return (
    <ol
      aria-label={t("flowProgressLabel")}
      // The bar is fixed and never remounts, so this entry runs the once, when
      // the client first reaches the closing slides.
      //
      // `min-w-0` + `overflow-hidden` is the safety valve, not the plan: the
      // phone sizes below are picked to fit inside a 375px bar beside Back and
      // Next, and this only means a label the agency lengthens later clips its
      // tail rather than shoving the bar out of shape.
      className="portal-reveal portal-reveal-fade flex min-w-0 items-center gap-1 overflow-hidden sm:gap-2.5"
      style={{ animationDelay: "0ms", animationDuration: "420ms" }}
    >
      {STAGES.map((stage, i) => {
        const state: StageState = done[stage.key]
          ? "done"
          : i === currentIndex
            ? "current"
            : "ahead";

        return (
          <li
            key={stage.key}
            aria-current={state === "current" ? "step" : undefined}
            className="flex min-w-0 items-center gap-1 sm:gap-2.5"
          >
            {/* The rule between two stages, lit once the earlier one lands.
                Gone on a phone, where the 24px it costs is the difference
                between three readable labels and three truncated ones. */}
            {i > 0 && (
              <span
                aria-hidden
                className={cn(
                  "hidden h-px w-6 transition-colors duration-500 ease-brand motion-reduce:transition-none sm:block",
                  done[STAGES[i - 1]!.key] ? "bg-lyp-cherry" : "bg-lyp-white/15",
                )}
              />
            )}

            <StageMarker key={state} state={state} />

            {/* Fira Sans rather than the body face: narrower at this size, and
                the same voice the rest of the portal's labels use. */}
            <span
              className={cn(
                "whitespace-nowrap font-heading text-[10px] leading-none transition-colors duration-500 ease-brand motion-reduce:transition-none sm:text-xs",
                state === "current"
                  ? "text-lyp-white"
                  : state === "done"
                    ? "text-lyp-white/65"
                    : "text-lyp-white/45",
              )}
            >
              {/* Two spellings of the same label, so a phone shortens rather
                  than wraps. Both are the agency's to rename. */}
              <span className="sm:hidden">{t(stage.shortCopyKey)}</span>
              <span className="hidden sm:inline">{t(stage.copyKey)}</span>
              {state === "done" && (
                <span className="sr-only"> {t("flowStageDone")}</span>
              )}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
