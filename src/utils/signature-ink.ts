"use client";

/**
 * Reading a signature image well enough to warn about it.
 *
 * A signature that is white on a transparent background is a perfectly
 * reasonable file to own — it is the one you use over a dark photograph —
 * but the contract page is white, so printed there it is nothing at all.
 * Nothing in the browser or the admin says so: the upload succeeds, the
 * preview sits invisibly on a white card, and the contract comes out looking
 * unsigned. This reads the pixels so the admin can say it out loud.
 */

/** Alpha below this is treated as background rather than ink. */
const INK_ALPHA = 48;

/**
 * Where in the ink's luminance range the darkest marks are looked for.
 * The darkest 5% rather than the minimum, so one stray dark pixel from a
 * compression artefact cannot pass a white signature off as a dark one.
 */
const DARKEST_PERCENTILE = 0.05;

/** Above this, even the darkest marks are too pale to read on white paper. */
const TOO_PALE = 0.72;

/** A signature with less transparent area than this is a solid block. */
const MIN_TRANSPARENT_SHARE = 0.02;

export interface SignatureInk {
  /**
   * `light` means the darkest marks in the image are still pale — the file
   * will print invisibly on the contract's white page.
   */
  tone: "dark" | "light";
  /** False when the image is a solid rectangle rather than ink on nothing. */
  hasTransparency: boolean;
  width: number;
  height: number;
}

function load(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // Supabase serves public objects with a permissive CORS header, which is
    // what keeps the canvas readable below.
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load the image"));
    img.src = url;
  });
}

/**
 * Inspect a stored signature.
 *
 * Returns null whenever the answer cannot be trusted — the image would not
 * load, the canvas came back tainted, or there is no ink in it to judge —
 * because a wrong verdict about a legal document is worse than no verdict.
 */
export async function inspectSignatureInk(
  url: string,
): Promise<SignatureInk | null> {
  try {
    const img = await load(url);

    // Sampled small: a verdict about overall tone needs no more than this,
    // and it keeps a 4000px export from blocking the main thread.
    const scale = Math.min(1, 240 / Math.max(img.width, img.height, 1));
    const width = Math.max(1, Math.round(img.width * scale));
    const height = Math.max(1, Math.round(img.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, width, height);

    const { data } = ctx.getImageData(0, 0, width, height);

    const inkLuminance: number[] = [];
    let transparent = 0;

    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < INK_ALPHA) {
        transparent += 1;
        continue;
      }
      // Rec. 709 luma, 0 (black) to 1 (white).
      inkLuminance.push(
        (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255,
      );
    }

    if (inkLuminance.length === 0) return null;

    inkLuminance.sort((a, b) => a - b);
    const darkest =
      inkLuminance[
        Math.min(
          inkLuminance.length - 1,
          Math.floor(inkLuminance.length * DARKEST_PERCENTILE),
        )
      ];

    const pixels = width * height;

    return {
      tone: darkest > TOO_PALE ? "light" : "dark",
      hasTransparency: transparent / pixels >= MIN_TRANSPARENT_SHARE,
      width: img.naturalWidth || img.width,
      height: img.naturalHeight || img.height,
    };
  } catch {
    return null;
  }
}
