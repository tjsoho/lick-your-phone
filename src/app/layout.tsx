import { Inter } from "next/font/google";
import "./globals.css";
import HeaderWrapper from "@/components/core/HeaderWrapper";
import Footer from "@/components/core/Footer";
import { Toaster } from "react-hot-toast";

const inter = Inter({
    subsets: ["latin"],
    variable: "--font-inter",
    display: "swap",
});
// Metadata is now generated dynamically per page via generateMetadata()

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <head>
                {/* Robots meta tag with all directives combined */}
                <meta
                    name="robots"
                    content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"
                />
            </head>
            <body className={`${inter.variable} antialiased overflow-x-clip`}>
                <Toaster
                    position="top-right"
                    toastOptions={{
                        duration: 3000,
                        style: {
                            background: "#000",
                            color: "#fff",
                            border: "1px solid rgba(255, 255, 255, 0.2)",
                        },
                    }}
                />
                <HeaderWrapper />
                <main className="">{children}</main>
                <Footer />
            </body>
        </html>
    );
}
