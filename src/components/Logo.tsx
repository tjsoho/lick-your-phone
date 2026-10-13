import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Single source of truth for the brand mark.
 *
 * Everything that shows the logo renders through this component, so replacing
 * the file below updates the login screen, the admin sidebar and the portal
 * cover at once.
 *
 * The literal space is deliberate: next/image encodes the src itself, so
 * pre-encoding it as %20 here would double-encode to %2520 and 404.
 */
const LOGO_SRC = "/images/Website logo.PNG";

/** Intrinsic dimensions of the artwork, used only for the aspect ratio. */
const LOGO_W = 383;
const LOGO_H = 120;

/**
 * The circular lips mark, for places with no room for the full wordmark.
 *
 * "Change the white left top corner logo to the lips circle logo." Its corners
 * are genuinely transparent (checked: alpha 0 in all four), so it needs no
 * plate behind it on the dark sidebar and gets none.
 */
/**
 * Trimmed to the artwork. The original was a 1080 square with the circle
 * filling only 88% of it, so beside a client's own mark at the same element
 * height it read as the smaller of the two — "the logos need to be the same
 * size". With the padding gone the circle fills its box, so equal heights
 * now mean equal circles.
 */
const MARK_SRC = "/images/lips-mark.png";
const MARK_W = 954;
const MARK_H = 953;

interface LogoProps {
  /**
   * The artwork ships with an OPAQUE white background (verified: alpha 255 in
   * every corner), so on dark surfaces it would otherwise read as a raw white
   * rectangle. This wraps it in a rounded white plate so that reads as
   * deliberate. Swap in a transparent or light-on-dark asset and this can go.
   */
  onDark?: boolean;
  /** Tailwind height class, e.g. "h-8". Width follows the aspect ratio. */
  className?: string;
  /**
   * Stretch to fill the available width, height following the aspect ratio.
   * Both the plate and the image have to grow — widening only the plate would
   * leave the artwork sitting small in a large white box.
   */
  fullWidth?: boolean;
  priority?: boolean;
  /** Replacement artwork, e.g. the portal cover's editable logo. */
  src?: string;
  /**
   * "mark" is the circular lips badge, for a narrow space where the wordmark
   * would have to shrink to nothing. It needs no plate on any ground.
   */
  variant?: "wordmark" | "mark";
}

export default function Logo({
  onDark = false,
  className = "h-9",
  fullWidth = false,
  priority = false,
  src,
  variant = "wordmark",
}: LogoProps) {
  const isMark = variant === "mark";
  const resolved = src ?? (isMark ? MARK_SRC : LOGO_SRC);

  if (isMark) {
    return (
      <Image
        src={resolved}
        alt="LickYourPhone Media"
        width={MARK_W}
        height={MARK_H}
        priority={priority}
        className={cn("w-auto object-contain", className)}
      />
    );
  }

  const image = (
    <Image
      src={resolved}
      alt="LickYourPhone Media"
      width={LOGO_W}
      height={LOGO_H}
      priority={priority}
      className={cn(
        "w-auto object-contain",
        fullWidth && "h-auto w-full",
        className,
      )}
    />
  );

  // The plate exists only for the built-in artwork, which ships with an opaque
  // white background. An uploaded logo is expected to be a light, transparent
  // one, and a plate behind it would hide it entirely.
  if (!onDark || resolved !== LOGO_SRC) return image;

  return (
    <span
      className={cn(
        "inline-flex items-center overflow-hidden rounded-lg bg-lyp-white px-2.5 py-1.5 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.55)]",
        fullWidth && "w-full justify-center",
      )}
    >
      {image}
    </span>
  );
}
