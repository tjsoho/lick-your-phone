"use client";

import login from "@/server-actions/admin";
import { ArrowRight, Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";
import { useState } from "react";

const EASE = "ease-[cubic-bezier(0.32,0.72,0,1)]";

const inputClasses = `w-full rounded-2xl border border-[#EFE6E6] bg-[#FBF8F8] px-5 py-3.5 font-body text-[15px] text-lyp-black outline-none transition-all duration-500 ${EASE} placeholder:text-[#C3B5B5] hover:border-[#E2D2D2] focus:border-lyp-cherry/40 focus:bg-lyp-white focus:shadow-[0_0_0_4px_rgba(178,38,38,0.07)] disabled:opacity-50`;

const labelClasses =
  "mb-2.5 block font-body text-[10px] font-medium uppercase tracking-[0.22em] text-[#A89898]";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setIsLoading(true);
    setError(null);
    const { error } = await login(email, password);

    if (error) {
      setError(error);
      setIsLoading(false);
      return;
    }

    setIsLoading(false);
  };

  return (
    <div className="animate-rise" style={{ animationDelay: "120ms" }}>
      <div className="flex items-center gap-4">
        <span className="h-px w-10 bg-lyp-cherry/30" />
        <span className="font-body text-[10px] font-medium uppercase tracking-[0.32em] text-lyp-cherry/70">
          Welcome back
        </span>
      </div>

      <h1 className="mt-6 font-heading text-[38px] font-bold leading-[1.05] tracking-[-0.03em] text-lyp-black">
        Sign in
      </h1>
      <p className="mt-3 font-body text-[14px] leading-relaxed text-[#8A7A7A]">
        Use your admin credentials to open the console.
      </p>

      {error && (
        <div
          role="alert"
          className="mt-7 flex items-start gap-3 rounded-2xl border border-lyp-cherry/15 bg-lyp-cherry/[0.04] px-4 py-3.5"
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

      <form
        className="mt-9 space-y-6"
        onSubmit={(e) => {
          e.preventDefault();
          handleLogin();
        }}
      >
        <div>
          <label htmlFor="email" className={labelClasses}>
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            disabled={isLoading}
            className={inputClasses}
            placeholder="you@lickyourphone.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="password" className={labelClasses}>
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              required
              autoComplete="current-password"
              disabled={isLoading}
              className={`${inputClasses} pr-14`}
              placeholder="••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className={`absolute inset-y-0 right-0 flex items-center px-5 text-[#C3B5B5] transition-colors duration-500 ${EASE} hover:text-lyp-cherry`}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff strokeWidth={1.25} className="h-[18px] w-[18px]" />
              ) : (
                <Eye strokeWidth={1.25} className="h-[18px] w-[18px]" />
              )}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className={`group mt-2 flex w-full items-center justify-between rounded-full bg-lyp-cherry py-2 pl-7 pr-2 font-body text-[14px] font-semibold tracking-wide text-lyp-white shadow-[0_10px_30px_-8px_rgba(178,38,38,0.45)] transition-all duration-500 ${EASE} hover:bg-[#c22e2e] hover:shadow-[0_14px_38px_-8px_rgba(178,38,38,0.55)] active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-60`}
        >
          <span>{isLoading ? "Signing in" : "Sign in"}</span>
          <span
            className={`flex h-10 w-10 items-center justify-center rounded-full bg-white/15 transition-transform duration-500 ${EASE} group-hover:translate-x-0.5 group-hover:scale-105`}
          >
            {isLoading ? (
              <Loader2 strokeWidth={1.5} className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowRight strokeWidth={1.5} className="h-4 w-4" />
            )}
          </span>
        </button>
      </form>
    </div>
  );
}
