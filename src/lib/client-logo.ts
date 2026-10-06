/**
 * The logo a proposal cover shows in place of the LickYourPhone mark, and
 * where it comes from.
 *
 * The cover artwork itself never changes, so the only thing that has to move
 * between proposals is the mark sitting above the client's name. That belongs
 * to whoever the proposal is for, not to the deck, which is why it lives as a
 * column on `clients` and on `venues` rather than as another editable cover
 * slot.
 *
 * One client can hold several restaurants, and each restaurant has its own
 * branding — so the venue's own logo is what a proposal for that venue
 * shows, and the client's stands in for the venues that have none.
 */

/**
 * The cover draws the mark in a box 64px tall and 300px wide at most
 * (`h-14 max-w-[240px] md:h-16 md:max-w-[300px]` in `ContentPage`), so 600 x
 * 200 covers the widest case on a 2x screen and leaves a squarer logo room to
 * breathe. Shown under every logo field, and in the media library beside it.
 */
export const LOGO_SIZE_HINT = "Recommended 600 x 200px (transparent PNG)";

/** The same hint, under the name `ClientLogoField` already imports it by. */
export const CLIENT_LOGO_SIZE_HINT = LOGO_SIZE_HINT;

/**
 * The part of the guidance that is true of any cover logo. Says the two
 * things that actually go wrong: a dark logo vanishes into the cover, and a
 * logo with its own baked-in background sits as a pale slab above the
 * client's name. Each field then says what an empty field falls back to,
 * which is the one thing the two differ on.
 */
const LOGO_GUIDANCE_STEM =
  "Sits above the client's name on the dark cover, so use a light or white version with a transparent background — anything dark, or anything with its own white box, will read badly there.";

/** The sentence under the hint on the client's own logo field. */
export const CLIENT_LOGO_GUIDANCE = `${LOGO_GUIDANCE_STEM} Leave it empty and the cover shows the LickYourPhone mark.`;

/**
 * The same sentence on a venue's logo field, with that field's own fallback:
 * the client this venue belongs to, and the LickYourPhone mark behind them.
 */
export const VENUE_LOGO_GUIDANCE = `${LOGO_GUIDANCE_STEM} Leave it empty and the cover uses the client's own logo instead, and the LickYourPhone mark if they have none either.`;

export interface CoverLogo {
  src: string;
  /**
   * Whether `src` is artwork the venue or the client sent us rather than the
   * cover slot's own.
   *
   * The cover draws the two differently, which is why this is returned
   * rather than inferred again at the call site: the slot's mark is a known
   * asset the `Logo` component is built around, while a logo of theirs is
   * whatever shape they sent and has to be sized from its own proportions.
   */
  isCustomLogo: boolean;
}

/**
 * The one place the cover's logo is decided.
 *
 * The arguments are in precedence order: the venue's own logo wins, the
 * client's stands in for a venue without one, and the cover's editable `logo`
 * slot is the last fallback — and that slot defaults to the LickYourPhone
 * mark. A venue and client with no logo between them therefore see exactly
 * what the cover showed before any of this existed. Everything that draws a
 * proposal cover calls this — currently `ContentPage`, which is the only
 * renderer of the `cover` slide.
 *
 * @param venueLogoUrl `venues.logo_url` for the venue this proposal is for.
 * @param clientLogoUrl `clients.logo_url` for the client that venue sits under.
 * @param coverCopyLogo Whatever the cover's `logo` copy slot resolves to.
 */
export function resolveCoverLogo(
  venueLogoUrl: string | null | undefined,
  clientLogoUrl: string | null | undefined,
  coverCopyLogo: string,
): CoverLogo {
  // Trimmed, because an emptied field can round-trip as "" rather than null —
  // and an emptied venue field has to fall through to the client, not win.
  const own = venueLogoUrl?.trim() || clientLogoUrl?.trim();
  if (own) return { src: own, isCustomLogo: true };
  return { src: coverCopyLogo, isCustomLogo: false };
}
