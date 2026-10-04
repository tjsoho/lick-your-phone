"use client";

import { useCallback, useEffect, useState } from "react";

/* -------------------------------------------------------------------------
   THE SIGNER'S EMAIL, WHICH USED TO GO MISSING

   The carousel renders exactly one slide and keys it on the page, so the
   whole signing subtree is destroyed and rebuilt every time the client turns
   a page — Reveal.tsx says as much: "the carousel remounts the whole page
   subtree on every page change". A plain `useState("")` on the signing form
   therefore loses whatever has been typed the moment the client steps back to
   check a price and returns. Nothing is broken when that happens, and nothing
   logs it; the field is simply empty again, which is exactly how the agency
   described it ("my email is missing… I don't know if it was a glitch").

   So the value is held outside the component:

     - it OPENS with the address the proposal was sent to, so for most clients
       there is nothing to type in the first place;
     - what the client types is remembered for the rest of the visit, across
       as many page turns as they like;
     - and it survives a reload, in session storage, which empties when the
       tab closes. An email address is the client's, so it is kept for the
       visit and no longer.

   Storage is wrapped throughout: in a private window every call can throw,
   and the form still has to work — it just forgets a reload.
   ------------------------------------------------------------------------- */

const STORAGE_PREFIX = "lyp-signer-email";

/**
 * What the client has typed, this tab, this page load. Read during render, so
 * a remount picks the address straight back up with no flicker — and empty on
 * the first render of a load, which is what keeps it safe to read while the
 * server-rendered markup is still being matched.
 */
const typed = new Map<string, string>();

export function useSignerEmail(token: string, prefill: string) {
  const key = `${STORAGE_PREFIX}:${token}`;

  const [email, setEmail] = useState(() => typed.get(token) ?? prefill);

  // A reload has nothing in the map, so the stored address is adopted on
  // mount instead. The guard means this only ever runs on the first mount of
  // a page load: after that the map has the newer value and must win.
  useEffect(() => {
    if (typed.has(token)) return;
    try {
      const saved = window.sessionStorage.getItem(key);
      if (saved) {
        typed.set(token, saved);
        setEmail(saved);
      }
    } catch {
      /* storage blocked — the field keeps the address it opened with. */
    }
  }, [token, key]);

  const update = useCallback(
    (next: string) => {
      setEmail(next);
      typed.set(token, next);
      try {
        window.sessionStorage.setItem(key, next);
      } catch {
        /* storage blocked — the address holds for this page load only. */
      }
    },
    [token, key],
  );

  /** Called once the signature is in: there is nothing left to restore. */
  const forget = useCallback(() => {
    typed.delete(token);
    try {
      window.sessionStorage.removeItem(key);
    } catch {
      /* storage blocked — nothing was written in the first place. */
    }
  }, [token, key]);

  return { email, setEmail: update, forget };
}
