/**
 * The fixed wording and imagery a client sees that isn't a content block or a
 * service field: labels, headings, button text, messages.
 *
 * Every slot has a default (what the portal said before it was editable). An
 * override is stored per page in `pages.copy`, or workspace-wide in
 * `agreement_settings.portal_copy` for the `global` kind, keyed by `key`.
 */
export type CopyKind =
  | "cover"
  | "service"
  | "results"
  | "summary"
  | "signature"
  | "payment"
  | "intake"
  | "global";

export interface CopySlot {
  key: string;
  /** What the field is called in the dashboard. */
  label: string;
  /** The wording used when nothing has been overridden. */
  default: string;
  /** Longer text gets a textarea. */
  multiline?: boolean;
  /** An image URL rather than words; edited with the media library. */
  image?: boolean;
  /** Shown under the field, e.g. which {placeholders} are filled in. */
  hint?: string;
}

export type CopyOverrides = Record<string, string>;
