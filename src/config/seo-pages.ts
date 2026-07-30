export type SeoPageConfig = {
  slug: string;
  path: string;
  label: string;
  defaultTitle: string;
  defaultDescription: string;
  defaultKeywords?: string;
  revalidatePaths?: string[];
};

/**
 * Per-route SEO defaults. The template ships only the Home page — add an
 * entry here whenever you add a new page so it shows up in /admin/seo.
 */
export const seoPages: SeoPageConfig[] = [
  {
    slug: "home",
    path: "/",
    label: "Home",
    defaultTitle: "Home | Your Site",
    defaultDescription:
      "A starter template. Replace this description with a short, compelling summary of your site.",
    defaultKeywords: "template, starter, website",
  },
];
