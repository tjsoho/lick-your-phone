import axios from "axios";

/**
 * THE SIGNED CONTRACT, HANDED STRAIGHT TO MAKE.
 *
 * Make's contract scenario used to read everything back out of PandaDoc by
 * document id. The portal is the document now, so it has to send the whole
 * picture itself: "2b can no longer re-fetch from PandaDoc by doc_id, so the
 * portal needs to send the full information."
 *
 * The shape below is flat on purpose. Every field maps onto one variable the
 * scenario already branches on, so nothing in Make has to unpack an array or
 * guess at a name.
 */

const MAKE_CONTRACT_WEBHOOK_URL = process.env.MAKE_CONTRACT_WEBHOOK_URL;

/** Punctuation and case vary between the two systems; meaning does not. */
const norm = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/**
 * Portal service names, against the flags the Make scenario reads.
 *
 * Make asks "MetaAds = Yes?" and branches. It has no idea what a service is
 * called here, so the translation happens once, in this file, where it can
 * be read and corrected. A service that appears in neither list simply does
 * not turn a flag on.
 */
const SERVICE_FLAGS: Record<string, string[]> = {
  meta_ads: ["meta digital ads"],
  tiktok_ads: ["tiktok digital ads"],
  influencer_marketing: ["influencer marketing"],
  influencer_event: ["media event"],
  lyp_partnership: [
    "exclusive brand partnership",
    "paid partnership",
    "complimentary brand partnership",
  ],
  videography: ["videography reels", "videography reels subscription"],
  photography: ["photography images"],
  community_management: ["community management"],
};

/** Buffet Investment is an ordinary service here and a team flag in Make. */
const BUFFET = ["buffet investment"];

/**
 * Make routes on four values, and two of them are cities rather than states.
 * NSW and QLD are states, MEL and PER are Melbourne and Perth, so Victoria
 * and Western Australia have to be translated rather than passed through.
 * Anything unrecognised falls through to QLD, which is what the scenario
 * already does with a location it does not know.
 */
function locationFor(address: string): string {
  const a = ` ${norm(address)} `;
  if (/ nsw | new south wales | sydney /.test(a)) return "nsw";
  if (/ vic | victoria | melbourne /.test(a)) return "mel";
  if (/ wa | western australia | perth /.test(a)) return "per";
  if (/ qld | queensland | brisbane /.test(a)) return "qld";
  return "";
}

/** "Jane Mary Doe" becomes Jane / Mary Doe, which is how the contract reads. */
function splitName(full: string): { first: string; last: string } {
  const parts = full.trim().split(/\s+/);
  if (parts.length <= 1) return { first: full.trim(), last: "" };
  return { first: parts[0], last: parts.slice(1).join(" ") };
}

export interface MakeContractInput {
  proposalId: string;
  clientName: string;
  venueName: string;
  venueAddress: string;
  signerEmail: string;
  abn?: string | null;
  notes?: string | null;
  totalCents: number;
  signedAt: string;
  contractUrl: string;
  /** Where the client fills in their onboarding. The portal, not Jotform. */
  intakeUrl: string;
  lineItems: Array<{
    serviceName: string;
    priceCents: number;
    billing: string;
    term?: string | null;
  }>;
}

export function buildMakeContractPayload(input: MakeContractInput) {
  const signed = input.lineItems.map((li) => norm(li.serviceName));
  const has = (keys: string[]) => keys.some((k) => signed.includes(k));
  const yes = (on: boolean) => (on ? "Yes" : "No");

  const services = Object.fromEntries(
    Object.entries(SERVICE_FLAGS).map(([flag, names]) => [flag, yes(has(names))]),
  ) as Record<keyof typeof SERVICE_FLAGS, string>;

  /** The term a service was sold on, where the line item carries one. */
  const termFor = (names: string[]) =>
    input.lineItems.find((li) => names.includes(norm(li.serviceName)))?.term ?? "";

  const { first, last } = splitName(input.clientName);

  return {
    record_id: input.proposalId,
    business_name: input.venueName || input.clientName,
    abn: input.abn ?? "",
    contact: {
      first_name: first,
      last_name: last,
      email: input.signerEmail,
    },
    location: locationFor(input.venueAddress),
    signed_at: input.signedAt,
    contract_pdf_url: input.contractUrl,
    intake_url: input.intakeUrl,
    contract_pdf_filename: `${input.venueName || input.clientName} signed contract.pdf`,
    notes: input.notes ?? "",
    services,
    terms: {
      meta_ads: termFor(SERVICE_FLAGS.meta_ads),
      tiktok_ads: termFor(SERVICE_FLAGS.tiktok_ads),
      influencer: termFor(SERVICE_FLAGS.influencer_marketing),
      videography: termFor(SERVICE_FLAGS.videography),
    },
    /**
     * These three decide which questions the onboarding form asks, so an
     * empty one quietly shortens the form. Two are read off the services
     * that were actually signed. `main_investment` means the client bought
     * something other than the complimentary Buffet Investment, which is
     * the only reading of it the signed services support.
     */
    team_flags: {
      buffet_investment: yes(has(BUFFET)),
      main_investment: yes(signed.some((s) => !BUFFET.includes(s))),
      tiktok_marketing: services.tiktok_ads,
    },
    pricing: {
      currency: "AUD",
      total: input.totalCents / 100,
      items: input.lineItems.map((li) => ({
        name: li.serviceName,
        price: li.priceCents / 100,
        billing: li.billing,
      })),
    },
  };
}

/**
 * Fired alongside the existing n8n notification, not instead of it, so
 * nothing that works today stops working while this is being proved out.
 */
export async function sendContractToMake(input: MakeContractInput) {
  if (!MAKE_CONTRACT_WEBHOOK_URL) {
    console.warn("[make] MAKE_CONTRACT_WEBHOOK_URL missing, nothing sent");
    return;
  }
  const payload = buildMakeContractPayload(input);
  try {
    await axios.post(MAKE_CONTRACT_WEBHOOK_URL, payload, {
      headers: { "Content-Type": "application/json" },
      timeout: 15000,
    });
    console.log(`[make] contract ${input.proposalId} sent`);
  } catch (err) {
    console.error(`[make] contract ${input.proposalId} failed:`, err);
  }
}
