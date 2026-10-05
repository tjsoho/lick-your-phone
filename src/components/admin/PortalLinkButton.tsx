"use client";

import { Check, Link2 } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";

const EASE = "ease-brand";

/**
 * Copy the client's proposal link, as one icon in the row's action cluster.
 *
 * It used to be a whole column showing the URL, which pushed the table past
 * the window — the same "cut off on the right" the agency reported before.
 * Nobody reads a token; they copy it and paste it into HubSpot. So the link
 * becomes a button, and the URL rides in the tooltip for anyone who wants to
 * see where it points.
 */
export default function PortalLinkButton({
  url,
  className,
}: {
  url: string | null;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  if (!url) {
    return (
      <span className={className} aria-hidden title="No link yet">
        <Link2 strokeWidth={1.5} className="h-3.5 w-3.5 opacity-30" />
      </span>
    );
  }

  async function handleCopy() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Client link copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be refused outright; say so rather than
      // pretending it worked.
      toast.error("Could not copy — open the proposal and copy it there");
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={copied ? "Copied" : `Copy the client link — ${url}`}
      aria-label="Copy the client link"
      className={className}
    >
      {copied ? (
        <Check
          strokeWidth={2}
          className={`h-3.5 w-3.5 text-[#4A7A5C] transition-opacity duration-500 ${EASE}`}
        />
      ) : (
        <Link2 strokeWidth={1.5} className="h-3.5 w-3.5" />
      )}
    </button>
  );
}
