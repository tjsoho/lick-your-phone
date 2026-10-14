"use client";

import { useEffect, useRef } from "react";

/**
 * Tells the dashboard that the client has the proposal open, how far they
 * have read, and how long they lingered on each slide.
 *
 * Mounted once by the carousel. Two separate things are reported:
 *
 *   - ARRIVAL AND REACH. The first slide on arrival, then each new furthest
 *     slide. Not every move, because paging back and forth between two
 *     slides is one piece of information, not twenty.
 *
 *   - TIME. How many seconds they were on the slide they are leaving. This
 *     is what the agency asked for after PandaDoc: "a heat map showing which
 *     pages the client spends the most time on." Accumulated server side, so
 *     a second read of the pricing adds to the first rather than replacing
 *     it.
 *
 * `keepalive` matters on both: the last report usually races the tab closing,
 * which is exactly the moment the agency most wants recorded.
 */
export default function RecordView({
  token,
  currentPage,
}: {
  token: string;
  currentPage: number;
}) {
  /** The furthest slide already reported, so we only speak when it changes. */
  const reportedRef = useRef<number | null>(null);
  /** The slide being timed, and when the clock on it started. */
  const timingRef = useRef<{ page: number; since: number } | null>(null);

  useEffect(() => {
    /**
     * Close off the slide we were on and send its seconds.
     *
     * Anything under two seconds is dropped: paging through to slide nine
     * passes over eight slides nobody read, and counting those would flatten
     * the heat map into noise. Anything over twenty minutes is dropped too,
     * because that is a tab left open over lunch, not attention.
     */
    function flush(page: number, since: number) {
      const seconds = Math.round((Date.now() - since) / 1000);
      if (seconds < 2 || seconds > 1200) return;
      send({ page, seconds });
    }

    function send(body: { page: number; seconds?: number }) {
      try {
        void fetch("/api/portal/viewed", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, ...body }),
          keepalive: true,
        }).catch(() => {
          // A failed report is not the client's problem.
        });
      } catch {
        // Same.
      }
    }

    // The slide changed: bank the time on the one we just left.
    const previous = timingRef.current;
    if (previous && previous.page !== currentPage) {
      flush(previous.page, previous.since);
    }
    timingRef.current = { page: currentPage, since: Date.now() };

    // Every move is reported, in both directions. It used to report only when
    // the number grew, which was right while the only question was "how far
    // did they get?". Reopening the deck where they left off asks a different
    // question, and a client who reads to slide ten, pages back to the pricing
    // and closes the tab left on the pricing. The server keeps both: this moves
    // `last_page` either way, and `furthest_page` still only climbs.
    if (reportedRef.current !== currentPage) {
      reportedRef.current = currentPage;
      send({ page: currentPage });
    }
  }, [token, currentPage]);

  // Leaving the page altogether, or putting the tab in the background, is the
  // other end of a slide's time. `visibilitychange` is the reliable one on a
  // phone, where `beforeunload` often never fires.
  useEffect(() => {
    function bank() {
      const open = timingRef.current;
      if (!open) return;
      const seconds = Math.round((Date.now() - open.since) / 1000);
      timingRef.current = { page: open.page, since: Date.now() };
      if (seconds < 2 || seconds > 1200) return;
      try {
        void fetch("/api/portal/viewed", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, page: open.page, seconds }),
          keepalive: true,
        }).catch(() => {});
      } catch {
        // Nothing to do.
      }
    }

    function onVisibility() {
      if (document.visibilityState === "hidden") bank();
    }

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", bank);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", bank);
    };
  }, [token]);

  return null;
}
