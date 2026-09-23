import type { CopySlot } from "./types";

/**
 * NOTE: the cover's "Signed" badge and its "View Summary" button are NOT
 * editable slots. Both only exist once the proposal has actually been signed,
 * and the page editor always previews a draft stand-in — so editing them
 * looked like it did nothing, every time. Their wording now lives beside the
 * markup in `ContentPage`, which is the only place it is read.
 */
export const COVER_COPY: CopySlot[] = [
  { key: "logo", label: "Logo", default: "/images/Website logo.PNG", image: true, hint: "Shown above the client's name on the dark cover, so upload a light or white version on a transparent background." },
  { key: "preparedFor", label: "Prepared for label", default: "Prepared for" },
];
