/**
 * Animated red-smoke backdrop for every proposal-facing page.
 *
 * The wisps are generated rather than shipped as an image: a radial red
 * gradient is warped by fractal noise (feTurbulence -> feDisplacementMap),
 * which produces the filament structure of smoke at any viewport size for a
 * few hundred bytes.
 *
 * The expensive part — the SVG filter — is rasterised once. Only `transform`
 * and `opacity` are animated, so the drift stays on the compositor.
 */

interface SmokeFieldProps {
  id: string;
  seed: number;
  cx: string;
  cy: string;
  /** How far the noise pushes the gradient. Higher = more stretched. */
  scale: number;
  /** Noise size. Lower = larger, sweeping forms. */
  baseFrequency: string;
  numOctaves: number;
  blur: number;
}

function SmokeField({
  id,
  seed,
  cx,
  cy,
  scale,
  baseFrequency,
  numOctaves,
  blur,
}: SmokeFieldProps) {
  return (
    <svg
      className="h-full w-full"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <filter
          id={`smoke-${id}`}
          x="-30%"
          y="-30%"
          width="160%"
          height="160%"
          colorInterpolationFilters="sRGB"
        >
          <feTurbulence
            type="turbulence"
            baseFrequency={baseFrequency}
            numOctaves={numOctaves}
            seed={seed}
            result="noise"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale={scale}
            xChannelSelector="R"
            yChannelSelector="G"
          />
          <feGaussianBlur stdDeviation={blur} />
        </filter>

        <radialGradient id={`field-${id}`} cx={cx} cy={cy} r="68%">
          <stop offset="0%" stopColor="#ff4436" stopOpacity="1" />
          <stop offset="14%" stopColor="#f01818" stopOpacity="0.95" />
          <stop offset="38%" stopColor="#a80505" stopOpacity="0.65" />
          <stop offset="68%" stopColor="#3d0b11" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#050203" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect
        width="100%"
        height="100%"
        fill={`url(#field-${id})`}
        filter={`url(#smoke-${id})`}
      />
    </svg>
  );
}

export default function PortalBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#050203]"
    >
      {/* Deep base wash */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_120%_90%_at_8%_50%,#2c070d_0%,#0c0203_58%,#050203_100%)]" />

      {/* Two smoke fields drifting in opposite directions at different speeds
          gives parallax depth and stops the motion reading as one rigid
          slide. Each is a pair of nested boxes on non-stop circular orbits
          (see .portal-smoke-* in globals.css) — the outer box carries the
          slow sweep, the inner one an offbeat counter-orbit. */}
      {/* Large sweeping forms underneath */}
      <div className="portal-smoke-b absolute -inset-[32%] opacity-70">
        <div className="portal-smoke-b-inner h-full w-full">
          <SmokeField
            id="b"
            seed={23}
            cx="26%"
            cy="52%"
            scale={420}
            baseFrequency="0.005 0.010"
            numOctaves={4}
            blur={3}
          />
        </div>
      </div>

      {/* Fine filaments on top */}
      <div className="portal-smoke-a absolute -inset-[20%]">
        <div className="portal-smoke-a-inner h-full w-full">
          <SmokeField
            id="a"
            seed={9}
            cx="18%"
            cy="47%"
            scale={300}
            baseFrequency="0.010 0.018"
            numOctaves={5}
            blur={1.5}
          />
        </div>
      </div>

      {/* Hot core, matching the bright bloom on the left of the reference */}
      <div className="portal-core absolute left-[-12%] top-1/2 h-[72vmax] w-[72vmax] -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,38,38,0.30)_0%,rgba(178,38,38,0.15)_38%,transparent_70%)] blur-3xl" />

      {/* Scrim. Folds the old vignette into a single pass that also darkens the
          centre, so white copy clears WCAG AA even where it crosses the hot
          core: 52% black over the brightest wisp (#ff4436) lands at ~9:1
          against white, and the smoke is saturated enough to survive it. */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_120%_100%_at_50%_50%,rgba(4,2,3,0.52)_0%,rgba(4,2,3,0.70)_55%,rgba(3,1,2,0.90)_100%)]" />

      {/* Film grain breaks up gradient banding */}
      <div className="auth-grain absolute inset-0 opacity-[0.045] mix-blend-overlay" />
    </div>
  );
}
