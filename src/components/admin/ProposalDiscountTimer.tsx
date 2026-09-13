"use client";

import { useEffect, useState } from "react";
import { Timer } from "lucide-react";
import toast from "react-hot-toast";
import { Switch } from "@/components/ui/switch";
import SaveStatusBadge from "@/components/admin/SaveStatusBadge";
import type { SaveStatus } from "@/hooks/use-autosave";
import { setDiscountTimer } from "@/server-actions/proposal-timer";
import { formatRemaining } from "@/lib/countdown";

const EASE = "ease-brand";

/** datetime-local speaks the viewer's local time with no zone; the database speaks UTC. */
function toLocalInput(iso: string | null) {
  if (!iso) return "";
  const date = new Date(iso);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
}

type Props = {
  proposalId: string;
  initialActive: boolean;
  initialExpiresAt: string | null;
  /** Signed or replaced proposals have nothing left to count down to. */
  locked: boolean;
};

export default function ProposalDiscountTimer({
  proposalId,
  initialActive,
  initialExpiresAt,
  locked,
}: Props) {
  const [active, setActive] = useState(initialActive);
  const [expiresAt, setExpiresAt] = useState(initialExpiresAt);
  const [draft, setDraft] = useState(toLocalInput(initialExpiresAt));
  const [status, setStatus] = useState<SaveStatus>("idle");
  // Null until mounted, so the server render never disagrees with the clock.
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  async function save(patch: { active?: boolean; expiresAt?: string }) {
    setStatus("saving");
    const { data, error } = await setDiscountTimer(proposalId, patch);
    if (error || !data) {
      setStatus("error");
      toast.error(error ?? "Couldn't save the timer.");
      return false;
    }
    setActive(data.active);
    setExpiresAt(data.expiresAt);
    setDraft(toLocalInput(data.expiresAt));
    setStatus("saved");
    return true;
  }

  async function handleToggle(next: boolean) {
    const previous = active;
    setActive(next);
    if (!(await save({ active: next }))) setActive(previous);
  }

  function commitDraft() {
    if (!draft || draft === toLocalInput(expiresAt)) return;
    const date = new Date(draft);
    if (Number.isNaN(date.getTime())) return;
    void save({ expiresAt: date.toISOString() });
  }

  const remaining =
    expiresAt && now != null ? new Date(expiresAt).getTime() - now : null;

  return (
    <section
      className="animate-rise mb-6 rounded-2xl border border-[#EFE6E6] bg-lyp-white p-5 sm:p-6"
      style={{ animationDelay: "60ms" }}
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-lyp-cherry/[0.06] ring-1 ring-lyp-cherry/10">
            <Timer strokeWidth={1.25} className="h-4 w-4 text-lyp-cherry" />
          </span>
          <div className="min-w-0">
            <label
              htmlFor="discount-timer"
              className="font-heading text-[15px] font-bold tracking-[-0.01em] text-lyp-black"
            >
              Activate Timer
            </label>
            <p className="mt-0.5 font-body text-[12.5px] leading-relaxed text-[#8A7A7A]">
              {locked
                ? "The countdown stops once the client has signed."
                : active
                  ? "The client sees discounted prices and a countdown until the discount ends."
                  : "Off: the client sees full prices. Switch on to apply the discount with a countdown."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <SaveStatusBadge status={status} />
          <Switch
            id="discount-timer"
            checked={active}
            disabled={locked || status === "saving"}
            onCheckedChange={handleToggle}
            className="data-[state=checked]:bg-lyp-cherry data-[state=unchecked]:bg-[#EFE6E6]"
          />
        </div>
      </div>

      {active && (
        <div className="mt-5 flex flex-wrap items-end gap-x-8 gap-y-4 border-t border-[#F1E8E8] pt-5">
          <div>
            <label
              htmlFor="discount-ends"
              className="block font-body text-[10px] font-medium uppercase tracking-[0.2em] text-[#A89898]"
            >
              Discount ends
            </label>
            <input
              id="discount-ends"
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

          {remaining != null && (
            <div className="pb-2.5">
              <span className="block font-body text-[10px] font-medium uppercase tracking-[0.2em] text-[#A89898]">
                Client sees
              </span>
              <span className="mt-1 block font-body text-[13px] font-medium tabular-nums text-lyp-black">
                {remaining > 0
                  ? `Ends in ${formatRemaining(remaining)}`
                  : "Ended — the countdown is no longer shown"}
              </span>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
