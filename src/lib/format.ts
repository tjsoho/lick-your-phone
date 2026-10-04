export function formatCents(cents: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(cents / 100);
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(date: string): string {
  return new Date(date).toLocaleString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/**
 * Human label for a proposal status.
 *
 * The `intake_complete` enum value stays as-is in the database — renaming it
 * would mean a migration and a rewrite of every row — but clients and staff
 * call that step onboarding, so it reads that way everywhere.
 */
export function formatStatus(status: string | null | undefined): string {
  if (!status) return "—";
  // The database words and the agency's words are not the same. "Superseded"
  // in particular sent them to a dictionary — "we had to Google it because we
  // didn't know it" — so the enum keeps its name and the screen says what it
  // means.
  if (status === "intake_complete" || status === "intake_completed")
    return "onboarding complete";
  if (status === "superseded") return "replaced";
  return status.replace(/_/g, " ");
}
