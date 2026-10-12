"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import toast from "react-hot-toast";
import { useReducedMotion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useCopy, useProposal } from "../ProposalContext";
import {
  captureBankDetails,
  capturePaymentDetails,
} from "@/server-actions/payment";
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

interface PinchCapture {
  createToken: (opts: {
    sourceType: string;
    cardNumber: string;
    expiryMonth: string;
    expiryYear: string;
    cvc: string;
    cardholderName: string;
  }) => Promise<{ token: string }>;
}

declare global {
  interface Window {
    Pinch?: {
      Capture: new (params: { publishableKey: string }) => PinchCapture;
    };
  }
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function detectCardBrand(number: string): string {
  const cleaned = number.replace(/\s/g, "");
  if (/^4/.test(cleaned)) return "visa";
  if (/^5[1-5]/.test(cleaned) || /^2[2-7]/.test(cleaned)) return "mastercard";
  if (/^3[47]/.test(cleaned)) return "amex";
  if (/^36/.test(cleaned)) return "diners";
  return "unknown";
}

function formatCardNumber(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 16);
  return digits.replace(/(.{4})/g, "$1 ").trim();
}

function formatExpiry(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  if (digits.length >= 3) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return digits;
}

/** Load Pinch capture.js dynamically – only when the user submits */
function loadPinchScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.Pinch) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://cdn.getpinch.com.au/capturejs/pinch.capture.v2.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error("Failed to load Pinch capture script"));
    document.head.appendChild(script);
  });
}

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

  /**
   * WHICH DETAILS THEY ARE LEAVING.
   *
   * Rita asked for bank details in place of a card, and most clients will
   * use them: "collect BSB and account number instead of credit card
   * details." But some will only ever pay by card, so both are offered and
   * the bank account leads.
   *
   * Either way nothing is charged here. A card is vaulted at Pinch, so the
   * number never reaches us and accounting charges the token later. A bank
   * account is encrypted and held, because there is no vault for one.
   */
  const [method, setMethod] = useState<"bank" | "card">("bank");

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

  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [cardholderName, setCardholderName] = useState("");

  // The raw digits, kept off the rendered value so the display can be spaced.
  const rawCardRef = useRef("");
  const rawExpiryRef = useRef("");

  const handleCardNumberChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      rawCardRef.current = e.target.value.replace(/\D/g, "").slice(0, 16);
      setCardNumber(formatCardNumber(e.target.value));
    },
    [],
  );

  const handleExpiryChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      rawExpiryRef.current = e.target.value.replace(/\D/g, "").slice(0, 4);
      setExpiry(formatExpiry(e.target.value));
    },
    [],
  );

  const handleCvcChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setCvc(e.target.value.replace(/\D/g, "").slice(0, 4));
    },
    [],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!authorised) {
      setErrorMsg("Please confirm you authorise the payments");
      return;
    }

    if (method === "bank") {
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

      setStage("processing");
      setErrorMsg("");
      try {
        // Straight to our own server, which encrypts before it stores. No
        // provider in the middle: nothing is charged, the account is put on
        // file for accounting to debit.
        const result = await captureBankDetails(proposalId, {
          accountName: accountName.trim(),
          bsb: bsbDigits,
          accountNumber,
        });
        if (result.error) throw new Error(result.error);
        capturedThisSession.add(proposalId);
        setStage("success");
      } catch (err) {
        setErrorMsg((err as Error).message);
        setStage("error");
      }
      return;
    }

    const rawCard = rawCardRef.current;
    const rawExp = rawExpiryRef.current;

    if (rawCard.length < 13) {
      setErrorMsg("Please enter a valid card number");
      return;
    }
    if (rawExp.length < 4) {
      setErrorMsg("Please enter a valid expiry date (MM/YY)");
      return;
    }
    if (cvc.length < 3) {
      setErrorMsg("Please enter a valid CVC");
      return;
    }
    if (!cardholderName.trim()) {
      setErrorMsg("Please enter the cardholder name");
      return;
    }

    setStage("processing");
    setErrorMsg("");

    try {
      const publishableKey = process.env.NEXT_PUBLIC_PINCH_PUBLISHABLE_KEY;
      if (!publishableKey) {
        throw new Error(
          "Card payments are not configured. Please use a bank account, or contact us.",
        );
      }

      await loadPinchScript();
      if (!window.Pinch) {
        throw new Error("Card form failed to load. Please try again.");
      }

      const capture = new window.Pinch.Capture({ publishableKey });

      // THE NUMBER NEVER REACHES US.
      //
      // Pinch tokenises it in the browser and we send on the token alone,
      // which is the whole reason a card goes this way round rather than
      // being encrypted into our own database like the bank account is.
      // Holding card numbers would put the agency inside PCI DSS; holding a
      // token does not.
      const expiryFormatted = `${rawExp.slice(0, 2)}/${rawExp.slice(2)}`;
      const { token } = await capture.createToken({
        sourceType: "credit-card",
        cardNumber: rawCard,
        expiryMonth: rawExp.slice(0, 2),
        expiryYear: `20${rawExp.slice(2)}`,
        cvc,
        cardholderName: cardholderName.trim(),
      });

      // Vault only. No schedule is laid down, because nothing is being
      // charged from here: accounting charges the vaulted card when it
      // chooses.
      const result = await capturePaymentDetails(proposalId, token, {
        lastFour: rawCard.slice(-4),
        brand: detectCardBrand(rawCard),
        expiry: expiryFormatted,
      });

      if (result.error) throw new Error(result.error);

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
        {/* How they want to pay. Two buttons rather than a dropdown: there
            are only ever two, and a dropdown hides the fact that a card is
            an option at all. */}
        <Reveal index={1} className="grid grid-cols-2 gap-2 rounded-xl bg-lyp-white/5 p-1">
          {(["bank", "card"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => {
                setMethod(option);
                setErrorMsg("");
              }}
              disabled={stage === "processing"}
              aria-pressed={method === option}
              className={`rounded-lg px-4 py-2.5 font-heading text-[12px] font-semibold uppercase tracking-[0.14em] transition-colors duration-300 ease-brand ${
                method === option
                  ? "bg-lyp-cherry text-lyp-white"
                  : "text-lyp-white/60 hover:text-lyp-white"
              }`}
            >
              {option === "bank" ? t("methodBank") : t("methodCard")}
            </button>
          ))}
        </Reveal>

        {method === "bank" ? (
          <>
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

          </>
        ) : (
          <>
            {/* Cardholder name */}
            <Reveal index={2}>
              <label
                htmlFor="card-name"
                className="font-body text-xs text-lyp-white/50 uppercase tracking-wider mb-1.5 block"
              >
                {t("cardholderLabel")}
              </label>
              <input
                id="card-name"
                type="text"
                value={cardholderName}
                onChange={(e) => setCardholderName(e.target.value)}
                placeholder="Name on card"
                className="w-full rounded-lg border border-lyp-white/10 bg-lyp-white/5 px-4 py-3.5 font-body text-sm text-lyp-white placeholder:text-lyp-white/30 focus:border-lyp-cherry focus:outline-none focus:ring-1 focus:ring-lyp-cherry transition-colors"
                disabled={stage === "processing"}
                autoComplete="off"
              />
            </Reveal>

            {/* Card number */}
            <Reveal index={3}>
              <label
                htmlFor="card-number"
                className="font-body text-xs text-lyp-white/50 uppercase tracking-wider mb-1.5 block"
              >
                {t("cardNumberLabel")}
              </label>
              <div className="relative">
                <input
                  id="card-number"
                  type="text"
                  inputMode="numeric"
                  value={cardNumber}
                  onChange={handleCardNumberChange}
                  placeholder="1234 5678 9012 3456"
                  className="w-full rounded-lg border border-lyp-white/10 bg-lyp-white/5 px-4 py-3.5 pr-16 font-body text-sm tabular-nums text-lyp-white placeholder:text-lyp-white/30 focus:border-lyp-cherry focus:outline-none focus:ring-1 focus:ring-lyp-cherry transition-colors"
                  disabled={stage === "processing"}
                  autoComplete="off"
                />
                {rawCardRef.current.length >= 2 && (
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 font-body text-xs uppercase text-lyp-white/40">
                    {detectCardBrand(rawCardRef.current)}
                  </span>
                )}
              </div>
            </Reveal>

            {/* Expiry and CVC */}
            <Reveal index={4} className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="card-expiry"
                  className="font-body text-xs text-lyp-white/50 uppercase tracking-wider mb-1.5 block"
                >
                  {t("expiryLabel")}
                </label>
                <input
                  id="card-expiry"
                  type="text"
                  inputMode="numeric"
                  value={expiry}
                  onChange={handleExpiryChange}
                  placeholder="MM/YY"
                  className="w-full rounded-lg border border-lyp-white/10 bg-lyp-white/5 px-4 py-3.5 font-body text-sm tabular-nums text-lyp-white placeholder:text-lyp-white/30 focus:border-lyp-cherry focus:outline-none focus:ring-1 focus:ring-lyp-cherry transition-colors"
                  disabled={stage === "processing"}
                  autoComplete="off"
                />
              </div>
              <div>
                <label
                  htmlFor="card-cvc"
                  className="font-body text-xs text-lyp-white/50 uppercase tracking-wider mb-1.5 block"
                >
                  {t("cvcLabel")}
                </label>
                <input
                  id="card-cvc"
                  type="text"
                  inputMode="numeric"
                  value={cvc}
                  onChange={handleCvcChange}
                  placeholder="123"
                  className="w-full rounded-lg border border-lyp-white/10 bg-lyp-white/5 px-4 py-3.5 font-body text-sm tabular-nums text-lyp-white placeholder:text-lyp-white/30 focus:border-lyp-cherry focus:outline-none focus:ring-1 focus:ring-lyp-cherry transition-colors"
                  disabled={stage === "processing"}
                  autoComplete="off"
                />
              </div>
            </Reveal>
          </>
        )}

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
