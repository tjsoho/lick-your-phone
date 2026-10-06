"use client";

import { Check, Link2 } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

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
      <span
        className={cn(className, "border-dashed bg-lyp-white text-[#BFADAD]")}
        aria-hidden
        title="No link yet — send the proposal to generate one"
      >
        <Link2 strokeWidth={1.75} className="h-4 w-4" />
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
          strokeWidth={2.25}
          className={`h-4 w-4 text-[#4A7A5C] transition-opacity duration-500 ${EASE}`}
        />
      ) : (
        <Link2 strokeWidth={1.75} className="h-4 w-4" />
      )}
    </button>
  );
}
