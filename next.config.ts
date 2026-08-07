import type { NextConfig } from "next";

// Use your Supabase project for storage/media (must match NEXT_PUBLIC_SUPABASE_URL in .env)
const supabaseHost =
  process.env.NEXT_PUBLIC_SUPABASE_URL != null
    ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
    : "bzswpetvdwzvznhvtote.supabase.co";

const nextConfig: NextConfig = {
  experimental: {
    serverComponentsHmrCache: false, // Disables the buggy local HMR cache
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: supabaseHost,
        port: "",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
