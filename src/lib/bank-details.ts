import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

/**
 * THE CLIENT'S BANK ACCOUNT, HELD RATHER THAN CHARGED.
 *
 * The agency does not take a payment in the portal. Accounting debits the
 * account later, out of band: "we're simply holding the details for
 * accounting to charge later so we don't need to take payment we just need
 * to store it."
 *
 * That makes this different from the card path beside it. A card never
 * touched us at all, because Pinch tokenised it in the browser. A BSB and an
 * account number together are enough to debit someone, so the moment we hold
 * them we are holding something worth stealing.
 *
 * So they are encrypted here, with a key that lives only in the server's
 * environment. The database holds ciphertext. A dump of it, on its own, buys
 * an attacker nothing.
 *
 * AES-256-GCM rather than CBC: it authenticates as well as encrypts, so a
 * tampered row fails to decrypt instead of returning a plausible wrong
 * number. Each field gets its own random 12-byte nonce, which is why two
 * clients with the same BSB do not produce the same ciphertext.
 */

const ALGORITHM = "aes-256-gcm";
const NONCE_BYTES = 12;
const KEY_BYTES = 32;

/**
 * Read the key, and say plainly what is wrong when it is not there.
 *
 * Deliberately not cached in a module-level constant: a missing key should
 * fail the one request that needs it, not the whole server at import time,
 * and the dashboard has plenty of pages that never touch a bank account.
 */
function readKey(): Buffer {
  const raw = process.env.BANK_DETAILS_KEY?.trim();
  if (!raw) {
    throw new Error(
      "BANK_DETAILS_KEY is not set. Bank details cannot be read or written " +
        "without it. Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"",
    );
  }
  const key = Buffer.from(raw, "hex");
  if (key.length !== KEY_BYTES) {
    throw new Error(
      `BANK_DETAILS_KEY must be ${KEY_BYTES} bytes as ${KEY_BYTES * 2} hex characters; got ${key.length}.`,
    );
  }
  return key;
}

/** Whether the key is present, so a caller can degrade rather than throw. */
export function bankDetailsConfigured(): boolean {
  try {
    readKey();
    return true;
  } catch {
    return false;
  }
}

/** `nonce.ciphertext.tag`, all base64url. One self-contained string per field. */
export function encryptField(plain: string): string {
  const key = readKey();
  const nonce = randomBytes(NONCE_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, nonce);
  const body = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    nonce.toString("base64url"),
    body.toString("base64url"),
    tag.toString("base64url"),
  ].join(".");
}

/** Throws on a tampered or truncated value rather than returning nonsense. */
export function decryptField(stored: string): string {
  const key = readKey();
  const parts = stored.split(".");
  if (parts.length !== 3) {
    throw new Error("Stored bank value is not in the expected format.");
  }
  const [nonceB64, bodyB64, tagB64] = parts as [string, string, string];
  const decipher = createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(nonceB64, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tagB64, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(bodyB64, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

/* ------------------------------------------------------------------ */
/*  What counts as a valid Australian account                         */
/* ------------------------------------------------------------------ */

/** Six digits. Written 083-004 as often as 083004, so punctuation is ignored. */
export function normaliseBsb(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  return digits.length === 6 ? digits : null;
}

/**
 * Australian account numbers run from six to ten digits depending on the
 * bank, so the check is a range rather than a fixed length.
 */
export function normaliseAccountNumber(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  return digits.length >= 6 && digits.length <= 10 ? digits : null;
}

/** What the dashboard shows instead of the number. */
export function lastThree(accountNumber: string): string {
  return accountNumber.slice(-3);
}

/** `083-004` — how a BSB is written on every form in the country. */
export function formatBsb(bsb: string): string {
  return `${bsb.slice(0, 3)}-${bsb.slice(3)}`;
}
