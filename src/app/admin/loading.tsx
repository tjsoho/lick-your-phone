/**
 * WHAT THE DASHBOARD SHOWS WHILE A PAGE IS FETCHING.
 *
 * A thin bar across the top and nothing else.
 *
 * There was no loading boundary at all before, so Next.js held the OLD page on
 * screen until the new one's data came back — between 0.9 and 1.9 seconds of a
 * click doing nothing visible, measured on the live site.
 *
 * The first attempt at fixing that drew a full skeleton of grey blocks, which
 * looked terrible: a big grey slab flashing over a dark red dashboard several
 * times a minute. This says the same thing — "heard you, working" — without
 * pretending to be a page. The previous screen stays put underneath, which is
 * what makes it calm rather than flickery.
 */
export default function Loading() {
  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-50 h-0.5 overflow-hidden bg-transparent"
      role="status"
      aria-label="Loading"
    >
      <div className="h-full w-1/3 animate-loading-sweep bg-lyp-cherry" />
    </div>
  );
}
