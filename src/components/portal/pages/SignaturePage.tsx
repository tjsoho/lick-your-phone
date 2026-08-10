"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { useProposal } from "../ProposalContext";
import { signProposal } from "@/server-actions/signature";

type SignState = "idle" | "signing" | "signed" | "error";

export default function SignaturePage() {
  const {
    proposal,
    selections,
    updateProposal,
    pages,
    setCurrentPage,
    paymentCaptured,
  } = useProposal();

  const canvasRef = useRef<HTMLCanvasElement>(null);
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
      updateProposal({ status: "signed" });
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
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-lyp-cherry/20">
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
        </div>
        <h1 className="font-heading text-3xl md:text-5xl text-lyp-white mb-4">
          Agreement Signed
        </h1>
        <p className="font-body text-sm text-lyp-white/60 max-w-sm mb-8">
          This proposal has already been signed. If you need a copy of your
          contract, please contact your account manager.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
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
              Download Contract PDF
            </a>
          )}
          {paymentPageIndex !== -1 && !paymentCaptured && (
            <button
              onClick={() => setCurrentPage(paymentPageIndex)}
              className="inline-flex items-center gap-2 rounded-lg bg-lyp-cherry px-6 py-3 font-heading text-sm text-lyp-white transition-colors hover:bg-lyp-maroon justify-center"
            >
              Proceed to Payment
            </button>
          )}
        </div>
      </div>
    );
  }

  /* ---------------------------------------------------------------- */
  /*  Success state                                                   */
  /* ---------------------------------------------------------------- */

  if (signState === "signed") {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6 text-center">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-lyp-cherry/20">
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
        </div>
        <h1 className="font-heading text-3xl md:text-5xl text-lyp-white mb-4">
          Agreement Signed
        </h1>
        <p className="font-body text-sm text-lyp-white/60 max-w-sm mb-8">
          Thank you for signing. A copy of your contract has been generated.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
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
              Download Contract PDF
            </a>
          )}
          {paymentPageIndex !== -1 && !paymentCaptured && (
            <button
              onClick={() => setCurrentPage(paymentPageIndex)}
              className="inline-flex items-center gap-2 rounded-lg bg-lyp-cherry px-6 py-3 font-heading text-sm text-lyp-white transition-colors hover:bg-lyp-maroon justify-center"
            >
              Proceed to Payment
            </button>
          )}
        </div>
      </div>
    );
  }

  /* ---------------------------------------------------------------- */
  /*  Signing form                                                    */
  /* ---------------------------------------------------------------- */

  const noSelections = selections.length === 0;

  return (
    <div className="flex h-full flex-col px-6 py-8 md:px-16 lg:px-24">
      <h1 className="font-heading text-3xl md:text-5xl text-lyp-white mb-2">
        Sign Your Agreement
      </h1>
      <p className="font-body text-sm text-lyp-white/50 mb-6">
        Review and sign to confirm your selected services.
      </p>

      {noSelections ? (
        <div className="flex flex-1 flex-col items-center justify-center">
          <p className="font-body text-lyp-white/40 text-lg">
            No services selected.
          </p>
          <p className="font-body text-lyp-white/30 text-sm mt-2">
            Go back and select at least one service before signing.
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-6">
          {/* Email */}
          <div>
            <label
              htmlFor="signer-email"
              className="block font-body text-sm text-lyp-white/70 mb-2"
            >
              Your email address
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
          </div>

          {/* Signature canvas */}
          <div>
            <p className="font-body text-sm text-lyp-white/70 mb-2">
              Draw your signature below
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
              Clear signature
            </button>
          </div>

          {/* Agreement text */}
          <p className="font-body text-xs text-lyp-white/40 max-w-md leading-relaxed">
            By clicking &ldquo;I Agree &amp; Sign&rdquo; you confirm that you
            have reviewed the selected services and pricing, and agree to the
            terms and conditions outlined in this proposal.
          </p>

          {/* Error */}
          {signState === "error" && errorMsg && (
            <div className="rounded-lg border border-lyp-cherry/30 bg-lyp-cherry/10 px-4 py-3 max-w-md">
              <p className="font-body text-sm text-lyp-cherry">{errorMsg}</p>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3 max-w-md">
            <button
              type="button"
              onClick={handleSign}
              disabled={!hasDrawn || !email || signState === "signing"}
              className="flex-1 rounded-lg bg-lyp-cherry px-6 py-4 font-heading text-lg text-lyp-white transition-colors hover:bg-lyp-maroon disabled:opacity-40 disabled:cursor-not-allowed"
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
                  Signing...
                </span>
              ) : (
                "I Agree & Sign"
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
