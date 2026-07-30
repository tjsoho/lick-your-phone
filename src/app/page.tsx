import type { Metadata } from "next";
import type { ReactNode } from "react";
import getPage from "@/server-actions/page";
import { HomePageContent, homePageFallbackData } from "./_config";
import Hero from "../components/Home/Hero";
import Section2 from "../components/Home/Section2";
import Section3 from "../components/Home/Section3";
import Section5 from "../components/Home/Section5";
import Section4 from "@/components/Home/Section4";
import Section6 from "@/components/Home/Section6";
import Section7 from "@/components/Home/Section7";
import Section8 from "@/components/Home/Section8";
import { buildPageMetadata } from "@/utils/seo";

// Disable caching for this page to ensure fresh content
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
    return buildPageMetadata("home");
}

type SectionKey =
    | "section2"
    | "section3"
    | "section4"
    | "section5"
    | "section6"
    | "section7"
    | "section8";

/** Canonical fallback order if a row was saved before sectionsOrder existed. */
const DEFAULT_ORDER: SectionKey[] = [
    "section2",
    "section3",
    "section4",
    "section5",
    "section8",
    "section6",
    "section7",
];

/**
 * Per-section render functions. Each section component handles its own
 * internals; this map is just a dispatch table keyed by the order entry.
 */
const SECTION_RENDERERS: Record<
    SectionKey,
    (content: HomePageContent) => ReactNode
> = {
    section2: (c) => <Section2 content={c} />,
    section3: (c) => <Section3 content={c} />,
    section4: (c) => <Section4 content={c} />,
    section5: (c) => <Section5 content={c} />,
    section6: (c) => <Section6 content={c} />,
    section7: (c) => <Section7 content={c} />,
    section8: (c) => <Section8 content={c} />,
};

const VISIBILITY_KEYS: Record<SectionKey, keyof HomePageContent> = {
    section2: "section2Visible",
    section3: "section3Visible",
    section4: "section4Visible",
    section5: "section5Visible",
    section6: "section6Visible",
    section7: "section7Visible",
    section8: "section8Visible",
};

/**
 * Per-section wrapper classes. The legacy default-order layout grouped
 * Sections 2 & 3 and Sections 5 & 6 inside a shared `max-w-[1540px]`
 * column with `pt-24` on the first child; Sections 4 and 7 ran full
 * bleed. We bake that wrapper into each section individually so the
 * default order renders identically to before, and reorders adapt
 * cleanly without us touching any Section component file.
 */
const SECTION_WRAPPERS: Record<SectionKey, string> = {
    section2: "max-w-[1540px] mx-auto lg:px-8 py-4 pt-24",
    section3: "max-w-[1540px] mx-auto lg:px-8 py-4",
    section4: "",
    section5: "max-w-[1540px] mx-auto lg:px-8 py-4 pt-24",
    section6: "max-w-[1540px] mx-auto lg:px-8 py-4",
    section7: "",
    section8: "max-w-[1540px] mx-auto lg:px-8",
};

export default async function Home() {
    const homePage = await getPage("home", homePageFallbackData);
    const content = homePage.content;

    const saved = (content.sectionsOrder || []) as SectionKey[];
    const known = new Set(saved);
    const order: SectionKey[] = [
        ...saved,
        ...DEFAULT_ORDER.filter((k) => !known.has(k)),
    ];

    return (
        <main className="min-h-screen">
            <div className="">
                {/* HERO — fixed first, always visible. */}
                <Hero content={content} />
                {order.map((key) => {
                    const visible = content[VISIBILITY_KEYS[key]] !== false;
                    if (!visible) return null;
                    const wrapper = SECTION_WRAPPERS[key];
                    const node = SECTION_RENDERERS[key](content);
                    return wrapper ? (
                        <div key={key} className={wrapper}>
                            {node}
                        </div>
                    ) : (
                        <div key={key}>{node}</div>
                    );
                })}
            </div>
        </main>
    );
}
