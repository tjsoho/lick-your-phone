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
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error(`Pinch ${options.method} ${path} failed:`, error.message);
      throw new Error(
        `Pinch ${options.method} ${path} failed: ${error.message}`,
      );
    }
    throw new Error(`Pinch ${options.method} ${path} failed: Unknown error`);
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

/**
 * THE CLIENT'S BANK ACCOUNT, HELD BY PINCH RATHER THAN BY US.
 *
 * The portal used to encrypt the BSB and the account number into our own
 * database, because the card path tokenised in the browser and there was
 * nothing equivalent for an account. There is: Pinch takes a bank account on
 * the same endpoint a card goes to, with `sourceType: "bank-account"`, and
 * holds it. We then hold nothing worth stealing.
 *
 * Two things to know, both confirmed against Pinch's own test environment
 * rather than read off a page:
 *
 * - Pinch raises a Direct Debit Request agreement itself, and marks it active
 *   the same second. So handing it an account is not a silent act, and the
 *   wording the client agrees to has to match that.
 * - The source comes back with `supportsRealtime: false`. An account can be
 *   debited on a schedule and never charged on the spot, which suits an
 *   agency that does not take payment in the portal at all.
 */
export async function vaultBankAccount(
  payerId: string,
  account: { accountName: string; bsb: string; accountNumber: string },
): Promise<PinchSource> {
  return pinchFetch<PinchSource>(`/payers/${payerId}/sources`, {
    method: "POST",
    body: {
      sourceType: "bank-account",
      bankAccountName: account.accountName,
      bankAccountBsb: account.bsb,
      bankAccountNumber: account.accountNumber,
    },
  });
}

export interface PinchPayerWithSources extends PinchPayer {
  sources: Array<{
    id: string;
    sourceType: string;
    bankAccountName: string | null;
    bankAccountBsb: string | null;
    bankAccountNumber: string | null;
  }>;
}

/**
 * Read a payer back, sources and all.
 *
 * Pinch returns the whole account number, which is what lets accounting see
 * what they are debiting without us keeping a copy. There is no endpoint for
 * a single source, so the payer is fetched and the one we want picked out.
 */
export async function getPayer(payerId: string): Promise<PinchPayerWithSources> {
  return pinchFetch<PinchPayerWithSources>(`/payers/${payerId}`, {
    method: "GET",
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
  description: string = "LickYourPhone campaign",
): Promise<PinchPayment> {
  return pinchFetch<PinchPayment>("/payments", {
    method: "POST",
    body: {
      payerId,
      sourceId,
      amount: amountCents, // Pinch uses cents for scheduled payments
      transactionDate: date,
      description,
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
      amount: amountCents, // Pinch uses cents for realtime payments
      description: "LickYourPhone campaign – one-off",
      idempotencyKey,
    },
  });
}
