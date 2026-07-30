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
