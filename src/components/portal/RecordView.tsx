"use client";

import { useEffect, useRef } from "react";

/**
 * Tells the dashboard that the client has the proposal open, and how far they
 * have read.
 *
 * Mounted once by the carousel. It reports the first slide on arrival and
 * then each new furthest slide — not every move, because paging back and
 * forth between two slides is one piece of information, not twenty.
 *
 * `keepalive` matters: the last report usually races the tab closing, which is
 * exactly the moment the agency most wants recorded.
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

  useEffect(() => {
    if (reportedRef.current !== null && currentPage <= reportedRef.current) {
      return;
    }
    reportedRef.current = currentPage;

    try {
      void fetch("/api/portal/viewed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, page: currentPage }),
        keepalive: true,
      }).catch(() => {
        // A failed report is not the client's problem.
      });
    } catch {
      // Same.
    }
  }, [token, currentPage]);

  return null;
}
