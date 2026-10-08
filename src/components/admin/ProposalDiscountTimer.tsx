"use client";

import { useEffect, useState } from "react";
import { Timer } from "lucide-react";
import toast from "react-hot-toast";
import { Switch } from "@/components/ui/switch";
import SaveStatusBadge from "@/components/admin/SaveStatusBadge";
import type { SaveStatus } from "@/hooks/use-autosave";
import {
  setDiscountTimer,
  type DiscountTimerPatch,
} from "@/server-actions/proposal-timer";
import { formatRemaining } from "@/lib/countdown";
import { cn } from "@/lib/utils";

const EASE = "ease-brand";

/** datetime-local speaks the viewer's local time with no zone; the database speaks UTC. */
function toLocalInput(iso: string | null) {
  if (!iso) return "";
  const date = new Date(iso);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
}

/** "" clears the field; an unparseable draft is ignored rather than saved. */
function toIso(draft: string): string | null | undefined {
  if (draft === "") return null;
  const date = new Date(draft);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function whenLabel(iso: string) {
  return new Date(iso).toLocaleString("en-AU", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

type Props = {
  proposalId: string;
  initialActive: boolean;
  /** When the discount switches itself on. Null means "as soon as it is on". */
  initialStartsAt?: string | null;
  initialExpiresAt: string | null;
  /** Signed or replaced proposals have nothing left to count down to. */
  locked: boolean;
  /**
   * `card` stands on its own; `row` sits inside a proposal card elsewhere;
   * `step` is bare, for the send step on the proposal page which brings its
   * own card around the timer and the send button together.
   */
  variant?: "card" | "row" | "step";
};

export default function ProposalDiscountTimer({
  proposalId,
  initialActive,
  initialStartsAt = null,
  initialExpiresAt,
  locked,
  variant = "card",
}: Props) {
  // A client page lists several proposals, so ids have to be unique per proposal.
  const switchId = `discount-timer-${proposalId}`;
  const startsId = `discount-starts-${proposalId}`;
  const endsId = `discount-ends-${proposalId}`;
  const isRow = variant === "row";
  const isStep = variant === "step";
  const [active, setActive] = useState(initialActive);
  const [startsAt, setStartsAt] = useState(initialStartsAt);
  const [expiresAt, setExpiresAt] = useState(initialExpiresAt);
  const [startDraft, setStartDraft] = useState(toLocalInput(initialStartsAt));
  const [draft, setDraft] = useState(toLocalInput(initialExpiresAt));
  const [status, setStatus] = useState<SaveStatus>("idle");
  // Null until mounted, so the server render never disagrees with the clock.
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  async function save(patch: DiscountTimerPatch) {
    setStatus("saving");
    const { data, error } = await setDiscountTimer(proposalId, patch);
    if (error || !data) {
      setStatus("error");
      toast.error(error ?? "Couldn't save the timer.");
      return false;
    }
    setActive(data.active);
    setStartsAt(data.startsAt);
    setExpiresAt(data.expiresAt);
    setStartDraft(toLocalInput(data.startsAt));
    setDraft(toLocalInput(data.expiresAt));
    setStatus("saved");
    return true;
  }

  async function handleToggle(next: boolean) {
    const previous = active;
    setActive(next);
    if (!(await save({ active: next }))) setActive(previous);
  }

  function commitStart() {
    if (startDraft === toLocalInput(startsAt)) return;
    const value = toIso(startDraft);
    if (value === undefined) return;
    void save({ startsAt: value });
  }

  function commitDraft() {
    if (draft === toLocalInput(expiresAt)) return;
    const value = toIso(draft);
    if (value === undefined) return;
    // The end is what the countdown counts to, so refuse to clear it outright.
    if (value === null) {
      setDraft(toLocalInput(expiresAt));
      return;
    }
    void save({ expiresAt: value });
  }

  const startMs = startsAt ? new Date(startsAt).getTime() : null;
  const endMs = expiresAt ? new Date(expiresAt).getTime() : null;
  const pending = startMs != null && now != null && now < startMs;
  const remaining = endMs != null && now != null ? endMs - now : null;
  /** Switched on, but its window has already closed — so nothing is running. */
  const finished = remaining != null && remaining <= 0;

  // Said the way the agency reads it: scheduled, running, or over.
  let clientSees: string | null = null;
  if (now != null) {
    if (pending && startsAt) {
      clientSees = `Full prices until ${whenLabel(startsAt)}`;
    } else if (remaining != null) {
      clientSees =
        remaining > 0
          ? `Ends in ${formatRemaining(remaining)}`
          : "Ended — the countdown is no longer shown";
    }
  }

  return (
    <section
      className={
        isStep
          ? ""
          : isRow
            ? "border-t border-[#F1E8E8] px-5 py-4"
            : "animate-rise mb-6 rounded-2xl border border-[#EFE6E6] bg-lyp-white p-5 sm:p-6"
      }
      style={isRow || isStep ? undefined : { animationDelay: "60ms" }}
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          {/* The send banner heads this step itself, icon, title and status
              pill included, so the step form drops its own title row rather
              than saying "Discount timer" twice in eight lines. */}
          {!isStep && (
            <span
              className={cn(
                "flex flex-shrink-0 items-center justify-center rounded-full bg-lyp-cherry/[0.06] ring-1 ring-lyp-cherry/10",
                isRow ? "h-8 w-8" : "h-9 w-9",
              )}
            >
              <Timer strokeWidth={1.25} className="h-4 w-4 text-lyp-cherry" />
            </span>
          )}
          <div className="min-w-0">
            {!isStep && (
              <label
                htmlFor={switchId}
                className={`font-heading font-bold tracking-[-0.01em] text-lyp-black ${isRow ? "text-[13.5px]" : "text-[15px]"}`}
              >
                Discount timer
              </label>
            )}
            <p
              className={cn(
                "font-body text-[12.5px] leading-relaxed text-[#6B5A5A]",
                !isStep && "mt-0.5",
              )}
            >
              {/* Locked covers both signed and replaced, so it says neither —
                  the heading above it already names which. */}
              {locked
                ? "Locked: the countdown has stopped and the prices can no longer change."
                : !active
                  ? "Off: the client sees full prices. Switch on to run the discount over a set window."
                  : pending
                    ? "Scheduled: the client sees full prices until the discount starts, then the countdown appears."
                    : finished
                      ? "Ended: the window has closed, so the client sees full prices. Set a new one below."
                      : "Running: the client sees discounted prices and a countdown until the discount ends."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <SaveStatusBadge status={status} />
          {/* The deck's warning banner tells them to switch on "Activate
              Timer", so the switch wears that name rather than leaving them
              hunting for a control nothing is called. */}
          <label
            htmlFor={switchId}
            className="cursor-pointer whitespace-nowrap font-body text-[10px] font-medium uppercase tracking-[0.18em] text-[#867474]"
          >
            Activate timer
          </label>
          <Switch
            id={switchId}
            aria-label="Activate timer"
            checked={active}
            disabled={locked || status === "saving"}
            onCheckedChange={handleToggle}
            className="data-[state=checked]:bg-lyp-cherry data-[state=unchecked]:bg-[#EFE6E6]"
          />
        </div>
      </div>

      {active && (
        <div
          className={cn(
            "border-t",
            isStep ? "border-lyp-cherry/10" : "border-[#F1E8E8]",
            isRow ? "mt-4 pt-4" : "mt-5 pt-5",
          )}
        >
          <div className="flex flex-wrap items-end gap-x-8 gap-y-4">
            <div>
              <label
                htmlFor={startsId}
                className="block font-body text-[10px] font-medium uppercase tracking-[0.2em] text-[#867474]"
              >
                Discount starts
              </label>
              <input
                id={startsId}
                type="datetime-local"
                value={startDraft}
                disabled={locked}
                onChange={(e) => setStartDraft(e.target.value)}
                onBlur={commitStart}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitStart();
                }}
                className={`mt-2 rounded-xl border border-[#EFE6E6] bg-lyp-white px-3.5 py-2.5 font-body text-[13px] tabular-nums text-lyp-black transition-colors duration-500 ${EASE} focus:border-lyp-cherry/40 focus:outline-none disabled:opacity-60`}
              />
            </div>

            <div>
              <label
                htmlFor={endsId}
                className="block font-body text-[10px] font-medium uppercase tracking-[0.2em] text-[#867474]"
              >
                Discount ends
              </label>
              <input
                id={endsId}
                type="datetime-local"
                value={draft}
                disabled={locked}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={commitDraft}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitDraft();
                }}
                className={`mt-2 rounded-xl border border-[#EFE6E6] bg-lyp-white px-3.5 py-2.5 font-body text-[13px] tabular-nums text-lyp-black transition-colors duration-500 ${EASE} focus:border-lyp-cherry/40 focus:outline-none disabled:opacity-60`}
              />
            </div>

            {clientSees && (
              <div className="pb-2.5">
                <span className="block font-body text-[10px] font-medium uppercase tracking-[0.2em] text-[#867474]">
                  Client sees
                </span>
                <span className="mt-1 block font-body text-[13px] font-medium tabular-nums text-lyp-black">
                  {clientSees}
                </span>
              </div>
            )}
          </div>

          <p className="mt-3 font-body text-[11px] leading-relaxed text-[#867474]">
            Leave the start blank to run the discount from now. Set it to send
            the proposal in a meeting and have the offer open later — until
            then the client sees full prices with no countdown.
          </p>
        </div>
      )}
    </section>
  );
}
