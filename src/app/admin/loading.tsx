import PageSkeleton from "@/components/admin/PageSkeleton";

/**
 * One loading boundary for the whole dashboard.
 *
 * A `loading.tsx` on a segment covers that segment AND every route under it
 * that does not define its own, so this single file answers for /admin and
 * all of its children. There were none at all before, which is why clicking a
 * sidebar link left the previous page sitting there for up to 1.9 seconds
 * with nothing to say it had registered.
 */
export default function Loading() {
  return <PageSkeleton />;
}
