"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, CheckCircle2, CreditCard, ClipboardCheck, AlertCircle } from "lucide-react";
import {
  getNotifications,
  type NotificationItem,
} from "@/server-actions/notifications";
import { cn } from "@/lib/utils";

const EASE = "ease-brand";

/** How often to ask again while the dashboard is open. */
const POLL_MS = 60_000;

/**
 * Where "seen" is remembered. Per browser, deliberately: the agency asked for
 * a bell that tells them something has happened, not for a shared read state
 * they would have to keep in step across three people's screens.
 */
const SEEN_KEY = "lyp-notifications-seen";

/** One line per event, in the agency's words rather than the audit log's. */
const COPY: Record<
  string,
  { icon: typeof Bell; verb: string; tone: string }
> = {
  PROPOSAL_SIGNED: {
    icon: CheckCircle2,
    verb: "signed their agreement",
    tone: "text-[#2F7A4F] bg-[#2F7A4F]/[0.08]",
  },
  PAYMENT_CAPTURED: {
    icon: CreditCard,
    verb: "added their payment details",
    tone: "text-lyp-cherry bg-lyp-cherry/[0.08]",
  },
  INTAKE_COMPLETED: {
    icon: ClipboardCheck,
    verb: "completed their onboarding form",
    tone: "text-[#2F7A4F] bg-[#2F7A4F]/[0.08]",
  },
  PAYMENT_FAILED: {
    icon: AlertCircle,
    verb: "had a payment fail",
    tone: "text-lyp-cherry bg-lyp-cherry/[0.08]",
  },
};

function readSeen(): number {
  try {
    const raw = window.localStorage.getItem(SEEN_KEY);
    return raw ? Number(raw) || 0 : 0;
  } catch {
    // A private window has no memory of what was read; everything reads new,
    // which is the safe way round.
    return 0;
  }
}

function relative(iso: string): string {
  const then = new Date(iso).getTime();
  const mins = Math.max(0, Math.round((Date.now() - then) / 60_000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? "yesterday" : `${days}d ago`;
}

export default function NotificationBell() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [open, setOpen] = useState(false);
  const [seenAt, setSeenAt] = useState(0);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => setSeenAt(readSeen()), []);

  const load = useCallback(async () => {
    const { data } = await getNotifications();
    setItems(data);
  }, []);

  useEffect(() => {
    void load();
    const id = window.setInterval(load, POLL_MS);
    return () => window.clearInterval(id);
  }, [load]);

  // Clicking anywhere else closes it, as a menu should.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!panelRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const unread = items.filter(
    (item) => new Date(item.createdAt).getTime() > seenAt,
  ).length;

  const toggle = () => {
    const next = !open;
    setOpen(next);
    // Opening is the act of reading. Marking on close would leave the count
    // sitting there while they read, which looks broken.
    if (next) {
      const now = Date.now();
      setSeenAt(now);
      try {
        window.localStorage.setItem(SEEN_KEY, String(now));
      } catch {
        // Nothing to do: the count simply comes back next time.
      }
    }
  };

  return (
    <div ref={panelRef} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-label={
          unread > 0 ? `Notifications, ${unread} new` : "Notifications"
        }
        title={
          open
            ? "Hide recent activity"
            : unread > 0
              ? `Show recent activity, ${unread} new`
              : "Show recent activity"
        }
        className={cn(
          `relative flex h-9 w-9 items-center justify-center rounded-full border border-[#EFE6E6] bg-lyp-white text-[#6B5A5A] transition-colors duration-500 ${EASE}`,
          "hover:border-lyp-cherry/25 hover:text-lyp-cherry",
        )}
      >
        <Bell strokeWidth={1.5} className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-lyp-cherry px-1 font-body text-[9px] font-semibold tabular-nums text-lyp-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="animate-rise absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-[#EFE6E6] bg-lyp-white shadow-[0_24px_60px_-28px_rgba(0,0,0,0.3)]">
          <div className="border-b border-[#F1E8E8] px-4 py-3">
            <h2 className="font-heading text-[13px] font-bold tracking-[-0.01em] text-lyp-black">
              Activity
            </h2>
          </div>

          {items.length === 0 ? (
            <p className="px-4 py-6 text-center font-body text-[12.5px] text-[#867474]">
              Nothing yet. Signatures, payments and finished onboarding forms
              land here.
            </p>
          ) : (
            <ul className="max-h-80 overflow-y-auto">
              {items.map((item) => {
                const copy = COPY[item.action];
                if (!copy) return null;
                const Icon = copy.icon;
                const who =
                  item.clientName ?? item.venueName ?? "A client";
                return (
                  <li key={item.id} className="border-b border-[#F7F1F1] last:border-0">
                    <Link
                      href={`/admin/proposals/${item.proposalId}`}
                      onClick={() => setOpen(false)}
                      title={`Open ${who}'s proposal`}
                      className={`flex items-start gap-3 px-4 py-3 transition-colors duration-500 ${EASE} hover:bg-[#FBF8F8]`}
                    >
                      <span
                        className={cn(
                          "mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full",
                          copy.tone,
                        )}
                      >
                        <Icon strokeWidth={1.75} className="h-3.5 w-3.5" />
                      </span>
                      <span className="min-w-0">
                        <span className="block font-body text-[12.5px] text-lyp-black">
                          <span className="font-semibold">{who}</span>{" "}
                          {copy.verb}
                        </span>
                        <span className="mt-0.5 block font-body text-[11px] text-[#867474]">
                          {relative(item.createdAt)}
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
