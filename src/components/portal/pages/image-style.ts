/**
 * THE TWO RADII EVERY PICTURE IN THE DECK USES.
 *
 * They live in their own file because `MediaCarousel` needs them too, and
 * `ContentBlockRenderer` already imports the carousel. Pulling them back the
 * other way would make a cycle.
 *
 * Two rules go with them, and both were learned the hard way:
 *
 * 1. The radius belongs on the IMAGE, never on a wrapper around it. With
 *    `object-contain` a wrapper is usually wider than the photo it holds, so a
 *    radius on the wrapper curves empty space and leaves the photo's own
 *    corners square.
 * 2. The image's box has to shrink-wrap the photo: `h-auto w-auto` with a cap,
 *    never `w-full` next to a `max-h`. A `w-full` box with a binding max-height
 *    letterboxes, which puts the curve back on empty space.
 */

/** One radius for every content image, so nothing looks half-styled. */
export const IMAGE_RADIUS = "rounded-3xl";

/**
 * A heavier radius for the pictures that render large.
 *
 * A fixed 24px is a quarter of a small logo's width and a twentieth of a
 * full-height photograph's, so the same number reads as very round on one and
 * almost square on the other. The big pictures take their own figure so the
 * curve is as legible at 600px as it is at 140px. It matters most where the
 * artwork's own edge happens to be the same colour as the page behind it,
 * which is when a shallow curve disappears altogether.
 */
export const IMAGE_RADIUS_LARGE = "rounded-[3.5rem]";
