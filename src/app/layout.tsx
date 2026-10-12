import type { Metadata, Viewport } from "next";
import { Kanit, Montserrat } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";

/**
 * Titles are set in Kanit, which is the typeface the agency's own PandaDoc
 * deck uses: "You were right with using Fira Sans, it is the right font in
 * our brand guidelines, but Rita wants to use a different one."
 *
 * Taken from Google Fonts rather than Adobe Fonts. It is the same typeface,
 * and the Open Font Licence lets us serve it ourselves and embed it in a PDF,
 * neither of which an Adobe Fonts licence allows.
 *
 * Several weights, because the old single 700 meant every heading rendered
 * bold whatever class it carried. The deck's big titles ask for 800, which is
 * the extrabold Rita is used to seeing.
 */
const kanit = Kanit({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  variable: "--font-kanit",
  display: "swap",
});

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-montserrat",
  display: "swap",
});

export const metadata: Metadata = {
  title: "LickYourPhone",
  description: "Client proposals and onboarding.",
};

/**
 * Without this, no viewport meta is emitted at all — mobile browsers then lay
 * the page out at a virtual ~980px and scale the result down to fit, which is
 * what makes text look soft on a phone instead of sharp.
 * `viewportFit: "cover"` also lets the dvh units used across the portal reach
 * under the notch/home indicator.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${kanit.variable} ${montserrat.variable}`}>
      <body className="antialiased overflow-x-clip">
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: "var(--lyp-black)",
              color: "var(--lyp-white)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
            },
          }}
        />
        {children}
      </body>
    </html>
  );
}
