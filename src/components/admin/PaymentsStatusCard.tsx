import { CheckCircle2, CreditCard, TriangleAlert } from "lucide-react";
import { pinchEnvironment } from "@/lib/pinch";

/**
 * WHICH PINCH THIS SITE IS TALKING TO, STATED PLAINLY AND ALWAYS.
 *
 * Pinch picks its environment off the address alone. `/test` and `/live`
 * take the same credentials and answer identically, and nothing in a reply
 * says which one you reached, so the only way anybody finds out is if
 * something looks.
 *
 * It is shown whether it is right or wrong, not only when it is wrong. A
 * warning that appears on a fault is a warning nobody can use to confirm
 * things are fine, and "is it on live yet" is a question somebody will ask
 * again every time a key changes.
 */
export default function PaymentsStatusCard() {
  const env = pinchEnvironment();
  const live = env === "live";

  const tone = live
    ? {
        border: "border-[#CFE3D5]",
        bg: "bg-[#F3F9F4]",
        head: "text-[#2F5A3E]",
        body: "text-[#3F6B4E]",
        icon: "text-[#4A7A5C]",
      }
    : {
        border: "border-[#D32020]/25",
        bg: "bg-[#FDECEC]",
        head: "text-[#8A1A1A]",
        body: "text-[#9A3535]",
        icon: "text-[#D32020]",
      };

  const heading = live
    ? "Payment details go to your real Pinch account"
    : env === "test"
      ? "Payment details are going to a Pinch sandbox"
      : "Pinch is not pointed at either environment";

  const detail = live
    ? "Anything a client enters on the payment slide is held by Pinch against your live merchant account, and shows up in your Pinch dashboard."
    : env === "test"
      ? "PINCH_API_URL ends in /test. Every card and bank account a client enters is stored in Pinch's test environment. It will never appear in your Pinch dashboard and it can never be charged."
      : "PINCH_API_URL does not end in /test or /live, so it is not clear where payment details are going.";

  return (
    <section
      className={`mt-8 rounded-3xl border ${tone.border} ${tone.bg} px-6 py-5`}
    >
      <div className="flex items-center gap-2.5">
        <CreditCard strokeWidth={1.75} className={`h-4 w-4 ${tone.icon}`} />
        <h2 className={`font-body text-[13px] font-semibold ${tone.head}`}>
          Payments
        </h2>
      </div>

      <div className="mt-3.5 flex items-start gap-3">
        {live ? (
          <CheckCircle2
            strokeWidth={1.75}
            className={`mt-px h-4 w-4 flex-shrink-0 ${tone.icon}`}
          />
        ) : (
          <TriangleAlert
            strokeWidth={1.75}
            className={`mt-px h-4 w-4 flex-shrink-0 ${tone.icon}`}
          />
        )}
        <div>
          <p className={`font-body text-[13px] font-semibold ${tone.head}`}>
            {heading}
          </p>
          <p className={`mt-1 font-body text-[12px] leading-relaxed ${tone.body}`}>
            {detail}
          </p>
          {!live && (
            <p className={`mt-2 font-body text-[12px] leading-relaxed ${tone.body}`}>
              Set PINCH_API_URL to https://api.getpinch.com.au/live with live
              credentials from the Pinch developer portal, then redeploy.
            </p>
          )}
        </div>
      </div>

      <p className="mt-4 border-t border-black/[0.06] pt-3 font-body text-[11px] text-[#867474]">
        Environment in use: <strong>{env}</strong>
      </p>
    </section>
  );
}
