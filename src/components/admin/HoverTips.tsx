"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/**
 * THE HOVER TEXT, HALF A SECOND IN.
 *
 * Every control in the dashboard carries a `title` saying what it does. The
 * browser will show those on its own, but on its own schedule — somewhere
 * around a second and a half, which the agency read as broken: "make the
 * hover appear after 0.5 second, it's too slow." No stylesheet or script can
 * change the native delay, so the only way to set it is to draw the tooltip
 * ourselves.
 *
 * This is one listener for the whole admin rather than a wrapper on 182
 * buttons: on hover it borrows the element's `title`, which both silences the
 * browser's own tooltip and gives us the words to show. The attribute goes
 * straight back on the way out, so nothing is permanently altered and assistive
 * technology still finds it.
 */

/** What they asked for, to the millisecond. */
const DELAY_MS = 500;

/** Clear of the cursor, close enough to read as attached to the control. */
const GAP_PX = 8;

/** Never flush against the window edge. */
const EDGE_PX = 8;

type Tip = { text: string; x: number; y: number; above: boolean };

export default function HoverTips() {
  const [tip, setTip] = useState<Tip | null>(null);
  const [mounted, setMounted] = useState(false);

  /** The element whose `title` we are currently holding, and the title itself. */
  const heldRef = useRef<{ el: Element; title: string } | null>(null);
  const timerRef = useRef<number | null>(null);
  const tipRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted) return;

    function clearTimer() {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    }

    /** Give the title back. Always paired with taking it. */
    function release() {
      const held = heldRef.current;
      if (held) {
        // Only if nothing else has put one back in the meantime — a re-render
        // between enter and leave can restore it itself.
        if (!held.el.hasAttribute("title")) {
          held.el.setAttribute("title", held.title);
        }
        heldRef.current = null;
      }
    }

    function hide() {
      clearTimer();
      release();
      setTip(null);
    }

    function show(el: Element, text: string) {
      const r = el.getBoundingClientRect();
      // Below by default; above when the window has no room underneath. The
      // estimate is deliberately generous — a two-line tip is the tallest
      // thing this draws.
      const above = r.bottom + GAP_PX + 48 > window.innerHeight;
      setTip({
        text,
        x: r.left + r.width / 2,
        y: above ? r.top - GAP_PX : r.bottom + GAP_PX,
        above,
      });
    }

    function arm(event: Event) {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const el = target.closest("[title]");
      if (!el) return;

      const title = el.getAttribute("title");
      if (!title || !title.trim()) return;

      // Already holding this one: a mousemove inside the same control.
      if (heldRef.current?.el === el) return;

      hide();

      // Taking the attribute is what stops the browser drawing its own slow
      // one over the top of ours.
      heldRef.current = { el, title };
      el.removeAttribute("title");

      timerRef.current = window.setTimeout(() => show(el, title), DELAY_MS);
    }

    function disarm(event: Event) {
      const held = heldRef.current;
      if (!held) return;
      // `relatedTarget` is where the pointer went. Moving onto a child of the
      // same control is not leaving it.
      const to = (event as MouseEvent).relatedTarget;
      if (to instanceof Node && held.el.contains(to)) return;
      hide();
    }

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") hide();
    }

    document.addEventListener("mouseover", arm, true);
    document.addEventListener("mouseout", disarm, true);
    document.addEventListener("focusin", arm, true);
    document.addEventListener("focusout", disarm, true);
    // A click has answered the question the tooltip was asking, and a scroll
    // leaves it floating over the wrong thing.
    document.addEventListener("mousedown", hide, true);
    document.addEventListener("keydown", onKey, true);
    window.addEventListener("scroll", hide, true);
    window.addEventListener("blur", hide);

    return () => {
      document.removeEventListener("mouseover", arm, true);
      document.removeEventListener("mouseout", disarm, true);
      document.removeEventListener("focusin", arm, true);
      document.removeEventListener("focusout", disarm, true);
      document.removeEventListener("mousedown", hide, true);
      document.removeEventListener("keydown", onKey, true);
      window.removeEventListener("scroll", hide, true);
      window.removeEventListener("blur", hide);
      // Leaving the page must not take a title with it.
      release();
    };
  }, [mounted]);

  // Once drawn, nudge it back inside the window if centring pushed it out.
  useEffect(() => {
    const node = tipRef.current;
    if (!node || !tip) return;
    const r = node.getBoundingClientRect();
    let shift = 0;
    if (r.left < EDGE_PX) shift = EDGE_PX - r.left;
    else if (r.right > window.innerWidth - EDGE_PX) {
      shift = window.innerWidth - EDGE_PX - r.right;
    }
    if (shift) node.style.transform += ` translateX(${shift}px)`;
  }, [tip]);

  if (!mounted || !tip) return null;

  return createPortal(
    <div
      ref={tipRef}
      role="tooltip"
      className="pointer-events-none fixed z-[200] max-w-[18rem] rounded-lg bg-lyp-black px-2.5 py-1.5 font-body text-[11.5px] leading-snug text-lyp-white shadow-[0_12px_28px_-12px_rgba(0,0,0,0.6)]"
      style={{
        left: tip.x,
        top: tip.y,
        transform: `translateX(-50%)${tip.above ? " translateY(-100%)" : ""}`,
      }}
    >
      {tip.text}
    </div>,
    document.body,
  );
}
