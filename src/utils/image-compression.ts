"use client";

/**
 * Client-side image downscaling and re-encoding.
 *
 * Runs in the browser before upload, so large camera/export files never travel
 * over the wire at full size. Uses the canvas APIs rather than a dependency.
 */

/** Longest edge kept after downscaling. Comfortably above any display size. */
const MAX_DIMENSION = 2400;

/** WebP quality. 0.82 is visually lossless for photographs at this scale. */
const DEFAULT_QUALITY = 0.82;

/**
 * Formats that are passed through untouched:
 * - SVG is vector, rasterising it would be a downgrade.
 * - GIF may be animated, and canvas would flatten it to a single frame.
 */
const PASSTHROUGH_TYPES = new Set(["image/svg+xml", "image/gif"]);

export interface CompressionResult {
  file: File;
  originalSize: number;
  compressedSize: number;
  /** True when the original was returned unchanged. */
  skipped: boolean;
}

export function formatBytes(bytes: number): string {
  if (!bytes) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function encode(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

function swapExtension(name: string, mimeType: string): string {
  const ext = mimeType === "image/webp" ? "webp" : "jpg";
  return name.replace(/\.[^.]+$/, "") + "." + ext;
}

/**
 * Downscale and re-encode a single image.
 *
 * Never throws and never returns something larger than the input: on any
 * failure, or if re-encoding does not actually save bytes, the original file
 * is returned untouched.
 */
export async function compressImage(
  file: File,
  maxDimension: number = MAX_DIMENSION,
  quality: number = DEFAULT_QUALITY,
): Promise<CompressionResult> {
  const unchanged: CompressionResult = {
    file,
    originalSize: file.size,
    compressedSize: file.size,
    skipped: true,
  };

  if (!file.type.startsWith("image/")) return unchanged;
  if (PASSTHROUGH_TYPES.has(file.type)) return unchanged;

  let bitmap: ImageBitmap | null = null;

  try {
    bitmap = await createImageBitmap(file);

    const scale = Math.min(
      1,
      maxDimension / Math.max(bitmap.width, bitmap.height),
    );
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return unchanged;

    ctx.drawImage(bitmap, 0, 0, width, height);

    // WebP preserves alpha and compresses best; JPEG is the fallback, but only
    // when the source has no transparency to lose.
    let blob = await encode(canvas, "image/webp", quality);
    if (!blob || blob.type !== "image/webp") {
      if (file.type === "image/png") return unchanged;
      blob = await encode(canvas, "image/jpeg", quality);
    }

    if (!blob || blob.size >= file.size) return unchanged;

    return {
      file: new File([blob], swapExtension(file.name, blob.type), {
        type: blob.type,
        lastModified: Date.now(),
      }),
      originalSize: file.size,
      compressedSize: blob.size,
      skipped: false,
    };
  } catch {
    return unchanged;
  } finally {
    bitmap?.close();
  }
}
