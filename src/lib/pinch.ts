/**
 * Pinch Payments API client (server-side only)
 *
 * Handles authentication, payer creation, source vaulting,
 * and payment scheduling via the Pinch REST API.
 *
 * Docs: https://docs.getpinch.com.au
 */

import axios from "axios";

const PINCH_API_URL =
  process.env.PINCH_API_URL || "https://api.getpinch.com.au/test";
const PINCH_AUTH_URL =
  process.env.PINCH_AUTH_URL || "https://auth.getpinch.com.au";
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
      "Pinch credentials not configured. Set PINCH_MERCHANT_ID and PINCH_SECRET_KEY.",
    );
  }

  // Reuse token if still valid (with 60s buffer)
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    console.log(
      `Using cached Pinch token (expires in ${Math.round(
        (cachedToken.expiresAt - Date.now()) / 1000,
      )}s)`,
    );
    return cachedToken.accessToken;
  }

  console.log(
    "Fetching new Pinch token from auth endpoint...",
    `${PINCH_AUTH_URL}/connect/token`,
  );

  const base64Credentials = Buffer.from(
    `${PINCH_MERCHANT_ID}:${PINCH_SECRET_KEY}`,
  ).toString("base64");

  const res = await fetch(`${PINCH_AUTH_URL}/connect/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${base64Credentials}`,
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
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
  options: { method: string; body?: unknown },
): Promise<T> {
  const token = await getPinchToken();

  console.log(`Pinch ${options.method} ${PINCH_API_URL}${path}`, options.body);

  try {
    const res = await axios.request<T>({
      url: `${PINCH_API_URL}${path}`,
      method: options.method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "pinch-version": PINCH_VERSION,
      },
      data: options.body,
    });

    return res.data;
  } catch (error: any) {
    console.error(
      `Pinch ${options.method} ${path} failed:`,
      error.response?.data || error.message,
    );
    throw new Error(`Pinch ${options.method} ${path} failed: ${error.message}`);
  }
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
  console.log("Creating Pinch payer with data:", data);
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
  token: string,
): Promise<PinchSource> {
  return pinchFetch<PinchSource>(`/payers/${payerId}/sources`, {
    method: "POST",
    body: {
      sourceType: "credit-card",
      token: token,
    },
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
  idempotencyKey: string,
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
  idempotencyKey: string,
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
