"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** The slide is rendered at desktop size and scaled down, so proportions
 *  stay honest — the same technique the page editor's live preview uses. */
const FRAME = { width: 1440, height: 900 };

/** How far outside the viewport a card counts as "worth loading". */
const NEAR_MARGIN = "400px 0px";

/** A slide is a whole portal page — animated backdrop and all — so only a
 *  handful may be fetching at once or a 25-page deck locks up the tab. */
const MAX_CONCURRENT_LOADS = 3;

/** Frames that never fire `load` would hold their slot forever. */
const LOAD_TIMEOUT_MS = 8000;

type LoadTask = { start: () => void; started: boolean; done: boolean };

let inFlight = 0;
const queue: LoadTask[] = [];

function pump() {
  while (inFlight < MAX_CONCURRENT_LOADS && queue.length > 0) {
    const task = queue.shift();
    if (!task || task.done) continue;
    task.started = true;
    inFlight += 1;
    task.start();
  }
}

/**
 * Queues one iframe mount. The returned function gives the slot back — call
 * it once the frame has loaded (so the next one may start) and again on
 * unmount; the second call is a no-op.
 */
function requestLoadSlot(start: () => void) {
  const task: LoadTask = { start, started: false, done: false };
  queue.push(task);
  pump();

  return () => {
    if (task.done) return;
    task.done = true;
    if (task.started) {
      inFlight -= 1;
      pump();
    }
  };
}

type Props = {
  pageId: string;
  /** Renders the slide with this proposal's names and discounts. */
  proposalId: string;
  title: string;
  /** Hidden slides are dimmed rather than removed, so they stay recoverable. */
  dimmed?: boolean;
};

/**
 * A live, shrunk-down render of one real client slide.
 *
 * The frame is only mounted while the card is near the viewport, and mounts
 * are queued so a long deck loads a few at a time instead of all at once.
 */
export default function ProposalDeckThumbnail({
  pageId,
  proposalId,
  title,
  dimmed = false,
}: Props) {
  const shellRef = useRef<HTMLDivElement | null>(null);
  const releaseRef = useRef<(() => void) | null>(null);

  const [near, setNear] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [scale, setScale] = useState(0);

  /* Scale the desktop frame down to whatever width the card ended up with. */
  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) return;

    const measure = () => {
      const width = shell.clientWidth;
      if (width > 0) setScale(width / FRAME.width);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(shell);
    return () => observer.disconnect();
  }, []);

  /* Only cards close to the viewport are worth rendering. */
  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) return;

    const observer = new IntersectionObserver(
      ([entry]) => setNear(entry.isIntersecting),
      { rootMargin: NEAR_MARGIN },
    );
    observer.observe(shell);
    return () => observer.disconnect();
  }, []);

  /* Take a turn in the load queue while near; give it back when we leave. */
  useEffect(() => {
    if (!near) {
      setMounted(false);
      setLoaded(false);
      return;
    }

    const release = requestLoadSlot(() => setMounted(true));
    releaseRef.current = release;
    const timeout = window.setTimeout(release, LOAD_TIMEOUT_MS);

    return () => {
      window.clearTimeout(timeout);
      release();
      releaseRef.current = null;
    };
  }, [near]);

  const handleLoad = useCallback(() => {
    setLoaded(true);
    releaseRef.current?.();
  }, []);

  return (
    <div
      ref={shellRef}
      className="relative aspect-[16/10] w-full overflow-hidden bg-[#050203]"
    >
      {mounted && scale > 0 && (
        <iframe
          src={`/admin/pages/${pageId}/preview?proposalId=${proposalId}`}
          title={`Preview of ${title}`}
          tabIndex={-1}
          scrolling="no"
          onLoad={handleLoad}
          className="pointer-events-none absolute left-0 top-0 origin-top-left border-0 transition-opacity duration-700 ease-brand"
          style={{
            width: FRAME.width,
            height: FRAME.height,
            transform: `scale(${scale})`,
            opacity: loaded ? (dimmed ? 0.3 : 1) : 0,
          }}
        />
      )}

      {/* Holding state — the deck's own black, so cards never flash white. */}
      {!loaded && (
        <span className="absolute inset-0 flex items-center justify-center font-body text-[10px] font-medium uppercase tracking-[0.22em] text-lyp-white/25">
          Loading
        </span>
      )}
    </div>
  );
}
