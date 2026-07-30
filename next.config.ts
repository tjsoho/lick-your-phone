import type { NextConfig } from "next";

// Use your Supabase project for storage/media (must match NEXT_PUBLIC_SUPABASE_URL in .env)
const supabaseHost =
  process.env.NEXT_PUBLIC_SUPABASE_URL != null
    ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
    : "bzswpetvdwzvznhvtote.supabase.co";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "cdn.shopify.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: supabaseHost,
        port: "",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "cdn.imagin.studio",
        port: "",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
