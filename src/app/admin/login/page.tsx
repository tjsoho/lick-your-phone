import Image from "next/image";
import { CreditCard, FileText, PenLine } from "lucide-react";
import LoginForm from "@/components/admin/login-form";

/**
 * Optional photo behind the brand panel. Drop a file into /public and set the
 * path here (e.g. "/images/login-cover.jpg") to layer it under the bloom.
 */
const BRAND_IMAGE: string | null = null;

const highlights = [
  {
    icon: FileText,
    title: "Branded proposals",
    description: "Client-ready in minutes, not evenings.",
  },
  {
    icon: PenLine,
    title: "Intake and signature",
    description: "Details and sign-off in a single flow.",
  },
  {
    icon: CreditCard,
    title: "Payment on approval",
    description: "Deposits captured the moment it's accepted.",
  },
];

export default function Login() {
  return (
    <main className="min-h-dvh bg-lyp-white lg:grid lg:grid-cols-[1.06fr_1fr]">
      {/* ─────────────── Brand panel ─────────────── */}
      <section className="auth-bloom relative hidden overflow-hidden px-12 py-16 lg:flex xl:px-20 xl:py-20">
        {BRAND_IMAGE && (
          <Image
            src={BRAND_IMAGE}
            alt=""
            fill
            priority
            sizes="(min-width: 1024px) 55vw, 0px"
            className="object-cover opacity-[0.18]"
          />
        )}

        {/* Film grain for a printed, editorial feel */}
        <div
          aria-hidden
          className="auth-grain pointer-events-none absolute inset-0 opacity-[0.05] mix-blend-overlay"
        />

        <div className="relative z-10 mx-auto flex w-full max-w-[29rem] flex-col justify-between">
          {/* Wordmark lockup */}
          <div className="animate-rise flex items-center gap-3.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-lyp-white/10 font-heading text-base font-bold text-lyp-white ring-1 ring-lyp-white/20">
              L
            </span>
            <span>
              <span className="block font-heading text-lg font-bold leading-none tracking-tight text-lyp-white">
                LickYourPhone
              </span>
              <span className="mt-1.5 block font-body text-[9px] font-medium uppercase tracking-[0.3em] text-lyp-gold/60">
                Admin Console
              </span>
            </span>
          </div>

          <div>
            <h1
              className="animate-rise font-heading text-[42px] font-bold leading-[1.03] tracking-[-0.03em] text-lyp-white xl:text-[52px]"
              style={{ animationDelay: "140ms" }}
            >
              Every client,
              <span className="block text-[#f0c9c9]">
                first pitch to paid.
              </span>
            </h1>

            <p
              className="animate-rise mt-6 max-w-[21rem] font-body text-[15px] leading-[1.7] text-lyp-white/55"
              style={{ animationDelay: "200ms" }}
            >
              The whole onboarding experience, gathered behind one login.
            </p>

            {/* Hairline-separated list, no heavy container */}
            <ul
              className="animate-rise mt-10 space-y-px"
              style={{ animationDelay: "260ms" }}
            >
              {highlights.map(({ icon: Icon, title, description }) => (
                <li
                  key={title}
                  className="group flex items-center gap-5 border-t border-lyp-white/[0.09] py-4 last:border-b"
                >
                  <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-lyp-white/[0.06] ring-1 ring-lyp-white/[0.12] transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-105">
                    <Icon
                      strokeWidth={1}
                      className="h-[18px] w-[18px] text-[#f0c9c9]"
                    />
                  </span>
                  <div className="min-w-0">
                    <p className="font-body text-[14px] font-semibold tracking-tight text-lyp-white/95">
                      {title}
                    </p>
                    <p className="mt-1 font-body text-[13px] text-lyp-white/40">
                      {description}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <p
            className="animate-rise font-body text-[11px] tracking-[0.1em] text-lyp-white/30"
            style={{ animationDelay: "320ms" }}
          >
            © {new Date().getFullYear()} LickYourPhone — authorised access only.
          </p>
        </div>
      </section>

      {/* ─────────────── Form panel ─────────────── */}
      <section className="relative flex min-h-dvh items-center justify-center bg-lyp-white px-6 py-16 sm:px-10 lg:min-h-0">
        <div className="w-full max-w-[25rem]">
          {/* Stands in for the brand panel below lg */}
          <div className="animate-rise mb-12 flex items-center justify-center gap-3.5 lg:hidden">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-lyp-cherry font-heading text-base font-bold text-lyp-white">
              L
            </span>
            <span className="font-heading text-lg font-bold tracking-tight text-lyp-black">
              LickYourPhone
            </span>
          </div>

          <LoginForm />
        </div>
      </section>
    </main>
  );
}
