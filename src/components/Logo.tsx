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
}

export default function Logo({
  onDark = false,
  className = "h-9",
  fullWidth = false,
  priority = false,
}: LogoProps) {
  const image = (
    <Image
      src={LOGO_SRC}
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

  if (!onDark) return image;

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
