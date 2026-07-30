/**
 * Pinch Payments API client (server-side only)
 *
 * Handles authentication, payer creation, source vaulting,
 * and payment scheduling via the Pinch REST API.
 *
 * Docs: https://docs.getpinch.com.au
 */

const PINCH_API_URL =
  process.env.PINCH_API_URL || "https://api.sandbox.getpinch.com.au";
const PINCH_AUTH_URL =
  process.env.PINCH_AUTH_URL || "https://auth-sandbox.getpinch.com.au";
const PINCH_MERCHANT_ID = process.env.PINCH_MERCHANT_ID || "";
const PINCH_SECRET_KEY = process.env.PINCH_SECRET_KEY || "";

const PINCH_VERSION = "2020.1";

/* ------------------------------------------------------------------ */
/*  Auth – OAuth2 client-credentials flow                             */
/* ------------------------------------------------------------------ */

let cachedToken: { accessToken: string; expiresAt: number } | null = null;

export async function getPinchToken(): Promise<string> {
  if (!PINCH_MERCHANT_ID || !PINCH_SECRET_KEY) {
    throw new Error(
      "Pinch credentials not configured. Set PINCH_MERCHANT_ID and PINCH_SECRET_KEY."
    );
  }

  // Reuse token if still valid (with 60s buffer)
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.accessToken;
  }

  const res = await fetch(`${PINCH_AUTH_URL}/connect/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: PINCH_MERCHANT_ID,
      client_secret: PINCH_SECRET_KEY,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Pinch auth failed (${res.status}): ${body}`);
  }

  const json = await res.json();
  cachedToken = {
    accessToken: json.access_token as string,
    expiresAt: Date.now() + (json.expires_in as number) * 1000,
  };

  return cachedToken.accessToken;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

async function pinchFetch<T>(
  path: string,
  options: { method: string; body?: unknown }
): Promise<T> {
  const token = await getPinchToken();

  const res = await fetch(`${PINCH_API_URL}${path}`, {
    method: options.method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "pinch-version": PINCH_VERSION,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Pinch ${options.method} ${path} failed (${res.status}): ${body}`);
  }

  return res.json() as Promise<T>;
}

/* ------------------------------------------------------------------ */
/*  Payers                                                            */
/* ------------------------------------------------------------------ */

export interface PinchPayer {
  id: string;
  firstName: string;
  lastName: string;
  emailAddress: string;
}

export async function createPayer(data: {
  firstName: string;
  lastName: string;
  emailAddress: string;
  companyName?: string;
}): Promise<PinchPayer> {
  return pinchFetch<PinchPayer>("/payers", {
    method: "POST",
    body: data,
  });
}

/* ------------------------------------------------------------------ */
/*  Sources (vault a tokenised card)                                  */
/* ------------------------------------------------------------------ */

export interface PinchSource {
  id: string;
  sourceType: string;
}

export async function vaultSource(
  payerId: string,
  token: string
): Promise<PinchSource> {
  return pinchFetch<PinchSource>(`/payers/${payerId}/sources`, {
    method: "POST",
    body: { sourceToken: token },
  });
}

/* ------------------------------------------------------------------ */
/*  Payments                                                          */
/* ------------------------------------------------------------------ */

export interface PinchPayment {
  id: string;
  status: string;
}

export async function schedulePayment(
  payerId: string,
  sourceId: string,
  amountCents: number,
  date: string, // YYYY-MM-DD
  idempotencyKey: string
): Promise<PinchPayment> {
  return pinchFetch<PinchPayment>("/payments", {
    method: "POST",
    body: {
      payerId,
      sourceId,
      amount: amountCents / 100, // Pinch uses dollars
      transactionDate: date,
      description: "LickYourPhone campaign",
      idempotencyKey,
    },
  });
}

export async function chargeRealtime(
  payerId: string,
  sourceId: string,
  amountCents: number,
  idempotencyKey: string
): Promise<PinchPayment> {
  return pinchFetch<PinchPayment>("/payments/realtime", {
    method: "POST",
    body: {
      payerId,
      sourceId,
      amount: amountCents / 100,
      description: "LickYourPhone campaign – one-off",
      idempotencyKey,
    },
  });
}
