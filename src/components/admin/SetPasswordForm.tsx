"use client";

import { useEffect, useState } from "react";
import { AlertCircle, ArrowRight, Check, Eye, EyeOff, Loader2 } from "lucide-react";
import { createClient } from "@/utils/client";

const EASE = "ease-brand";

const inputClasses = `w-full rounded-2xl border border-[#EFE6E6] bg-[#FBF8F8] px-5 py-3.5 pr-12 font-body text-[15px] text-lyp-black outline-none transition-all duration-500 ${EASE} placeholder:text-[#9C8C8C] hover:border-[#E2D2D2] focus:border-lyp-cherry/40 focus:bg-lyp-white focus:shadow-[0_0_0_4px_rgba(178,38,38,0.07)] disabled:opacity-50`;

const labelClasses =
  "mb-2.5 block font-body text-[10px] font-medium uppercase tracking-[0.22em] text-[#867474]";

/** Short enough to be remembered, long enough to be worth having. */
const MIN_LENGTH = 10;

export default function SetPasswordForm() {
  const [ready, setReady] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  /**
   * TURN WHATEVER THE LINK CARRIED INTO A SESSION.
   *
   * Supabase hands the tokens back in one of two shapes depending on how the
   * project is configured, so both are handled rather than guessing: a `code`
   * in the query string, or the tokens themselves in the fragment after the
   * hash. The fragment never reaches the server, which is the point of it.
   *
   * Either way the address bar is cleaned afterwards, so a password-setting
   * token is not left sitting in the browser's history.
   */
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const supabase = createClient();

      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");
        const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
        const accessToken = hash.get("access_token");
        const refreshToken = hash.get("refresh_token");
        const linkProblem = hash.get("error_description") || url.searchParams.get("error_description");

        if (linkProblem) {
          if (!cancelled) setLinkError(linkProblem);
          return;
        }

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) throw error;
        } else {
          // No token at all. Either somebody typed the address in, or the
          // browser client already picked the session up on its own.
          const { data } = await supabase.auth.getSession();
          if (!data.session) {
            if (!cancelled) {
              setLinkError(
                "This link has expired or has already been used. Ask whoever added you for a new one.",
              );
            }
            return;
          }
        }

        window.history.replaceState({}, "", window.location.pathname);
        if (!cancelled) setReady(true);
      } catch (err) {
        if (!cancelled) {
          setLinkError(
            (err as Error).message ||
              "This link did not work. Ask whoever added you for a new one.",
          );
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < MIN_LENGTH) {
      setError(`Use at least ${MIN_LENGTH} characters.`);
      return;
    }
    if (password !== confirm) {
      setError("Those two do not match.");
      return;
    }

    setSaving(true);
    const supabase = createClient();
    const { error: updateErr } = await supabase.auth.updateUser({ password });
    setSaving(false);

    if (updateErr) {
      setError(updateErr.message);
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <div className="mt-10 rounded-3xl border border-[#CFE3D5] bg-[#F3F9F4] px-6 py-7 text-center">
        <Check strokeWidth={1.75} className="mx-auto h-6 w-6 text-[#4A7A5C]" />
        <h1 className="mt-3 font-heading text-[22px] font-bold tracking-[-0.02em] text-[#2F5A3E]">
          Password set
        </h1>
        <p className="mt-2 font-body text-[13px] leading-relaxed text-[#3F6B4E]">
          You can sign in with it now.
        </p>
        <a
          href="/admin/login"
          className={`mt-5 inline-flex items-center gap-2.5 rounded-full bg-[#2F5A3E] px-6 py-3 font-body text-[13px] font-semibold text-lyp-white transition-all duration-500 ${EASE} hover:bg-[#25492F] active:scale-[0.985]`}
        >
          Go to sign in
          <ArrowRight strokeWidth={1.75} className="h-4 w-4" />
        </a>
      </div>
    );
  }

  if (linkError) {
    return (
      <div className="mt-10 rounded-3xl border border-lyp-cherry/15 bg-lyp-cherry/[0.04] px-6 py-7 text-center">
        <AlertCircle strokeWidth={1.5} className="mx-auto h-6 w-6 text-lyp-cherry" />
        <h1 className="mt-3 font-heading text-[22px] font-bold tracking-[-0.02em] text-lyp-black">
          That link did not work
        </h1>
        <p className="mt-2 font-body text-[13px] leading-relaxed text-[#6B5A5A]">
          {linkError}
        </p>
      </div>
    );
  }

  return (
    <div className="mt-10">
      <h1 className="text-center font-heading text-[28px] font-bold leading-[1.1] tracking-[-0.03em] text-lyp-black">
        Choose a password
      </h1>
      <p className="mt-2.5 text-center font-body text-[13px] leading-relaxed text-[#6B5A5A]">
        This is yours alone. Nobody at LickYourPhone can see it.
      </p>

      {error && (
        <div
          role="alert"
          className="mt-6 flex items-start gap-3 rounded-2xl border border-lyp-cherry/15 bg-lyp-cherry/[0.04] px-4 py-3.5"
        >
          <AlertCircle
            strokeWidth={1.25}
            className="mt-px h-4 w-4 flex-shrink-0 text-lyp-cherry"
          />
          <p className="font-body text-[13px] leading-snug text-lyp-cherry">
            {error}
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-7 space-y-5">
        <div>
          <label htmlFor="new-password" className={labelClasses}>
            New password
          </label>
          <div className="relative">
            <input
              id="new-password"
              type={show ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={!ready || saving}
              autoComplete="new-password"
              placeholder={`At least ${MIN_LENGTH} characters`}
              className={inputClasses}
            />
            <button
              type="button"
              onClick={() => setShow(!show)}
              title={show ? "Hide the password" : "Show the password"}
              aria-label={show ? "Hide password" : "Show password"}
              className={`absolute right-4 top-1/2 -translate-y-1/2 text-[#9C8C8C] transition-colors duration-500 ${EASE} hover:text-lyp-black`}
            >
              {show ? (
                <EyeOff strokeWidth={1.5} className="h-4 w-4" />
              ) : (
                <Eye strokeWidth={1.5} className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="confirm-password" className={labelClasses}>
            Type it again
          </label>
          <input
            id="confirm-password"
            type={show ? "text" : "password"}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            disabled={!ready || saving}
            autoComplete="new-password"
            className={inputClasses}
          />
        </div>

        <button
          type="submit"
          disabled={!ready || saving || !password || !confirm}
          className={`inline-flex w-full items-center justify-center gap-2.5 rounded-full bg-lyp-cherry px-6 py-3.5 font-body text-[14px] font-semibold tracking-wide text-lyp-white shadow-[0_10px_30px_-10px_rgba(178,38,38,0.5)] transition-all duration-500 ${EASE} hover:bg-[#c22e2e] active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none`}
        >
          {saving || !ready ? (
            <Loader2 strokeWidth={1.75} className="h-4 w-4 animate-spin" />
          ) : null}
          {!ready ? "Checking your link" : saving ? "Saving" : "Save password"}
        </button>
      </form>
    </div>
  );
}
