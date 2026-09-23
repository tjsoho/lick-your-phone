"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { splitRemaining } from "@/lib/countdown";
import { cn } from "@/lib/utils";
import { useCopy } from "./ProposalContext";

/** setTimeout overflows past ~24.8 days, so long timers re-check in steps. */
const MAX_TIMEOUT = 2 ** 31 - 1;

/**
 * Whether the countdown should be on screen right now. Flips off by itself at
 * the deadline with a single timeout, so the carousel isn't re-rendered every
 * second just to find that out.
 */
export function useDiscountTimerLive(
  active: boolean,
  expiresAt: string | null,
) {
  // Worked out on the first render too, so prices don't flash from full to
  // discounted as the page hydrates.
  const [live, setLive] = useState(
    () =>
      active && !!expiresAt && new Date(expiresAt).getTime() > Date.now(),
  );

  useEffect(() => {
    if (!active || !expiresAt) {
      setLive(false);
      return;
    }

    const end = new Date(expiresAt).getTime();
    let id: ReturnType<typeof setTimeout> | undefined;

    const check = () => {
      const left = end - Date.now();
      setLive(left > 0);
      if (left > 0) id = setTimeout(check, Math.min(left, MAX_TIMEOUT));
    };

    check();
    return () => clearTimeout(id);
  }, [active, expiresAt]);

  return live;
}

/** Ticking digits, e.g. 2d 04h 12m 09s. */
export function CountdownClock({
  expiresAt,
  className,
  unitClassName = "text-lyp-cherry",
}: {
  expiresAt: string;
  className?: string;
  unitClassName?: string;
}) {
  // Null on the server render, so the digits never mismatch on hydrate.
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const { days, hours, minutes, seconds } = splitRemaining(
    now == null ? 0 : new Date(expiresAt).getTime() - now,
  );

  const units = [
    ...(days > 0 ? [{ value: days, label: "d" }] : []),
    { value: hours, label: "h" },
    { value: minutes, label: "m" },
    { value: seconds, label: "s" },
  ];

  return (
    <span
      className={cn(
        "whitespace-nowrap font-heading tabular-nums text-lyp-white",
        className,
      )}
    >
      {units.map((unit) => (
        <span key={unit.label} className="ml-1.5 first:ml-0">
          {now == null ? "--" : String(unit.value).padStart(2, "0")}
          <span className={unitClassName}>{unit.label}</span>
        </span>
      ))}
    </span>
  );
}

/**
 * Slim bar pinned above the slides: how long the client's discount has left.
 *
 * It reads as an alert, not as a caption. This used to be small grey type on
 * the near-black portal ground, which is the one thing on screen the client
 * was meant to notice and the one thing they didn't. Cherry ground, white
 * weight, digits at body size — still ONE slim bar, because the carousel
 * reserves its height (44px) from a slide that must never scroll.
 */
export default function DiscountCountdown({
  expiresAt,
  className,
}: {
  expiresAt: string;
  className?: string;
}) {
  const t = useCopy("global");

  return (
    <div
      role="timer"
      className={cn(
        "portal-reveal portal-reveal-fall flex h-11 items-center justify-center gap-2.5 border-b border-lyp-white/15 bg-lyp-cherry px-4 shadow-[0_10px_26px_-14px_rgba(178,38,38,0.9)] sm:gap-3.5",
        className,
      )}
    >
      <Clock
        strokeWidth={2.25}
        className="h-4 w-4 flex-shrink-0 text-lyp-white"
      />
      <span className="whitespace-nowrap font-body text-[11px] font-semibold uppercase tracking-[0.18em] text-lyp-white sm:text-[12px]">
        <span className="hidden sm:inline">{t("discountEndsIn")}</span>
        <span className="sm:hidden">{t("discountEndsInShort")}</span>
      </span>
      <CountdownClock
        expiresAt={expiresAt}
        className="text-[17px] font-bold sm:text-lg"
        // Smaller, lighter unit letters so the numbers carry the bar.
        unitClassName="ml-px text-[11px] font-semibold text-lyp-white/70"
      />
    </div>
  );
}
