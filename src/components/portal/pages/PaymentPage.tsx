"use client";

import { useState, useRef, useCallback } from "react";
import { useProposal } from "../ProposalContext";
import { capturePaymentDetails } from "@/server-actions/payment";

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
/*  Component                                                         */
/* ------------------------------------------------------------------ */

type Stage = "form" | "processing" | "success" | "error";

export default function PaymentPage() {
  const { proposal, selections, serviceMap } = useProposal();

  // Check if all selected services are in_kind (no payment needed)
  const allInKind =
    selections.length > 0 &&
    selections.every((sel) => {
      const svc = serviceMap[sel.serviceId];
      return svc?.billing === "in_kind";
    });

  if (allInKind || selections.length === 0) {
    return <NoPaymentRequired />;
  }

  return <PaymentForm proposalId={proposal.id} />;
}

/* ------------------------------------------------------------------ */
/*  No payment required                                               */
/* ------------------------------------------------------------------ */

function NoPaymentRequired() {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-lyp-cherry/20">
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
      </div>
      <h1 className="font-heading text-3xl md:text-5xl text-lyp-white mb-4">
        No Payment Required
      </h1>
      <p className="font-body text-sm text-lyp-white/60 max-w-md">
        Your selected services are complimentary. No payment details are needed
        at this time.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Payment form                                                      */
/* ------------------------------------------------------------------ */

function PaymentForm({ proposalId }: { proposalId: string }) {
  const [stage, setStage] = useState<Stage>("form");
  const [errorMsg, setErrorMsg] = useState("");

  // Form state
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [cardholderName, setCardholderName] = useState("");

  // Refs for the raw digits
  const rawCardRef = useRef("");
  const rawExpiryRef = useRef("");

  const handleCardNumberChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value.replace(/\D/g, "").slice(0, 16);
      rawCardRef.current = raw;
      setCardNumber(formatCardNumber(e.target.value));
    },
    [],
  );

  const handleExpiryChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value.replace(/\D/g, "").slice(0, 4);
      rawExpiryRef.current = raw;
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

    const rawCard = rawCardRef.current;
    const rawExp = rawExpiryRef.current;

    // Basic validation
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
      // Load Pinch script dynamically
      const publishableKey = process.env.NEXT_PUBLIC_PINCH_PUBLISHABLE_KEY;

      if (!publishableKey) {
        // Dev mode – skip tokenisation but still call the server action
        // In production this would be an error
        throw new Error(
          "Pinch publishable key not configured. Set NEXT_PUBLIC_PINCH_PUBLISHABLE_KEY.",
        );
      }

      await loadPinchScript();

      if (!window.Pinch) {
        throw new Error("Pinch capture library failed to initialise");
      }

      const capture = new window.Pinch.Capture({ publishableKey });

      // Tokenise the card client-side – raw number never leaves the browser
      const expiryFormatted = `${rawExp.slice(0, 2)}/${rawExp.slice(2)}`;
      const expiryMonth = rawExp.slice(0, 2);
      const expiryYear = `20${rawExp.slice(2)}`;

      const { token } = await capture.createToken({
        sourceType: "credit-card",
        cardNumber: rawCard,
        expiryMonth: expiryMonth,
        expiryYear: expiryYear,
        cvc: cvc,
        cardholderName: cardholderName.trim(),
      });

      // Send ONLY the token to the server
      const result = await capturePaymentDetails(proposalId, token, {
        lastFour: rawCard.slice(-4),
        brand: detectCardBrand(rawCard),
        expiry: expiryFormatted,
      });

      if (result.error) {
        throw new Error(result.error);
      }

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
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-lyp-cherry/20">
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
        </div>
        <h1 className="font-heading text-3xl md:text-5xl text-lyp-white mb-4">
          Payment Details Saved
        </h1>
        <p className="font-body text-sm text-lyp-white/60 max-w-md">
          Your card has been securely saved. Payments will be scheduled
          according to your agreement.
        </p>
      </div>
    );
  }

  /* ---- Form / Error / Processing ---- */
  return (
    <div className="flex h-full flex-col items-center justify-center px-6">
      <h1 className="font-heading text-3xl md:text-5xl text-lyp-white mb-2 text-center">
        Payment Details
      </h1>
      <p className="font-body text-sm text-lyp-white/50 mb-8 text-center max-w-md">
        Your card will be securely tokenised. No charges will be made today.
      </p>

      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md space-y-5"
        autoComplete="off"
      >
        {/* Cardholder Name */}
        <div>
          <label className="font-body text-xs text-lyp-white/50 uppercase tracking-wider mb-1.5 block">
            Cardholder Name
          </label>
          <input
            type="text"
            value={cardholderName}
            onChange={(e) => setCardholderName(e.target.value)}
            placeholder="Name on card"
            className="w-full rounded-lg border border-lyp-white/10 bg-lyp-white/5 px-4 py-3.5
                       font-body text-sm text-lyp-white placeholder:text-lyp-white/30
                       focus:border-lyp-cherry focus:outline-none focus:ring-1 focus:ring-lyp-cherry
                       transition-colors"
            disabled={stage === "processing"}
            autoComplete="off"
          />
        </div>

        {/* Card Number */}
        <div>
          <label className="font-body text-xs text-lyp-white/50 uppercase tracking-wider mb-1.5 block">
            Card Number
          </label>
          <div className="relative">
            <input
              type="text"
              inputMode="numeric"
              value={cardNumber}
              onChange={handleCardNumberChange}
              placeholder="1234 5678 9012 3456"
              className="w-full rounded-lg border border-lyp-white/10 bg-lyp-white/5 px-4 py-3.5
                         font-body text-sm text-lyp-white placeholder:text-lyp-white/30
                         focus:border-lyp-cherry focus:outline-none focus:ring-1 focus:ring-lyp-cherry
                         transition-colors pr-16"
              disabled={stage === "processing"}
              autoComplete="off"
            />
            {/* Card brand indicator */}
            {rawCardRef.current.length >= 2 && (
              <span className="absolute right-4 top-1/2 -translate-y-1/2 font-body text-xs text-lyp-white/40 uppercase">
                {detectCardBrand(rawCardRef.current)}
              </span>
            )}
          </div>
        </div>

        {/* Expiry + CVC row */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="font-body text-xs text-lyp-white/50 uppercase tracking-wider mb-1.5 block">
              Expiry
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={expiry}
              onChange={handleExpiryChange}
              placeholder="MM/YY"
              className="w-full rounded-lg border border-lyp-white/10 bg-lyp-white/5 px-4 py-3.5
                         font-body text-sm text-lyp-white placeholder:text-lyp-white/30
                         focus:border-lyp-cherry focus:outline-none focus:ring-1 focus:ring-lyp-cherry
                         transition-colors"
              disabled={stage === "processing"}
              autoComplete="off"
            />
          </div>
          <div>
            <label className="font-body text-xs text-lyp-white/50 uppercase tracking-wider mb-1.5 block">
              CVC
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={cvc}
              onChange={handleCvcChange}
              placeholder="123"
              className="w-full rounded-lg border border-lyp-white/10 bg-lyp-white/5 px-4 py-3.5
                         font-body text-sm text-lyp-white placeholder:text-lyp-white/30
                         focus:border-lyp-cherry focus:outline-none focus:ring-1 focus:ring-lyp-cherry
                         transition-colors"
              disabled={stage === "processing"}
              autoComplete="off"
            />
          </div>
        </div>

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
          className="w-full rounded-lg bg-lyp-cherry px-6 py-4 font-heading text-lg text-lyp-white
                     transition-colors hover:bg-lyp-deep-red disabled:opacity-50 disabled:cursor-not-allowed"
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
              Saving...
            </span>
          ) : stage === "error" ? (
            "Try Again"
          ) : (
            "Save Payment Details"
          )}
        </button>

        {/* Security note */}
        <p className="font-body text-xs text-lyp-white/30 text-center leading-relaxed">
          Your card details are securely tokenised and never touch our servers.
          Payments are processed by Pinch Payments, an Australian PCI-DSS
          compliant payment provider.
        </p>
      </form>
    </div>
  );
}
