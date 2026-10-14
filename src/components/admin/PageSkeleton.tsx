/**
 * WHAT THE DASHBOARD SHOWS WHILE A PAGE IS FETCHING.
 *
 * Every admin page is a server component that talks to the database before it
 * can render anything. Without a loading boundary, Next.js holds the OLD page
 * on screen for the whole of that wait, so a click did nothing visible for
 * between 0.9 and 1.9 seconds, measured on the live site. Nothing was broken;
 * it simply looked like the click had been missed, which is worse.
 *
 * With this in place the new page appears on the same frame as the click and
 * fills in when the data lands. The wait is the same; the dead air is gone.
 *
 * Deliberately plain: a heading bar and a few rows in the dashboard's own
 * greys. It is on screen for under a second, so it should suggest the shape
 * of a page and nothing more.
 */
export default function PageSkeleton() {
  return (
    <div className="animate-pulse p-8 md:p-10" aria-hidden>
      <div className="h-3 w-24 rounded-full bg-[#EFE6E6]" />
      <div className="mt-4 h-8 w-64 rounded-lg bg-[#EFE6E6]" />

      <div className="mt-8 grid gap-3 md:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-20 rounded-2xl bg-[#F5EFEF]" />
        ))}
      </div>

      <div className="mt-8 space-y-2.5">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="h-14 rounded-2xl bg-[#F5EFEF]"
            // Each row a little fainter than the one above, so the block reads
            // as a list fading out rather than a solid slab.
            style={{ opacity: 1 - i * 0.13 }}
          />
        ))}
      </div>
    </div>
  );
}
