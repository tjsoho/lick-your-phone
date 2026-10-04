"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { useReducedMotion } from "framer-motion";
import { Download, ExternalLink, X } from "lucide-react";
import { useCopy, useProposal } from "../ProposalContext";
import { useSignerEmail } from "../useSignerEmail";
import { signProposal } from "@/server-actions/signature";
import SelectionSummaryCard from "../SelectionSummaryCard";
import Reveal, { revealDelay } from "../Reveal";
import type { TermsKind } from "@/lib/terms";

type SignState = "idle" | "signing" | "signed" | "error";

/**
 * How long the confirmation holds the screen before the deck carries on to
 * payment. Long enough to read the tick, short enough that nobody starts
 * wondering whether they are finished.
 */
const PAYMENT_HANDOFF_MS = 2000;

/* -------------------------------------------------------------------------
   THE TERMS, ONCE

   This slide used to say the terms three times: a "The main points" panel
   summarising the first sentence of each clause, a pair of buttons under it
   (one opening the clause list, one fetching the real document), and then the
   consent sentence with its own link to the same clause list.

   The agency asked for one of them: "I wouldn't have the terms and conditions
   twice… we can remove this thing then and just keep this here, like it's a
   clickable thing. Anyone will understand that they need to read it."

   What is left is the consent sentence. Its link is the single route to the
   full terms — the clause window when there are clauses to show, and the
   agency's own document or page directly when there are not, so nobody is
   ever sent to a window that only tells them to open something else. The
   window still carries the download/open control in its footer, so the real
   document is never more than one step from the sentence.
   ------------------------------------------------------------------------- */

/**
 * How the terms are written into the consent sentence. One class string for
 * all three destinations, so the phrase looks identical whether it opens the
 * clause window, the agency's page, or their file.
 */
const CONSENT_LINK =
  "font-semibold text-lyp-white underline decoration-lyp-white/60 underline-offset-[3px] transition-colors duration-300 ease-brand hover:text-lyp-cherry hover:decoration-lyp-cherry/70 motion-reduce:transition-none";

/** The wording function from `useCopy`. */
type Copy = (key: string, vars?: Record<string, string | number>) => string;

/**
 * THE WAY THROUGH TO THE FULL TERMS.
 *
 * Always the same address — `/api/terms/<token>` — because which of the three
 * possible documents that is, is the route's decision and nobody else's. All
 * that changes here is what the client is told they are about to open, and
 * how: the agency's own page opens in a new tab so the half-signed slide is
 * not lost behind it, while a file comes down as a file.
 */
function FullTermsLink({
  token,
  kind,
  t,
  className,
}: {
  token: string;
  kind: TermsKind;
  t: Copy;
  className: string;
}) {
  if (kind === "none") return null;

  const isLink = kind === "link";
  const Icon = isLink ? ExternalLink : Download;
  const label = isLink
    ? t("viewTermsLinkButton")
    : kind === "document"
      ? t("downloadTermsDocumentButton")
      : t("downloadTermsButton");

  return (
    /* Nothing special is needed for a file: the route answers one with a
       Content-Disposition of `attachment`, which downloads it wherever the
       bytes actually come from. */
    <a
      href={`/api/terms/${token}`}
      {...(isLink ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className={className}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </a>
  );
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
  /* Opens with the address the proposal was sent to, stays the client's to
     change, and — unlike the plain `useState` it replaces — survives the
     carousel pulling this slide down and building it again on every page
     turn. See useSignerEmail for why that was losing people's typing. */
  const { email, setEmail, forget: forgetEmail } = useSignerEmail(
    proposal.token,
    proposal.clientEmail ?? "",
  );
  const [emailError, setEmailError] = useState("");
  const [signState, setSignState] = useState<SignState>("idle");
  const [errorMsg, setErrorMsg] = useState("");

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

      setSignState("signed");
      // Signed: the address is on the record now, so the copy held for the
      // visit has nothing left to rescue.
      forgetEmail();
      updateProposal({ status: "signed", signedAt: new Date().toISOString() });
    } catch {
      setSignState("error");
      setErrorMsg("An unexpected error occurred. Please try again.");
    }
  }, [
    email,
    hasDrawn,
    proposal.id,
    selections,
    validateEmail,
    updateProposal,
    forgetEmail,
  ]);

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
    if (!handsOffToPayment) return;

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
  }, [handsOffToPayment, reduceMotion, paymentPageIndex, setCurrentPage]);

  /* ---------------------------------------------------------------- */
  /*  Confirmation, on its way to payment                             */
  /* ---------------------------------------------------------------- */

  /* THE CONFIRMATION.

     There used to be a "Download Contract PDF" button here, and it was in the
     way: a client who has just signed is on their way to pay, and a file is
     not what they want in that second. "Do you need the contract there to
     download, or maybe at the end? — At the end is fine." The end-of-journey
     screen already offers the same `/api/contract/by-token/<token>`, which
     resolves the latest signed contract, so nothing is lost by dropping it
     from here — and with it goes the hand-off being disarmed by a click,
     which only existed to stop the screen moving while someone saved a file. */
  if (confirming) {
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
        {paymentPageIndex !== -1 && !paymentCaptured && (
          <Reveal index={3} className="flex justify-center">
            <button
              onClick={() => setCurrentPage(paymentPageIndex)}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-lyp-cherry px-6 py-3 font-heading text-sm text-lyp-white transition-colors hover:bg-lyp-maroon"
            >
              {t("addPaymentButton")}
            </button>
          </Reveal>
        )}

        {/* Said out loud, so the page moving on its own reads as the flow
            working rather than something the client didn't do. */}
        {handsOffToPayment && !reduceMotion && (
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

  /* Which full terms this proposal offers. The dashboard's page previews send
     no kind, so they fall back to what the clauses alone can support. */
  const termsKind: TermsKind =
    agreement.termsKind ?? (clauses.length > 0 ? "generated" : "none");

  /* Where the consent sentence's link goes. Clauses are read in the window,
     which also carries the control for the real document. With no clauses
     written there is nothing to put in a window, so the link is the document
     itself — and with neither, the phrase is left as plain words rather than
     a link that opens nothing. */
  const termsOpenInWindow = clauses.length > 0;
  const termsIsLink = !termsOpenInWindow && termsKind !== "none";

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

          {/* Email. It arrives filled in with the address this proposal was
              sent to and stays the client's to change — a different person
              may be the one signing. */}
          <Reveal index={3}>
            <label
              htmlFor="signer-email"
              className="block font-body text-sm text-lyp-white/70 mb-1.5"
            >
              {t("emailLabel")}
            </label>
            <input
              id="signer-email"
              name="signer-email"
              type="email"
              autoComplete="email"
              inputMode="email"
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

          {/* Signature canvas. FADE ONLY, deliberately: `getPos` reads the
              canvas's bounding rect to place each stroke, and a transform
              would offset that rect for anyone who starts drawing mid-entry. */}
          <Reveal variant="fade" index={4}>
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

          {/* THE CONSENT SENTENCE, which is now the whole of the terms on this
              slide. It was set at `text-xs` on 40% white, under a panel that
              repeated it — at that weight, alone, it would be furniture. One
              step up in size and brightness, and a link that is plainly a
              link, which is all the agency asked for: "just keep this here,
              like it's a clickable thing." */}
          <p
            className="portal-reveal max-w-md font-body text-[13px] leading-snug text-lyp-white/60"
            style={{ animationDelay: `${revealDelay(5)}ms` }}
          >
            {t("agreementText")}{" "}
            {termsOpenInWindow ? (
              <button
                type="button"
                onClick={() => setTermsOpen(true)}
                className={CONSENT_LINK}
              >
                {t("termsLinkText")}
              </button>
            ) : termsIsLink ? (
              /* Nothing to put in a window, so the phrase IS the document.
                 Same address either way — which of the three it resolves to
                 is the route's business. */
              <a
                href={`/api/terms/${proposal.token}`}
                {...(termsKind === "link"
                  ? { target: "_blank", rel: "noopener noreferrer" }
                  : {})}
                className={CONSENT_LINK}
              >
                {t("termsLinkText")}
              </a>
            ) : (
              /* No clauses and no document. The sentence still reads, but the
                 phrase is words rather than a link that opens nothing. */
              <span className="font-semibold text-lyp-white/75">
                {t("termsLinkText")}
              </span>
            )}
            {t("agreementTextAfter")}
          </p>

          {/* Nothing published at all — no clauses, no document, no link.
              The panel that used to sit above the pad said so out loud, and
              that is worth keeping: it is how the agency notices Settings →
              Agreement is still empty, before a client does. */}
          {!termsOpenInWindow && !termsIsLink && (
            <p
              className="portal-reveal max-w-md font-body text-xs italic text-lyp-white/40"
              style={{ animationDelay: `${revealDelay(5)}ms` }}
            >
              {t("termsEmpty")}
            </p>
          )}

          {/* Error */}
          {signState === "error" && errorMsg && (
            <div className="rounded-lg border border-lyp-cherry/30 bg-lyp-cherry/10 px-4 py-3 max-w-md">
              <p className="font-body text-sm text-lyp-cherry">{errorMsg}</p>
            </div>
          )}

          {/* Action buttons */}
          <Reveal index={6} className="flex gap-3 max-w-md">
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

            {/* No empty state: the sentence only offers this window when
                there are clauses to put in it, and sends the client straight
                to the agency's own document when there are not. */}
            <div className="overflow-y-auto px-6 py-5">
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
            </div>

            <div className="flex items-center justify-between gap-4 border-t border-lyp-white/10 px-6 py-4">
              {termsKind === "none" ? (
                <span />
              ) : (
                <FullTermsLink
                  token={proposal.token}
                  kind={termsKind}
                  t={t}
                  className="inline-flex items-center gap-2 font-body text-xs text-lyp-white/70 underline underline-offset-2 transition-colors duration-300 ease-brand hover:text-lyp-cherry motion-reduce:transition-none"
                />
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
