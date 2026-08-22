import type { Metadata, Viewport } from "next";
import { Fira_Sans, Montserrat } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";

const firaSans = Fira_Sans({
  subsets: ["latin"],
  weight: ["700"],
  variable: "--font-fira-sans",
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
    <html lang="en" className={`${firaSans.variable} ${montserrat.variable}`}>
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
