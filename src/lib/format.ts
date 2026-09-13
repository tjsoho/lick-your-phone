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
  if (status === "intake_complete") return "onboarding complete";
  return status.replace(/_/g, " ");
}
