/**
 * The client's own logo — uploaded on the client record, shown on that
 * client's proposal cover in place of the LickYourPhone mark.
 *
 * The cover artwork itself never changes, so the only thing that has to move
 * between proposals is the mark sitting above the client's name. That belongs
 * to the client, not to the deck, which is why it is a column on `clients`
 * and not another editable cover slot.
 */

/**
 * The cover draws the mark in a box 64px tall and 300px wide at most
 * (`h-14 max-w-[240px] md:h-16 md:max-w-[300px]` in `ContentPage`), so 600 x
 * 200 covers the widest case on a 2x screen and leaves a squarer logo room to
 * breathe. Shown under every logo field, and in the media library beside it.
 */
export const CLIENT_LOGO_SIZE_HINT = "Recommended 600 x 200px (transparent PNG)";

/**
 * The sentence under the hint. Says the two things that actually go wrong:
 * a dark logo vanishes into the cover, and a logo with its own baked-in
 * background sits as a pale slab above the client's name.
 */
export const CLIENT_LOGO_GUIDANCE =
  "Sits above the client's name on the dark cover, so use a light or white version with a transparent background — anything dark, or anything with its own white box, will read badly there. Leave it empty and the cover shows the LickYourPhone mark.";

export interface CoverLogo {
  src: string;
  /**
   * Whether `src` is the client's own artwork rather than the cover slot's.
   *
   * The cover draws the two differently, which is why this is returned
   * rather than inferred again at the call site: the slot's mark is a known
   * asset the `Logo` component is built around, while a client's logo is
   * whatever shape they sent and has to be sized from its own proportions.
   */
  isClientLogo: boolean;
}

/**
 * The one place the cover's logo is decided.
 *
 * The client's own logo wins; the cover's editable `logo` slot is the
 * fallback, and that slot defaults to the LickYourPhone mark. A client with
 * no logo therefore sees exactly what the cover showed before any of this
 * existed. Everything that draws a proposal cover calls this — currently
 * `ContentPage`, which is the only renderer of the `cover` slide.
 *
 * @param clientLogoUrl `clients.logo_url` for the client this proposal is for.
 * @param coverCopyLogo Whatever the cover's `logo` copy slot resolves to.
 */
export function resolveCoverLogo(
  clientLogoUrl: string | null | undefined,
  coverCopyLogo: string,
): CoverLogo {
  // Trimmed, because an emptied field can round-trip as "" rather than null.
  const own = clientLogoUrl?.trim();
  if (own) return { src: own, isClientLogo: true };
  return { src: coverCopyLogo, isClientLogo: false };
}
