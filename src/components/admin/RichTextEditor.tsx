"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bold,
  Heading2,
  Italic,
  Link2,
  List,
  ListOrdered,
  Underline,
} from "lucide-react";

const EASE = "ease-brand";

/**
 * A PLAIN RICH TEXT BOX, AND NOTHING MORE.
 *
 * Bold, italics, underline, headings, lists, links and line breaks. That is
 * the whole list, because that is the whole list of things an email client
 * renders reliably. Anything fancier would look right here and arrive in
 * Outlook as a mess.
 *
 * Built on contenteditable rather than pulling in an editor library. The
 * commands below are deprecated in the sense that the standard no longer
 * describes them, but every browser still implements them, and the
 * alternative is forty thousand lines of dependency for six buttons behind
 * a login.
 *
 * The editor is uncontrolled on purpose. Writing `value` back into the node
 * on every keystroke moves the caret to the end of the text, which makes it
 * impossible to edit the middle of a sentence.
 */
export default function RichTextEditor({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (html: string) => void;
  disabled?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const lastPushed = useRef<string>(value);
  const [active, setActive] = useState<Record<string, boolean>>({});

  // Only write into the node when the change came from outside, such as
  // switching to a different email.
  useEffect(() => {
    if (!ref.current) return;
    if (value !== lastPushed.current) {
      ref.current.innerHTML = value;
      lastPushed.current = value;
    }
  }, [value]);

  const emit = useCallback(() => {
    if (!ref.current) return;
    const html = ref.current.innerHTML;
    lastPushed.current = html;
    onChange(html);
  }, [onChange]);

  const refreshActive = useCallback(() => {
    if (typeof document === "undefined") return;
    const check = (cmd: string) => {
      try {
        return document.queryCommandState(cmd);
      } catch {
        return false;
      }
    };
    setActive({
      bold: check("bold"),
      italic: check("italic"),
      underline: check("underline"),
      insertUnorderedList: check("insertUnorderedList"),
      insertOrderedList: check("insertOrderedList"),
    });
  }, []);

  const run = useCallback(
    (cmd: string, arg?: string) => {
      if (disabled) return;
      ref.current?.focus();
      document.execCommand(cmd, false, arg);
      emit();
      refreshActive();
    },
    [disabled, emit, refreshActive],
  );

  const addLink = useCallback(() => {
    const url = window.prompt("Where should this link go?", "https://");
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) {
      window.alert("A link needs to start with http:// or https://");
      return;
    }
    run("createLink", url);
  }, [run]);

  const tools = [
    { cmd: "bold", icon: Bold, label: "Bold" },
    { cmd: "italic", icon: Italic, label: "Italic" },
    { cmd: "underline", icon: Underline, label: "Underline" },
    { cmd: "insertUnorderedList", icon: List, label: "Bulleted list" },
    { cmd: "insertOrderedList", icon: ListOrdered, label: "Numbered list" },
  ];

  return (
    <div className="overflow-hidden rounded-2xl border border-[#EFE6E6] bg-lyp-white">
      <div className="flex flex-wrap items-center gap-1 border-b border-[#F3ECEC] bg-[#FCFAFA] px-2.5 py-2">
        {tools.map(({ cmd, icon: Icon, label }) => (
          <button
            key={cmd}
            type="button"
            title={label}
            aria-label={label}
            aria-pressed={!!active[cmd]}
            disabled={disabled}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => run(cmd)}
            className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors duration-300 ${EASE} disabled:opacity-40 ${
              active[cmd]
                ? "bg-lyp-cherry/[0.12] text-lyp-cherry"
                : "text-[#6B5A5A] hover:bg-[#F3ECEC] hover:text-lyp-black"
            }`}
          >
            <Icon strokeWidth={1.75} className="h-3.5 w-3.5" />
          </button>
        ))}

        <span className="mx-1 h-5 w-px bg-[#EFE6E6]" />

        <button
          type="button"
          title="Heading"
          aria-label="Heading"
          disabled={disabled}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => run("formatBlock", "<h3>")}
          className={`flex h-8 w-8 items-center justify-center rounded-lg text-[#6B5A5A] transition-colors duration-300 ${EASE} hover:bg-[#F3ECEC] hover:text-lyp-black disabled:opacity-40`}
        >
          <Heading2 strokeWidth={1.75} className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          title="Normal paragraph"
          aria-label="Normal paragraph"
          disabled={disabled}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => run("formatBlock", "<p>")}
          className={`flex h-8 items-center justify-center rounded-lg px-2.5 font-body text-[11px] font-semibold text-[#6B5A5A] transition-colors duration-300 ${EASE} hover:bg-[#F3ECEC] hover:text-lyp-black disabled:opacity-40`}
        >
          Text
        </button>

        <span className="mx-1 h-5 w-px bg-[#EFE6E6]" />

        <button
          type="button"
          title="Add a link"
          aria-label="Add a link"
          disabled={disabled}
          onMouseDown={(e) => e.preventDefault()}
          onClick={addLink}
          className={`flex h-8 w-8 items-center justify-center rounded-lg text-[#6B5A5A] transition-colors duration-300 ${EASE} hover:bg-[#F3ECEC] hover:text-lyp-black disabled:opacity-40`}
        >
          <Link2 strokeWidth={1.75} className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          title="Remove formatting from the selected text"
          disabled={disabled}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => run("removeFormat")}
          className={`flex h-8 items-center justify-center rounded-lg px-2.5 font-body text-[11px] font-semibold text-[#6B5A5A] transition-colors duration-300 ${EASE} hover:bg-[#F3ECEC] hover:text-lyp-black disabled:opacity-40`}
        >
          Clear
        </button>
      </div>

      <div
        ref={ref}
        contentEditable={!disabled}
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label="Email body"
        onInput={emit}
        onBlur={emit}
        onKeyUp={refreshActive}
        onMouseUp={refreshActive}
        // Paste as plain text. Copying out of a Google Doc or a web page
        // drags in the whole of that page's styling, which looks fine in the
        // box and falls apart in an inbox.
        onPaste={(e) => {
          e.preventDefault();
          const text = e.clipboardData.getData("text/plain");
          document.execCommand("insertText", false, text);
          emit();
        }}
        className="prose prose-sm max-w-none px-5 py-4 font-body text-[14px] leading-relaxed text-lyp-black outline-none [&_a]:text-lyp-cherry [&_a]:underline [&_h3]:mb-2 [&_h3]:mt-5 [&_h3]:text-[16px] [&_h3]:font-semibold [&_li]:mb-1 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-6"
        style={{ minHeight: "22rem" }}
      />
    </div>
  );
}
