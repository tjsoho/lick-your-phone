import { AlertTriangle } from "lucide-react";
import { pinchEnvironment, pinchIsMisconfigured } from "@/lib/pinch";

/**
 * SAYS IT OUT LOUD, ON EVERY PAGE.
 *
 * A sandbox that answers 200 is indistinguishable from the real thing unless
 * something checks. Nothing did, and clients' payment details went into a
 * test account for months with no error raised anywhere.
 *
 * Nothing but the live environment is acceptable on the live site, so on the
 * live site anything else is shouted about rather than logged.
 */
export default function PinchEnvironmentBanner() {
  if (!pinchIsMisconfigured()) return null;

  const env = pinchEnvironment();

  return (
    <div
      role="alert"
      className="mb-5 flex items-start gap-3 rounded-2xl border border-[#D32020]/25 bg-[#FDECEC] px-4 py-3.5"
    >
      <AlertTriangle
        strokeWidth={1.75}
        className="mt-px h-4 w-4 flex-shrink-0 text-[#D32020]"
      />
      <div>
        <p className="font-body text-[13px] font-semibold text-[#8A1A1A]">
          Payments are going to a Pinch sandbox, not your real account
        </p>
        <p className="mt-1 font-body text-[12px] leading-relaxed text-[#9A3535]">
          {env === "test"
            ? "PINCH_API_URL ends in /test, so every card and bank account a client enters is stored in Pinch's test environment. It will not appear in your Pinch dashboard and nothing can ever be charged."
            : "PINCH_API_URL is not set to a Pinch environment, so payment details may not be stored at all."}{" "}
          Set it to https://api.getpinch.com.au/live, with live credentials, and
          redeploy.
        </p>
      </div>
    </div>
  );
}
