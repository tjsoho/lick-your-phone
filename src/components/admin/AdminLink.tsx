"use client";

import Link from "next/link";
import { useLinkStatus } from "next/link";
import { Loader2 } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";

/**
 * Shows a spinner while THIS link's navigation is pending.
 *
 * `useLinkStatus` only works inside a Link, which is why this is a separate
 * child component rather than logic in AdminLink itself.
 *
 * The spinner mounts as soon as navigation starts but is transparent for its
 * first second (see `.pending-delayed` in globals.css). A fast navigation
 * unmounts it before it ever becomes visible, so quick pages stay flicker-free
 * and only genuinely slow ones show a spinner.
 */
function PendingSpinner() {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return (
    <Loader2
      strokeWidth={1.75}
      className="pending-delayed ml-auto h-3.5 w-3.5 flex-shrink-0 animate-spin"
      aria-hidden
    />
  );
}

type AdminLinkProps = ComponentProps<typeof Link> & { children: ReactNode };

/**
 * Link for admin navigation.
 *
 * `prefetch` is forced on: admin routes are all dynamic, and without it Next
 * only prefetches as far as the nearest loading boundary — of which this app
 * has none — so nothing useful was being cached ahead of the click.
 */
export default function AdminLink({ children, ...props }: AdminLinkProps) {
  return (
    <Link prefetch {...props}>
      {children}
      <PendingSpinner />
    </Link>
  );
}
