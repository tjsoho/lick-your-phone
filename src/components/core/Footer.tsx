import Link from "next/link";

/* ************************************************************
   Minimal, brand-free footer scaffold for the template.
   Static on purpose — no DB wiring, no logo, no legal pages.
   Swap the wordmark, columns and copy when you brand the site.
************************************************************ */

const footerColumns: { heading: string; links: { label: string; href: string }[] }[] = [
    {
        heading: "Product",
        links: [
            { label: "Overview", href: "#" },
            { label: "Features", href: "#" },
            { label: "Pricing", href: "#" },
        ],
    },
    {
        heading: "Company",
        links: [
            { label: "About", href: "#" },
            { label: "Careers", href: "#" },
            { label: "Contact", href: "#" },
        ],
    },
    {
        heading: "Resources",
        links: [
            { label: "Blog", href: "#" },
            { label: "Help", href: "#" },
            { label: "Status", href: "#" },
        ],
    },
];

export default function Footer() {
    const year = new Date().getFullYear();

    return (
        <footer className="bg-brand-black text-white">
            <div className="max-w-[1280px] mx-auto px-6 py-14">
                <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
                    {/* Wordmark — replace with a logo when you brand the site */}
                    <div className="col-span-2 md:col-span-1">
                        <Link
                            href="/"
                            className="text-lg font-semibold tracking-tight"
                            aria-label="Home"
                        >
                            Brand
                        </Link>
                        <p className="mt-3 max-w-xs text-sm text-white/60">
                            A short tagline goes here. Describe what the site is
                            about in one sentence.
                        </p>
                    </div>

                    {footerColumns.map((col) => (
                        <div key={col.heading}>
                            <h3 className="text-xs font-semibold uppercase tracking-wider text-white/50">
                                {col.heading}
                            </h3>
                            <ul className="mt-3 space-y-2">
                                {col.links.map((link) => (
                                    <li key={link.label}>
                                        <Link
                                            href={link.href}
                                            className="text-sm text-white/75 transition-colors hover:text-white"
                                        >
                                            {link.label}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                <div className="mt-12 border-t border-white/10 pt-6 text-sm text-white/50">
                    © {year} Brand. All rights reserved.
                </div>
            </div>
        </footer>
    );
}
