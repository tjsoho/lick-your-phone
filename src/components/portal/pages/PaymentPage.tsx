"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import toast from "react-hot-toast";
import { useReducedMotion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useCopy, useProposal } from "../ProposalContext";
import { captureBankDetails } from "@/server-actions/payment";
import Link from "next/link";
import Reveal, { revealDelay } from "../Reveal";

/**
 * CONFIRMATION GREEN.
 *
 * Cherry read as an error on this screen — a red tick after a successful
 * payment is exactly the wrong signal. This is a lifted sage: the same hue
 * family as the project's `#4A7A5C`, raised until it clears 4.5:1 against what
 * is actually rendered behind it, which is the tint disc composited over the
 * portal's red smoke rather than the raw page colour. Measured on the live
 * page at 6.4:1 against the disc and 8.5:1 against the bare ground.
 *
 * Written out in full rather than built from a template: Tailwind scans source
 * text, so an interpolated `${GREEN}/20` never compiles to any CSS.
 */
const CONFIRM_GREEN = "text-[#86D6A5]";
const CONFIRM_GREEN_TINT = "bg-[#86D6A5]/[0.18]";

/**
 * THE BEAT BETWEEN PAYMENT AND ONBOARDING.
 *
 * Long enough to read "Payment Details Saved" and believe it, short enough
 * that nobody uses the pause to wonder whether they should have. The client
 * is carried to onboarding rather than asked to choose it.
 *
 * `prefers-reduced-motion` skips the wait entirely: someone who has asked for
 * less movement is not helped by a screen that changes under them on a timer
 * they cannot see, so they get the destination immediately instead.
 */
const HANDOFF_MS = 2000;

/**
 * Proposals whose card was captured in THIS tab.
 *
 * The server's `paymentCaptured` is decided when the portal is served, so it
 * cannot know about a capture that happened thirty seconds ago beside it. The
 * carousel mounts one slide at a time, so arriving back on payment builds a
 * brand-new component with `stage` back at "form" — and a client looking at a
 * card form they have already completed will complete it again.
 *
 * Module scope rather than state, because it has to outlive the component; a
 * plain Set rather than storage, because it should die with the tab, after
 * which the server's flag is authoritative again.
 */
const capturedThisSession = new Set<string>();

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

/* The card path lived here: a Pinch capture type, the brand and expiry
   formatters, and a loader for their capture.js. All of it has gone with the
   card form. No payment is taken in the portal any more, so nothing needs
   tokenising; the account is held for accounting to debit later. The server
   action beside the new one still does the Pinch work for any proposal that
   captured a card before this change.

   Restoring the card form means bringing that block back from history; it is
   a clean revert of this commit rather than a rewrite. */

/* ------------------------------------------------------------------ */
/*  The hand-off to onboarding                                        */
/* ------------------------------------------------------------------ */

/**
 * WHERE ONBOARDING IS, AND HOW TO GET THERE.
 *
 * Two possible destinations, and the deck decides which is right:
 *
 * - If this proposal's deck carries the onboarding slide, the client stays
 *   inside the presentation — same frame, same progress, no page load — so
 *   the carousel simply moves to it.
 * - Most decks keep that page hidden (its wording is still loaded by slug,
 *   which is why `pageCopy` exists), and then onboarding is its own route.
 *   `/intake/<token>` is the fallback.
 *
 * Two ways to travel, deliberately different:
 *
 * - `go` is the manual path — a click. It always navigates, however many
 *   times it is asked, so a client who taps the button after an automatic
 *   jump was missed or blocked still gets there.
 * - `goAuto` is the timer's path. It fires at most once, and never after the
 *   client has already taken the manual one.
 */
function useOnboardingHandoff(proposalToken: string) {
  const { proposal } = useProposal();
  const router = useRouter();

  // Always the route, never a slide. A deck can carry a page whose slug is
  // `intake` — the standard deck does, as a title card — but `PageRenderer`
  // has no branch for it, so sending the client there lands them on an empty
  // slide instead of the form. The form is only ever served by its own route.
  const href = `/intake/${proposalToken}`;

  /** Set the moment any path is taken, so the other one stands down. */
  const takenRef = useRef(false);

  const navigate = useCallback(() => {
    router.push(href);
  }, [href, router]);

  /** The manual path: always travels. */
  const go = useCallback(() => {
    takenRef.current = true;
    navigate();
  }, [navigate]);

  /** A manual `<Link>` navigates by itself; this only disarms the timer. */
  const markTaken = useCallback(() => {
    takenRef.current = true;
  }, []);

  /** The automatic path: once, and only if nothing else got there first. */
  const goAuto = useCallback(() => {
    if (takenRef.current) return;
    takenRef.current = true;
    navigate();
  }, [navigate]);

  return {
    href,
    go,
    goAuto,
    markTaken,
    /** The onboarding form is already in — there is nothing to hurry towards. */
    alreadyDone: proposal.status === "intake_complete",
  };
}

type Handoff = ReturnType<typeof useOnboardingHandoff>;

/**
 * The way forward, always on screen: a real `<a>`, so it can be opened in a
 * new tab and read by anything that looks for links.
 */
function OnboardingButton({
  handoff,
  label,
  index,
}: {
  handoff: Handoff;
  label: string;
  index: number;
}) {
  const className =
    "portal-reveal block mt-6 w-fit rounded-lg bg-lyp-cherry px-6 py-4 font-heading text-lg text-lyp-white transition-[background-color,transform] duration-300 ease-brand hover:bg-lyp-deep-red active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed motion-reduce:transition-none motion-reduce:active:scale-100";
  const style = { animationDelay: `${revealDelay(index)}ms` };

  return (
    <Link
      href={handoff.href}
      onClick={handoff.markTaken}
      style={style}
      className={className}
    >
      {label}
    </Link>
  );
}

/** The green tick, shared by both confirmation screens. */
function ConfirmTick() {
  return (
    <Reveal
      variant="pop"
      index={0}
      className={`mb-6 flex h-20 w-20 items-center justify-center rounded-full ${CONFIRM_GREEN_TINT}`}
    >
      <svg
        className={`h-10 w-10 ${CONFIRM_GREEN}`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    </Reveal>
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

type Stage = "form" | "processing" | "success" | "error";

export default function PaymentPage() {
  const { proposal, selections, serviceMap, paymentCaptured } = useProposal();

  // The card is already in — from an earlier visit, or from a capture that
  // happened in this tab a moment ago. Either way this slide has no job left
  // but to say so and point at what's next; it must never offer the form
  // again, which is an invitation to pay twice.
  if (paymentCaptured || capturedThisSession.has(proposal.id)) {
    return <AlreadyCaptured proposalToken={proposal.token} />;
  }

  // Check if all selected services are in_kind (no payment needed)
  const allInKind =
    selections.length > 0 &&
    selections.every((sel) => {
      const svc = serviceMap[sel.serviceId];
      return svc?.billing === "in_kind";
    });

  if (allInKind || selections.length === 0) {
    return <NoPaymentRequired proposalToken={proposal.token} />;
  }

  return (
    <PaymentForm proposalId={proposal.id} proposalToken={proposal.token} />
  );
}

/* ------------------------------------------------------------------ */
/*  Coming back to a slide that is already done                       */
/* ------------------------------------------------------------------ */

/**
 * Short, calm, and facing forward.
 *
 * No timer here, unlike the screen that follows a fresh capture: a client who
 * has deliberately come back to this slide should not be swept off it again
 * the instant they arrive. The button is the only way on, and it is theirs to
 * press.
 */
function AlreadyCaptured({ proposalToken }: { proposalToken: string }) {
  const t = useCopy("payment");
  const handoff = useOnboardingHandoff(proposalToken);

  return (
    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
      <ConfirmTick />
      <h1
        className="portal-reveal font-heading text-3xl md:text-5xl text-lyp-white mb-4"
        style={{ animationDelay: `${revealDelay(1)}ms` }}
      >
        {t("capturedTitle")}
      </h1>
      <p
        className="portal-reveal font-body text-sm text-lyp-white/60 max-w-md"
        style={{ animationDelay: `${revealDelay(2)}ms` }}
      >
        {t("capturedBody")}
      </p>

      <OnboardingButton handoff={handoff} label={t("onboardingButton")} index={3} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  No payment required                                               */
/* ------------------------------------------------------------------ */

/**
 * Nothing to pay for — every service on the proposal is complimentary.
 *
 * It still carries the hand-off: this screen used to be the end of the road,
 * which left a complimentary client signed, welcomed and with no way to reach
 * the onboarding form.
 */
function NoPaymentRequired({ proposalToken }: { proposalToken: string }) {
  const t = useCopy("payment");
  const handoff = useOnboardingHandoff(proposalToken);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (handoff.alreadyDone) return;
    const timer = setTimeout(handoff.goAuto, reduceMotion ? 0 : HANDOFF_MS);
    return () => clearTimeout(timer);
  }, [handoff, reduceMotion]);

  return (
    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
      <Reveal
        variant="pop"
        index={0}
        className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-lyp-cherry/20"
      >
        <svg
          className="h-10 w-10 text-lyp-cherry"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5 13l4 4L19 7"
          />
        </svg>
      </Reveal>
      <h1
        className="portal-reveal font-heading text-3xl md:text-5xl text-lyp-white mb-4"
        style={{ animationDelay: `${revealDelay(1)}ms` }}
      >
        {t("noPaymentTitle")}
      </h1>
      <p
        className="portal-reveal font-body text-sm text-lyp-white/60 max-w-md"
        style={{ animationDelay: `${revealDelay(2)}ms` }}
      >
        {t("noPaymentBody")}
      </p>

      {!handoff.alreadyDone && (
        <OnboardingButton handoff={handoff} label={t("onboardingButton")} index={3} />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Payment form                                                      */
/* ------------------------------------------------------------------ */

function PaymentForm({
  proposalId,
  proposalToken,
}: {
  proposalId: string;
  proposalToken: string;
}) {
  const t = useCopy("payment");
  const [stage, setStage] = useState<Stage>("form");
  const [errorMsg, setErrorMsg] = useState("");
  const handoff = useOnboardingHandoff(proposalToken);
  const { goAuto, alreadyDone } = handoff;
  const reduceMotion = useReducedMotion();

  /**
   * The confirmation toast fires ONCE, on the transition into success.
   *
   * Two guards, because one is not enough: the ref survives StrictMode's
   * mount/unmount/mount in dev (the effect body runs twice on the same
   * instance, the ref does not reset), and the fixed toast `id` makes
   * react-hot-toast idempotent even if this component is remounted entirely —
   * e.g. by paging away and back to an already-successful screen.
   *
   * `position` is passed per-toast. The global <Toaster /> stays top-right,
   * which the admin depends on.
   */
  const announcedRef = useRef(false);
  useEffect(() => {
    if (stage !== "success" || announcedRef.current) return;
    announcedRef.current = true;
    toast.success(t("acceptedToast"), {
      id: "payment-accepted",
      position: "bottom-right",
    });
  }, [stage, t]);

  /**
   * SUCCESS CARRIES ON BY ITSELF.
   *
   * The confirmation is a beat, not a stop: it is read, and then the client
   * is taken to onboarding without being asked to decide anything. The button
   * below stays where it is for anyone whose beat is interrupted.
   *
   * Four things this must not do, in the order they can go wrong:
   *
   * - fire twice — `goAuto` is once-only and stands down the moment the
   *   button beneath it is used;
   * - fire after the component has gone — the cleanup clears the timer, so a
   *   client who pages away during the beat is not yanked back;
   * - fire when the onboarding form is already in (`intake_complete`), where
   *   there is nothing left to hurry towards;
   * - fire before the card is actually saved — only the success stage arms it.
   *
   * `reduceMotion` is a dependency rather than a value read once: framer
   * resolves it just after mount, and an armed 2s timer is re-armed at 0 when
   * it turns out the client asked for less movement.
   */
  useEffect(() => {
    if (stage !== "success") return;
    if (alreadyDone) return;

    const id = setTimeout(goAuto, reduceMotion ? 0 : HANDOFF_MS);
    return () => clearTimeout(id);
  }, [stage, alreadyDone, reduceMotion, goAuto]);

  // Form state. An account rather than a card: no payment is taken here, the
  // details are held for accounting to debit later.
  const [accountName, setAccountName] = useState("");
  const [bsb, setBsb] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [authorised, setAuthorised] = useState(false);

  /** 083-004, which is how a BSB is written on every form in the country. */
  const handleBsbChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const digits = e.target.value.replace(/\D/g, "").slice(0, 6);
      setBsb(digits.length > 3 ? `${digits.slice(0, 3)}-${digits.slice(3)}` : digits);
    },
    [],
  );

  const handleAccountNumberChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setAccountNumber(e.target.value.replace(/\D/g, "").slice(0, 10));
    },
    [],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const bsbDigits = bsb.replace(/\D/g, "");
    if (!accountName.trim()) {
      setErrorMsg("Please enter the name on the account");
      return;
    }
    if (bsbDigits.length !== 6) {
      setErrorMsg("A BSB is six digits, e.g. 083-004");
      return;
    }
    if (accountNumber.length < 6) {
      setErrorMsg("Please enter the full account number");
      return;
    }
    if (!authorised) {
      setErrorMsg("Please confirm you authorise the direct debit");
      return;
    }

    setStage("processing");
    setErrorMsg("");

    try {
      // Straight to the server, which encrypts before it stores. There is no
      // provider in the middle: nothing is being charged, the account is
      // being put on file.
      const result = await captureBankDetails(proposalId, {
        accountName: accountName.trim(),
        bsb: bsbDigits,
        accountNumber,
      });

      if (result.error) throw new Error(result.error);

      // Remembered beyond this component: from here on, every arrival on
      // this slide is a confirmation, never the form again.
      capturedThisSession.add(proposalId);
      setStage("success");
    } catch (err) {
      setErrorMsg((err as Error).message);
      setStage("error");
    }
  };

  /* ---- Success state ---- */
  if (stage === "success") {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6 text-center">
        <ConfirmTick />
        <h1
          className="portal-reveal font-heading text-3xl md:text-5xl text-lyp-white mb-4"
          style={{ animationDelay: `${revealDelay(1)}ms` }}
        >
          {t("savedTitle")}
        </h1>
        <p
          className="portal-reveal font-body text-sm text-lyp-white/60 max-w-md"
          style={{ animationDelay: `${revealDelay(2)}ms` }}
        >
          {t("savedBody")}
        </p>

        {/* Said out loud, because a screen that moves on its own without
            warning reads as a glitch. Withheld when the hand-off is not
            armed, rather than promising a journey nobody is taking. */}
        {!alreadyDone && (
          <p
            className="portal-reveal portal-reveal-fade font-body text-xs text-lyp-white/40 mt-3"
            style={{ animationDelay: `${revealDelay(3)}ms` }}
          >
            {t("handoffNote")}
          </p>
        )}

        <OnboardingButton
          handoff={handoff}
          label={t("onboardingButton")}
          index={4}
        />
      </div>
    );
  }

  /* ---- Form / Error / Processing ---- */
  return (
    <div className="flex h-full flex-col items-center justify-center px-6">
      <Reveal
        as="h1"
        index={0}
        className="font-heading text-3xl md:text-5xl text-lyp-white mb-2 text-center"
      >
        {t("heading")}
      </Reveal>
      <Reveal
        as="p"
        index={1}
        className="font-body text-sm text-lyp-white/50 mb-8 text-center max-w-md"
      >
        {t("intro")}
      </Reveal>

      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md space-y-5"
        autoComplete="off"
      >
        {/* Account name */}
        <Reveal index={2}>
          <label
            htmlFor="bank-account-name"
            className="font-body text-xs text-lyp-white/50 uppercase tracking-wider mb-1.5 block"
          >
            {t("accountNameLabel")}
          </label>
          <input
            id="bank-account-name"
            type="text"
            value={accountName}
            onChange={(e) => setAccountName(e.target.value)}
            placeholder="Name on the account"
            className="w-full rounded-lg border border-lyp-white/10 bg-lyp-white/5 px-4 py-3.5 font-body text-sm text-lyp-white placeholder:text-lyp-white/30 focus:border-lyp-cherry focus:outline-none focus:ring-1 focus:ring-lyp-cherry transition-colors"
            disabled={stage === "processing"}
            autoComplete="off"
          />
        </Reveal>

        {/* BSB and account number */}
        <Reveal index={3} className="grid grid-cols-[7rem_minmax(0,1fr)] gap-4">
          <div>
            <label
              htmlFor="bank-bsb"
              className="font-body text-xs text-lyp-white/50 uppercase tracking-wider mb-1.5 block"
            >
              {t("bsbLabel")}
            </label>
            <input
              id="bank-bsb"
              type="text"
              inputMode="numeric"
              value={bsb}
              onChange={handleBsbChange}
              placeholder="083-004"
              className="w-full rounded-lg border border-lyp-white/10 bg-lyp-white/5 px-4 py-3.5 font-body text-sm tabular-nums text-lyp-white placeholder:text-lyp-white/30 focus:border-lyp-cherry focus:outline-none focus:ring-1 focus:ring-lyp-cherry transition-colors"
              disabled={stage === "processing"}
              autoComplete="off"
            />
          </div>
          <div>
            <label
              htmlFor="bank-account-number"
              className="font-body text-xs text-lyp-white/50 uppercase tracking-wider mb-1.5 block"
            >
              {t("accountNumberLabel")}
            </label>
            <input
              id="bank-account-number"
              type="text"
              inputMode="numeric"
              value={accountNumber}
              onChange={handleAccountNumberChange}
              placeholder="12345678"
              className="w-full rounded-lg border border-lyp-white/10 bg-lyp-white/5 px-4 py-3.5 font-body text-sm tabular-nums text-lyp-white placeholder:text-lyp-white/30 focus:border-lyp-cherry focus:outline-none focus:ring-1 focus:ring-lyp-cherry transition-colors"
              disabled={stage === "processing"}
              autoComplete="off"
            />
          </div>
        </Reveal>

        {/* THE AUTHORITY.
            A direct debit needs the account holder's agreement, so it is
            asked for here rather than assumed, and the moment they give it is
            stored beside the account. */}
        <Reveal index={4}>
          <label
            htmlFor="bank-authority"
            className="flex cursor-pointer items-start gap-3 rounded-lg border border-lyp-white/10 bg-lyp-white/5 px-4 py-3.5"
          >
            <input
              id="bank-authority"
              type="checkbox"
              checked={authorised}
              onChange={(e) => setAuthorised(e.target.checked)}
              disabled={stage === "processing"}
              className="mt-0.5 h-4 w-4 flex-shrink-0 accent-lyp-cherry"
            />
            <span className="font-body text-[12.5px] leading-relaxed text-lyp-white/70">
              {t("authorityText")}
            </span>
          </label>
        </Reveal>

        {/* Error message */}
        {errorMsg && (
          <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3">
            <p className="font-body text-sm text-red-400">{errorMsg}</p>
          </div>
        )}

        {/* Submit button */}
        <button
          type="submit"
          disabled={stage === "processing"}
          style={{ animationDelay: `${revealDelay(5)}ms` }}
          className="portal-reveal w-full rounded-lg bg-lyp-cherry px-6 py-4 font-heading text-lg text-lyp-white transition-[background-color,transform] duration-300 ease-brand hover:bg-lyp-deep-red active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed motion-reduce:transition-none motion-reduce:active:scale-100"
        >
          {stage === "processing" ? (
            <span className="flex items-center justify-center gap-3">
              <svg
                className="h-5 w-5 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              {t("savingButton")}
            </span>
          ) : stage === "error" ? (
            t("tryAgainButton")
          ) : (
            t("saveButton")
          )}
        </button>

        {/* Security note */}
        <p
          className="portal-reveal portal-reveal-fade font-body text-xs text-lyp-white/30 text-center leading-relaxed"
          style={{ animationDelay: `${revealDelay(6)}ms` }}
        >
          {t("securityNote")}
        </p>
      </form>
    </div>
  );
}
