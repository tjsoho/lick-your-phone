"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";

export type SaveStatus = "idle" | "pending" | "saving" | "saved" | "error";

type Options = {
  /** How long to wait after the last change before writing. */
  delay?: number;
  /** Skip saving while false — e.g. a field that is currently invalid. */
  enabled?: boolean;
};

/**
 * Debounced autosave for a piece of editor state.
 *
 * Compares a serialised snapshot rather than object identity, so callers can
 * pass freshly built objects each render without triggering a save. The first
 * value is treated as already saved, so mounting never writes.
 */
export function useAutosave<T>(
  value: T,
  save: (value: T) => Promise<{ error: string | null }>,
  { delay = 900, enabled = true }: Options = {},
) {
  const [status, setStatus] = useState<SaveStatus>("idle");

  const serialised = JSON.stringify(value ?? null);
  const savedRef = useRef(serialised);

  // Kept in refs so a changing callback or value doesn't restart the timer.
  const saveRef = useRef(save);
  saveRef.current = save;
  const valueRef = useRef(value);
  valueRef.current = value;

  useEffect(() => {
    if (!enabled) return;
    if (serialised === savedRef.current) return;

    setStatus("pending");

    const timer = setTimeout(async () => {
      const snapshot = serialised;
      setStatus("saving");

      const res = await saveRef.current(valueRef.current);

      if (res.error) {
        setStatus("error");
        toast.error(res.error);
        return;
      }

      // Anything typed while the write was in flight stays pending.
      savedRef.current = snapshot;
      setStatus(
        JSON.stringify(valueRef.current ?? null) === snapshot
          ? "saved"
          : "pending",
      );
    }, delay);

    return () => clearTimeout(timer);
  }, [serialised, delay, enabled]);

  /**
   * Tell the hook a value is already persisted, so it isn't written again.
   * `silent` records the baseline without announcing "Saved" — for loading
   * existing values into an editor, where nothing has actually been saved.
   */
  const markSaved = useCallback(
    (next: T, options?: { silent?: boolean }) => {
      savedRef.current = JSON.stringify(next ?? null);
      setStatus(options?.silent ? "idle" : "saved");
    },
    [],
  );

  return { status, markSaved };
}
