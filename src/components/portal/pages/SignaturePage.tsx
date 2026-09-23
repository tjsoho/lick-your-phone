"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { useReducedMotion } from "framer-motion";
import { Download, X } from "lucide-react";
import { useCopy, useProposal } from "../ProposalContext";
import { signProposal } from "@/server-actions/signature";
import SelectionSummaryCard from "../SelectionSummaryCard";
import Reveal, { revealDelay } from "../Reveal";

type SignState = "idle" | "signing" | "signed" | "error";

/**
 * How long the confirmation holds the screen before the deck carries on to
 * payment. Long enough to read the tick, short enough that nobody starts
 * wondering whether they are finished.
 */
const PAYMENT_HANDOFF_MS = 2000;

/**
 * How many clauses the summary above the pad shows before it defers to the
 * full terms. Three, because the point is a glance, and because the slide has
 * a signature pad and a button to fit under it without scrolling.
 */
const TERMS_SUMMARY_MAX = 3;

/** Longest a summarised clause runs before it is cut at a word. */
const GIST_CHARS = 84;

/**
 * The gist of a clause: its first sentence, cut short if even that runs long.
 *
 * Derived rather than written out a second time, because the clauses are the
 * agency's to edit in Settings — a hand-written summary here would drift the
 * first time they changed one, and could soften a term the client is actually
 * bound by. The full clause is always one tap away.
 */
function clauseGist(clause: string): string {
  const stop = clause.search(/[.!?](\s|$)/);
  const sentence = (stop === -1 ? clause : clause.slice(0, stop + 1)).trim();
  if (sentence.length <= GIST_CHARS) return sentence;

  // Cut at the last whole word, so the shortened line never ends mid-syllable.
  const cut = sentence.slice(0, GIST_CHARS);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > GIST_CHARS / 2 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

export default function SignaturePage() {
  const {
    proposal,
    agreement,
    selections,
    updateProposal,
    pages,
    setCurrentPage,
    paymentCaptured,
  } = useProposal();
  const t = useCopy("signature");
  const reduceMotion = useReducedMotion();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [termsOpen, setTermsOpen] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [signState, setSignState] = useState<SignState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [documentUrl, setDocumentUrl] = useState("");
  const [handoffArmed, setHandoffArmed] = useState(true);

  // Already signed?
  const alreadySigned = proposal.status === "signed";

  const paymentPageIndex = pages.findIndex((p) => p.slug === "payment");

  /* ---------------------------------------------------------------- */
  /*  Canvas drawing logic                                            */
  /* ---------------------------------------------------------------- */

  const getCtx = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    return ctx;
  }, []);

  const getPos = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ("touches" in e) {
      const touch = e.touches[0];
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }, []);

  const startDraw = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      const ctx = getCtx();
      if (!ctx) return;
      const pos = getPos(e);
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
      setIsDrawing(true);
    },
    [getCtx, getPos],
  );

  const draw = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!isDrawing) return;
      e.preventDefault();
      const ctx = getCtx();
      if (!ctx) return;
      const pos = getPos(e);
      ctx.lineTo(pos.x, pos.y);
      ctx.strokeStyle = "#FFFFFF";
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();
      setHasDrawn(true);
    },
    [isDrawing, getCtx, getPos],
  );

  const endDraw = useCallback(() => {
    setIsDrawing(false);
  }, []);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  }, []);

  // Set canvas size on mount
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Use a fixed internal resolution for consistent signature capture
    canvas.width = 600;
    canvas.height = 200;
  }, []);

  /* ---------------------------------------------------------------- */
  /*  Email validation                                                */
  /* ---------------------------------------------------------------- */

  const validateEmail = useCallback((val: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!val) {
      setEmailError("Email is required");
      return false;
    }
    if (!re.test(val)) {
      setEmailError("Please enter a valid email address");
      return false;
    }
    setEmailError("");
    return true;
  }, []);

  /* ---------------------------------------------------------------- */
  /*  Submit                                                          */
  /* ---------------------------------------------------------------- */

  const handleSign = useCallback(async () => {
    if (!validateEmail(email)) return;
    if (!hasDrawn) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    setSignState("signing");
    setErrorMsg("");

    try {
      const signatureDataUrl = canvas.toDataURL("image/png");

      const result = await signProposal({
        proposalId: proposal.id,
        signerEmail: email,
        signatureDataUrl,
        selections: selections.map((s) => ({
          serviceId: s.serviceId,
          tierId: s.tierId,
        })),
      });

      if (result.error) {
        setSignState("error");
        setErrorMsg(result.error);
        return;
      }

      setDocumentUrl(result.documentUrl ?? "");
      setSignState("signed");
      updateProposal({ status: "signed", signedAt: new Date().toISOString() });
    } catch {
      setSignState("error");
      setErrorMsg("An unexpected error occurred. Please try again.");
    }
  }, [email, hasDrawn, proposal.id, selections, validateEmail, updateProposal]);

  /* ---------------------------------------------------------------- */
  /*  Straight into payment                                           */
  /* ---------------------------------------------------------------- */

  const confirming = alreadySigned || signState === "signed";

  /**
   * Signing and paying are one movement, so the client is carried into the
   * payment slide rather than asked to choose it. This also rescues the
   * "signed a while ago, never paid" visit, which used to land on a
   * confirmation with nowhere to go.
   *
   * It stays off when there is nothing to carry them to: no payment slide in
   * this deck (the provider drops it when the proposal isn't signed, and
   * `findIndex` then returns -1), or a card already on file, in which case the
   * provider has removed the slide entirely.
   */
  const handsOffToPayment =
    confirming && paymentPageIndex !== -1 && !paymentCaptured;

  useEffect(() => {
    if (!handsOffToPayment || !handoffArmed) return;

    // The hold is decoration. Anyone who has asked for less motion gets the
    // next screen immediately rather than a pause they didn't ask for.
    if (reduceMotion) {
      setCurrentPage(paymentPageIndex);
      return;
    }

    const id = setTimeout(
      () => setCurrentPage(paymentPageIndex),
      PAYMENT_HANDOFF_MS,
    );
    return () => clearTimeout(id);
  }, [
    handsOffToPayment,
    handoffArmed,
    reduceMotion,
    paymentPageIndex,
    setCurrentPage,
  ]);

  /* ---------------------------------------------------------------- */
  /*  Confirmation, on its way to payment                             */
  /* ---------------------------------------------------------------- */

  if (confirming) {
    // Fresh signatures know their own document; a client coming back does
    // not, so the link falls back to the address that resolves the latest
    // contract from their portal token.
    const contractHref =
      documentUrl || `/api/contract/by-token/${proposal.token}`;

    return (
      <div className="flex h-full flex-col items-center justify-center px-6 text-center">
        <Reveal
          variant="pop"
          index={0}
          className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-lyp-cherry/20"
        >
          <svg
            className="h-8 w-8 text-lyp-cherry"
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
          {t("signedTitle")}
        </h1>
        <p
          className="portal-reveal font-body text-sm text-lyp-white/60 max-w-sm mb-8"
          style={{ animationDelay: `${revealDelay(2)}ms` }}
        >
          {agreement.postSignatureText}
        </p>
        <Reveal
          index={3}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
          <a
            href={contractHref}
            target="_blank"
            rel="noopener noreferrer"
            // Reaching for the contract cancels the hand-off: someone saving
            // their copy should not have the screen pulled out from under
            // them mid-click. The button below is then their way on.
            onClick={() => setHandoffArmed(false)}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-lyp-white/10 border border-lyp-white/20 px-6 py-3 font-heading text-sm text-lyp-white transition-colors hover:bg-lyp-white/20"
          >
            <Download className="h-4 w-4" />
            {t("downloadButton")}
          </a>
          {paymentPageIndex !== -1 && !paymentCaptured && (
            <button
              onClick={() => setCurrentPage(paymentPageIndex)}
              className="inline-flex items-center gap-2 rounded-lg bg-lyp-cherry px-6 py-3 font-heading text-sm text-lyp-white transition-colors hover:bg-lyp-maroon justify-center"
            >
              {t("addPaymentButton")}
            </button>
          )}
        </Reveal>

        {/* Said out loud, so the page moving on its own reads as the flow
            working rather than something the client didn't do. */}
        {handsOffToPayment && handoffArmed && !reduceMotion && (
          <Reveal
            as="p"
            index={4}
            variant="fade"
            className="mt-5 font-body text-xs text-lyp-white/40"
            aria-live="polite"
          >
            {t("redirectNotice")}
          </Reveal>
        )}
      </div>
    );
  }

  /* ---------------------------------------------------------------- */
  /*  Signing form                                                    */
  /* ---------------------------------------------------------------- */

  const noSelections = selections.length === 0;

  if (noSelections) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6 text-center">
        <Reveal as="p" index={0} className="font-body text-lyp-white/40 text-lg">
          {t("noServicesTitle")}
        </Reveal>
        <Reveal
          as="p"
          index={1}
          className="font-body text-lyp-white/30 text-sm mt-2"
        >
          {t("noServicesBody")}
        </Reveal>
      </div>
    );
  }

  const clauses = agreement.termsClauses;
  const gists = clauses.slice(0, TERMS_SUMMARY_MAX).map(clauseGist);
  const hiddenClauses = Math.max(clauses.length - TERMS_SUMMARY_MAX, 0);

  return (
    /* THE SLIDE.
       Two columns on a wide screen: the signing column on the left, sitting on
       the optical centre of its own side rather than hanging off the top with
       dead space beneath, and the figures they are about to be bound by on the
       right. `m-auto` rather than `justify-center`, the way the summary slide
       does it: if the column ever outgrows the frame it scrolls from the top
       instead of losing its heading off the edge.

       On a phone the card comes FIRST — it is written first here and moved
       into the second column on `lg` — so the numbers are read before the pen
       is picked up. */
    <div className="flex h-full flex-col px-6 py-4 md:px-10 lg:px-14">
      <div className="m-auto grid w-full max-w-[1180px] gap-6 lg:grid-cols-[minmax(0,1fr)_330px] lg:items-center lg:gap-12">
        <Reveal
          variant="right"
          index={2}
          className="lg:col-start-2 lg:row-start-1"
        >
          <SelectionSummaryCard t={t} />
        </Reveal>

        {/* The signing column is deliberately tight: heading, email, the terms
            in brief, the pad and the button have to stand together inside a
            frame that never scrolls — 612px of it on a 1280x720 laptop, once
            the price bar and the nav have taken theirs. */}
        <div className="space-y-3.5 lg:col-start-1 lg:row-start-1 lg:max-w-xl">
          <div>
            <Reveal
              as="h1"
              index={0}
              // Sized by the height it has, not the width: a 720p laptop
              // needs those pixels for the pad, a taller screen doesn't.
              className="font-heading text-3xl text-lyp-white [@media(min-height:800px)]:text-4xl"
            >
              {t("heading")}
            </Reveal>
            <Reveal
              as="p"
              index={1}
              className="font-body text-sm text-lyp-white/50 mt-1.5"
            >
              {t("intro")}
            </Reveal>
          </div>

          {/* Email */}
          <Reveal index={3}>
            <label
              htmlFor="signer-email"
              className="block font-body text-sm text-lyp-white/70 mb-1.5"
            >
              {t("emailLabel")}
            </label>
            <input
              id="signer-email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (emailError) validateEmail(e.target.value);
              }}
              onBlur={() => validateEmail(email)}
              placeholder="you@example.com"
              className="w-full max-w-md rounded-lg border border-lyp-white/20 bg-lyp-white/5 px-4 py-2.5 font-body text-sm text-lyp-white placeholder:text-lyp-white/30 outline-none focus:border-lyp-cherry transition-colors"
              disabled={signState === "signing"}
            />
            {emailError && (
              <p className="font-body text-xs text-lyp-cherry mt-1">
                {emailError}
              </p>
            )}
          </Reveal>

          {/* The terms in brief, above the pad: the headline of each clause,
              capped, with the full wording and a copy to keep beside it. */}
          <Reveal
            index={4}
            className="max-w-md rounded-xl border border-lyp-white/10 bg-lyp-white/5 px-4 py-3"
          >
            <p className="font-heading text-[13px]/[18px] uppercase tracking-wider text-lyp-cherry">
              {t("termsSummaryTitle")}
            </p>

            {gists.length === 0 ? (
              <p className="mt-1.5 font-body text-[13px]/[18px] text-lyp-white/50">
                {t("termsEmpty")}
              </p>
            ) : (
              <ul className="mt-1.5 space-y-1">
                {gists.map((gist, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-lyp-cherry" />
                    {/* Clamped as well as shortened: a clause with no full
                        stop in it can't push the pad off the slide. */}
                    <span className="line-clamp-2 font-body text-[13px]/[18px] text-lyp-white/80">
                      {gist}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5">
              <button
                type="button"
                onClick={() => setTermsOpen(true)}
                className="font-body text-xs text-lyp-white/80 underline underline-offset-2 transition-colors duration-300 ease-brand hover:text-lyp-cherry motion-reduce:transition-none"
              >
                {t("viewAllTermsButton")}
              </button>
              {clauses.length > 0 && (
                <a
                  href={`/api/terms/${proposal.token}`}
                  className="inline-flex items-center gap-1.5 font-body text-xs text-lyp-white/80 underline underline-offset-2 transition-colors duration-300 ease-brand hover:text-lyp-cherry motion-reduce:transition-none"
                >
                  <Download className="h-3.5 w-3.5" />
                  {t("downloadTermsButton")}
                </a>
              )}
              {hiddenClauses > 0 && (
                <span className="font-body text-xs text-lyp-white/40">
                  {t("termsSummaryMore", { count: hiddenClauses })}
                </span>
              )}
            </div>
          </Reveal>

          {/* Signature canvas. FADE ONLY, deliberately: `getPos` reads the
              canvas's bounding rect to place each stroke, and a transform
              would offset that rect for anyone who starts drawing mid-entry. */}
          <Reveal variant="fade" index={5}>
            <p className="font-body text-sm text-lyp-white/70 mb-1.5">
              {t("signatureLabel")}
            </p>
            <div className="w-full max-w-md rounded-xl border-2 border-lyp-white/20 bg-lyp-white/5 overflow-hidden">
              {/* The pad takes the height the screen can spare: short laptops
                  keep the whole column above the fold, taller ones get a pad
                  worth signing on. The capture resolution is fixed either way,
                  since every stroke is scaled by the rect. */}
              <canvas
                ref={canvasRef}
                className="h-[120px] w-full cursor-crosshair touch-none [@media(min-height:800px)]:h-[150px]"
                onMouseDown={startDraw}
                onMouseMove={draw}
                onMouseUp={endDraw}
                onMouseLeave={endDraw}
                onTouchStart={startDraw}
                onTouchMove={draw}
                onTouchEnd={endDraw}
              />
            </div>
            <button
              type="button"
              onClick={clearCanvas}
              disabled={signState === "signing"}
              className="mt-1.5 font-body text-xs text-lyp-white/40 underline hover:text-lyp-white/60 transition-colors disabled:opacity-30"
            >
              {t("clearButton")}
            </button>
          </Reveal>

          {/* Agreement text */}
          <p
            className="portal-reveal font-body text-xs text-lyp-white/40 max-w-md leading-snug"
            style={{ animationDelay: `${revealDelay(6)}ms` }}
          >
            {t("agreementText")}{" "}
            <button
              type="button"
              onClick={() => setTermsOpen(true)}
              className="font-semibold text-lyp-white/80 underline underline-offset-2 transition-colors hover:text-lyp-cherry"
            >
              {t("termsLinkText")}
            </button>
            {t("agreementTextAfter")}
          </p>

          {/* Error */}
          {signState === "error" && errorMsg && (
            <div className="rounded-lg border border-lyp-cherry/30 bg-lyp-cherry/10 px-4 py-3 max-w-md">
              <p className="font-body text-sm text-lyp-cherry">{errorMsg}</p>
            </div>
          )}

          {/* Action buttons */}
          <Reveal index={7} className="flex gap-3 max-w-md">
            <button
              type="button"
              onClick={handleSign}
              disabled={!hasDrawn || !email || signState === "signing"}
              className="flex-1 rounded-lg bg-lyp-cherry px-6 py-3 font-heading text-lg text-lyp-white transition-[background-color,transform] duration-300 ease-brand hover:bg-lyp-maroon active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed motion-reduce:transition-none motion-reduce:active:scale-100"
            >
              {signState === "signing" ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="h-5 w-5 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
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
                  {t("signingButton")}
                </span>
              ) : (
                t("signButton")
              )}
            </button>
          </Reveal>
        </div>
      </div>

      {/* Terms, read in place rather than navigating away mid-signature */}
      {termsOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Terms and conditions"
          className="fixed inset-0 z-[60] flex items-center justify-center bg-[#050203]/80 p-4 backdrop-blur-sm"
          onClick={() => setTermsOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="portal-reveal portal-reveal-pop flex max-h-[80vh] w-full max-w-2xl flex-col rounded-2xl border border-lyp-white/15 bg-[#150609]"
          >
            <div className="flex items-center justify-between gap-4 border-b border-lyp-white/10 px-6 py-4">
              <h2 className="font-heading text-lg text-lyp-white">
                {t("termsTitle")}
              </h2>
              <button
                type="button"
                onClick={() => setTermsOpen(false)}
                aria-label="Close terms and conditions"
                className="rounded-full p-1.5 text-lyp-white/50 transition-colors hover:text-lyp-cherry"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="overflow-y-auto px-6 py-5">
              {clauses.length === 0 ? (
                <p className="font-body text-sm text-lyp-white/50">
                  {t("termsEmpty")}
                </p>
              ) : (
                <ol className="space-y-3">
                  {clauses.map((clause, i) => (
                    <li
                      key={i}
                      className="flex gap-3 font-body text-[13px] leading-relaxed text-lyp-white/70"
                    >
                      <span className="shrink-0 font-heading text-lyp-cherry">
                        {i + 1}.
                      </span>
                      <span>{clause}</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>

            <div className="flex items-center justify-between gap-4 border-t border-lyp-white/10 px-6 py-4">
              {clauses.length > 0 ? (
                <a
                  href={`/api/terms/${proposal.token}`}
                  className="inline-flex items-center gap-2 font-body text-xs text-lyp-white/70 underline underline-offset-2 transition-colors duration-300 ease-brand hover:text-lyp-cherry motion-reduce:transition-none"
                >
                  <Download className="h-3.5 w-3.5" />
                  {t("downloadTermsButton")}
                </a>
              ) : (
                <span />
              )}
              <button
                type="button"
                onClick={() => setTermsOpen(false)}
                className="rounded-lg bg-lyp-cherry px-5 py-2 font-heading text-sm text-lyp-white transition-colors hover:bg-lyp-maroon"
              >
                {t("termsCloseButton")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
