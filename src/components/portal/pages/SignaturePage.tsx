"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { useCopy, useProposal } from "../ProposalContext";
import { signProposal } from "@/server-actions/signature";
import Reveal, { revealDelay } from "../Reveal";
import { X } from "lucide-react";

type SignState = "idle" | "signing" | "signed" | "error";

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

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [termsOpen, setTermsOpen] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [signState, setSignState] = useState<SignState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [documentUrl, setDocumentUrl] = useState("");

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
  /*  Already signed state                                            */
  /* ---------------------------------------------------------------- */

  if (alreadySigned) {
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
        <h1 className="portal-reveal font-heading text-3xl md:text-5xl text-lyp-white mb-4" style={{ animationDelay: `${revealDelay(1)}ms` }}>
          {t("signedTitle")}
        </h1>
        <p className="portal-reveal font-body text-sm text-lyp-white/60 max-w-sm mb-8" style={{ animationDelay: `${revealDelay(2)}ms` }}>
          {agreement.postSignatureText}
        </p>
        <Reveal index={3} className="flex flex-col sm:flex-row gap-4 justify-center">
          {documentUrl && (
            <a
              href={documentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-lyp-white/10 border border-lyp-white/20 px-6 py-3 font-heading text-sm text-lyp-white transition-colors hover:bg-lyp-white/20"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              {t("downloadButton")}
            </a>
          )}
          {paymentPageIndex !== -1 && !paymentCaptured && (
            <button
              onClick={() => setCurrentPage(paymentPageIndex)}
              className="inline-flex items-center gap-2 rounded-lg bg-lyp-cherry px-6 py-3 font-heading text-sm text-lyp-white transition-colors hover:bg-lyp-maroon justify-center"
            >
              {t("addPaymentButton")}
            </button>
          )}
        </Reveal>
      </div>
    );
  }

  /* ---------------------------------------------------------------- */
  /*  Success state                                                   */
  /* ---------------------------------------------------------------- */

  if (signState === "signed") {
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
        <h1 className="portal-reveal font-heading text-3xl md:text-5xl text-lyp-white mb-4" style={{ animationDelay: `${revealDelay(1)}ms` }}>
          {t("signedTitle")}
        </h1>
        <p className="portal-reveal font-body text-sm text-lyp-white/60 max-w-sm mb-8" style={{ animationDelay: `${revealDelay(2)}ms` }}>
          {agreement.postSignatureText}
        </p>
        <Reveal index={3} className="flex flex-col sm:flex-row gap-4 justify-center">
          {documentUrl && (
            <a
              href={documentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-lyp-white/10 border border-lyp-white/20 px-6 py-3 font-heading text-sm text-lyp-white transition-colors hover:bg-lyp-white/20"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              {t("downloadButton")}
            </a>
          )}
          {paymentPageIndex !== -1 && !paymentCaptured && (
            <button
              onClick={() => setCurrentPage(paymentPageIndex)}
              className="inline-flex items-center gap-2 rounded-lg bg-lyp-cherry px-6 py-3 font-heading text-sm text-lyp-white transition-colors hover:bg-lyp-maroon justify-center"
            >
              {t("addPaymentButton")}
            </button>
          )}
        </Reveal>
      </div>
    );
  }

  /* ---------------------------------------------------------------- */
  /*  Signing form                                                    */
  /* ---------------------------------------------------------------- */

  const noSelections = selections.length === 0;

  return (
    <div className="flex h-full flex-col px-6 py-8 md:px-16 lg:px-24">
      <Reveal
        as="h1"
        index={0}
        className="font-heading text-3xl md:text-5xl text-lyp-white mb-2"
      >
        {t("heading")}
      </Reveal>
      <Reveal
        as="p"
        index={1}
        className="font-body text-sm text-lyp-white/50 mb-6"
      >
        {t("intro")}
      </Reveal>

      {noSelections ? (
        <div className="flex flex-1 flex-col items-center justify-center">
          <Reveal as="p" index={2} className="font-body text-lyp-white/40 text-lg">
            {t("noServicesTitle")}
          </Reveal>
          <Reveal
            as="p"
            index={3}
            className="font-body text-lyp-white/30 text-sm mt-2"
          >
            {t("noServicesBody")}
          </Reveal>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-6">
          {/* Email */}
          <Reveal index={2}>
            <label
              htmlFor="signer-email"
              className="block font-body text-sm text-lyp-white/70 mb-2"
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
              className="w-full max-w-md rounded-lg border border-lyp-white/20 bg-lyp-white/5 px-4 py-3 font-body text-sm text-lyp-white placeholder:text-lyp-white/30 outline-none focus:border-lyp-cherry transition-colors"
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
          <Reveal variant="fade" index={3}>
            <p className="font-body text-sm text-lyp-white/70 mb-2">
              {t("signatureLabel")}
            </p>
            <div className="w-full max-w-md rounded-xl border-2 border-lyp-white/20 bg-lyp-white/5 overflow-hidden">
              <canvas
                ref={canvasRef}
                className="w-full cursor-crosshair touch-none"
                style={{ height: 160 }}
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
              className="mt-2 font-body text-xs text-lyp-white/40 underline hover:text-lyp-white/60 transition-colors disabled:opacity-30"
            >
              {t("clearButton")}
            </button>
          </Reveal>

          {/* Agreement text */}
          <p
            className="portal-reveal font-body text-xs text-lyp-white/40 max-w-md leading-relaxed"
            style={{ animationDelay: `${revealDelay(4)}ms` }}
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
                  {agreement.termsClauses.length === 0 ? (
                    <p className="font-body text-sm text-lyp-white/50">
                      {t("termsEmpty")}
                    </p>
                  ) : (
                    <ol className="space-y-3">
                      {agreement.termsClauses.map((clause, i) => (
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

                <div className="border-t border-lyp-white/10 px-6 py-4 text-right">
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

          {/* Error */}
          {signState === "error" && errorMsg && (
            <div className="rounded-lg border border-lyp-cherry/30 bg-lyp-cherry/10 px-4 py-3 max-w-md">
              <p className="font-body text-sm text-lyp-cherry">{errorMsg}</p>
            </div>
          )}

          {/* Action buttons */}
          <Reveal index={5} className="flex gap-3 max-w-md">
            <button
              type="button"
              onClick={handleSign}
              disabled={!hasDrawn || !email || signState === "signing"}
              className="flex-1 rounded-lg bg-lyp-cherry px-6 py-4 font-heading text-lg text-lyp-white transition-[background-color,transform] duration-300 ease-brand hover:bg-lyp-maroon active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed motion-reduce:transition-none motion-reduce:active:scale-100"
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
      )}
    </div>
  );
}
