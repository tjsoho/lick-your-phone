import { headers } from "next/headers";

/**
 * Hosts we are willing to build public links for.
 *
 * The base URL is normally derived from the incoming request so that any
 * localhost port and any deployment domain work without configuration. Because
 * the Host header is attacker-controllable, and these URLs get emailed to
 * clients with proposal tokens in them, the derived host is checked against
 * this list before it is trusted.
 */
const ALLOWED_HOST_PATTERNS: RegExp[] = [
  /^localhost(:\d+)?$/i, // any port
  /^127\.0\.0\.1(:\d+)?$/,
  /^\[::1\](:\d+)?$/,
  /^([a-z0-9-]+\.)*lick-your-phone\.vercel\.app$/i,
  /^([a-z0-9-]+\.)*lickyourphone\.com(\.au)?$/i,
];

const FALLBACK_URL = "http://localhost:3000";

function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

function isAllowedHost(host: string): boolean {
  return ALLOWED_HOST_PATTERNS.some((pattern) => pattern.test(host));
}

function isLoopback(host: string): boolean {
  return /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i.test(host);
}

/**
 * Absolute base URL for links that leave the app (emails, webhooks, PDFs).
 *
 * Resolution order:
 *   1. NEXT_PUBLIC_APP_URL — explicit override, always wins.
 *   2. The incoming request's host — covers any localhost port and any
 *      allow-listed deployment domain with no configuration.
 *   3. Vercel's own domain vars — for contexts with no request (cron, build).
 *   4. localhost:3000.
 *
 * Never returns a trailing slash, so `${await getAppUrl()}/portal/x` is safe.
 */
export async function getAppUrl(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) return stripTrailingSlash(configured);

  try {
    const headerList = await headers();
    const host = headerList.get("x-forwarded-host") ?? headerList.get("host");

    if (host && isAllowedHost(host)) {
      const protocol =
        headerList.get("x-forwarded-proto") ?? (isLoopback(host) ? "http" : "https");
      return `${protocol}://${host}`;
    }
  } catch {
    // Called outside a request scope (cron job, build step) — fall through.
  }

  const vercelHost =
    process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  if (vercelHost) return `https://${stripTrailingSlash(vercelHost)}`;

  return FALLBACK_URL;
}
