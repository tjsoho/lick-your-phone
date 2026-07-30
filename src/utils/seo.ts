import type { Metadata } from "next";
import { seoPages } from "@/config/seo-pages";
import { fetchSeoEntry } from "@/data/seo";

const DEFAULT_TITLE = "Your Site";
const DEFAULT_DESCRIPTION = "A starter website template. Replace this with a short, compelling summary of your site.";
const DEFAULT_KEYWORDS = "template, starter, website";

export async function buildPageMetadata(
  slug: string,
  overrides?: Partial<Metadata>
): Promise<Metadata> {
  // Find page config for fallback values
  const pageConfig = seoPages.find((page) => page.slug === slug);
  const fallbackTitle = pageConfig?.defaultTitle ?? DEFAULT_TITLE;
  const fallbackDescription =
    pageConfig?.defaultDescription ?? DEFAULT_DESCRIPTION;
  const fallbackKeywords = pageConfig?.defaultKeywords ?? DEFAULT_KEYWORDS;

  // Fetch stored entry from database
  const storedEntry = await fetchSeoEntry(slug);
  const title = storedEntry?.meta_title ?? fallbackTitle;
  const description = storedEntry?.meta_description ?? fallbackDescription;
  const keywords = storedEntry?.keywords ?? fallbackKeywords;

  // Build canonical URL
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://example.com";
  const canonicalPath = pageConfig?.path ?? "/";
  const canonicalUrl = `${baseUrl}${canonicalPath}`;

  return {
    title,
    description,
    keywords: keywords ? keywords.split(",").map((k) => k.trim()) : undefined,
    robots: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    ...overrides,
  };
}

/**
 * Build metadata for blog posts, research articles, and indication posts
 * Uses stored SEO fields with fallbacks to post title/excerpt
 */
export function buildPostMetadata(
  post: {
    title: string;
    excerpt?: string;
    meta_title?: string;
    meta_description?: string;
    keywords?: string;
    slug: string;
    cover_image?: string;
  },
  basePath: string, // e.g., "/blog/posts", "/research", "/hyperbaric-indications"
  overrides?: Partial<Metadata>
): Metadata {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://example.com";
  const canonicalUrl = `${baseUrl}${basePath}/${post.slug}`;

  // Use stored SEO fields, fallback to post title/excerpt
  const title = post.meta_title || post.title;
  const description =
    post.meta_description || post.excerpt || DEFAULT_DESCRIPTION;
  const keywords = post.keywords || undefined;

  return {
    title,
    description,
    keywords: keywords ? keywords.split(",").map((k) => k.trim()) : undefined,
    robots: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      type: "article",
      images: post.cover_image ? [post.cover_image] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: post.cover_image ? [post.cover_image] : undefined,
    },
    ...overrides,
  };
}



