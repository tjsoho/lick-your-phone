"use client";

import type { FieldProps } from "./types";

/**
 * A web address typed into a content block. `https://…` and bare `www.…`
 * both count, because the agency writes these blocks by hand in the
 * dashboard and will write them either way.
 */
const URL_PATTERN = /(?:https?:\/\/|www\.)[^\s<>()[\]]+/gi;

/** Sentence punctuation that follows a link rather than belonging to it. */
const TRAILING_PUNCTUATION = /[.,;:!?'"]+$/;

type Part = { text: string; href: string | null };

/**
 * Splits a block of copy into plain runs and the links inside it.
 *
 * Done here rather than by rendering the content as HTML: these blocks are
 * typed in the dashboard and shown to the client, so nothing in them is ever
 * handed to the browser as markup.
 */
function linkify(content: string): Part[] {
  const parts: Part[] = [];
  let cursor = 0;

  for (const match of content.matchAll(URL_PATTERN)) {
    const start = match.index ?? 0;
    // "see https://example.com." links the address, not the full stop.
    const raw = match[0].replace(TRAILING_PUNCTUATION, "");
    if (!raw) continue;

    if (start > cursor) {
      parts.push({ text: content.slice(cursor, start), href: null });
    }
    parts.push({
      text: raw,
      href: raw.toLowerCase().startsWith("www.") ? `https://${raw}` : raw,
    });
    cursor = start + raw.length;
  }

  if (cursor < content.length) {
    parts.push({ text: content.slice(cursor), href: null });
  }
  return parts;
}

export default function StaticContentField({ question }: FieldProps) {
  const config = question.config as Record<string, string> | null;
  const content = config?.content ?? question.field_label ?? "";

  return (
    <div className="rounded-lg border border-lyp-white/10 bg-lyp-white/5 p-5">
      <div className="font-body text-sm text-lyp-white/80 leading-relaxed whitespace-pre-line">
        {linkify(content).map((part, i) =>
          part.href ? (
            /* A new tab, always. Followed in this one it replaces the form,
               and Back from an outside page returns the client to the start
               of the journey rather than the step they were filling in. */
            <a
              key={i}
              href={part.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-lyp-cherry underline underline-offset-2 transition-colors duration-300 ease-brand hover:text-lyp-cherry/80"
            >
              {part.text}
            </a>
          ) : (
            part.text
          ),
        )}
      </div>
    </div>
  );
}
