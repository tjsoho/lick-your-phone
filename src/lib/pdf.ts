import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  Font,
  renderToBuffer,
} from "@react-pdf/renderer";

/* ------------------------------------------------------------------ */
/*  Brand tokens                                                      */
/* ------------------------------------------------------------------ */

const CHERRY = "#B22626";
const BLACK = "#000000";
const MAROON = "#6D080A";
const OFF_WHITE = "#EEE7E7";
// WHITE (#FFFFFF) used directly in stroke styles below

/* ------------------------------------------------------------------ */
/*  Fonts                                                             */
/* ------------------------------------------------------------------ */

const rootDir = process.cwd();
const firaSansBoldPath = `${rootDir}/public/FiraSans-Bold.ttf`;
const firaSansRegularPath = `${rootDir}/public/FiraSans-Regular.ttf`;

Font.register({
  family: "Fira Sans",
  fonts: [
    {
      src: firaSansBoldPath,
      fontWeight: 700,
    },
    {
      src: firaSansRegularPath,
      fontWeight: 400,
    },
  ],
});

Font.register({
  family: "Montserrat",
  fonts: [
    {
      src: "https://fonts.gstatic.com/s/montserrat/v26/JTUHjIg1_i6t8kCHKm4532VJOt5-QNFgpCtr6Ew-.ttf",
      fontWeight: 400,
    },
  ],
});

/* ------------------------------------------------------------------ */
/*  Styles                                                            */
/* ------------------------------------------------------------------ */

const s = StyleSheet.create({
  page: {
    paddingTop: 50,
    paddingBottom: 60,
    paddingHorizontal: 50,
    fontFamily: "Montserrat",
    fontSize: 10,
    color: BLACK,
  },
  headerBar: {
    backgroundColor: CHERRY,
    height: 6,
    marginBottom: 20,
    borderRadius: 3,
  },
  brandName: {
    fontFamily: "Fira Sans",
    fontWeight: 700,
    fontSize: 22,
    color: CHERRY,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 10,
    color: "#666666",
    marginBottom: 24,
  },
  sectionTitle: {
    fontFamily: "Fira Sans",
    fontWeight: 700,
    fontSize: 14,
    color: MAROON,
    marginBottom: 10,
    marginTop: 20,
    borderBottomWidth: 1,
    borderBottomColor: OFF_WHITE,
    paddingBottom: 4,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 5,
    paddingHorizontal: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: "#E0E0E0",
  },
  rowAlt: {
    backgroundColor: "#FAFAFA",
  },
  rowName: {
    fontSize: 10,
    flex: 1,
  },
  rowBilling: {
    fontSize: 9,
    color: "#888888",
    width: 90,
    textAlign: "center",
  },
  rowPrice: {
    fontFamily: "Fira Sans",
    fontWeight: 700,
    fontSize: 10,
    width: 90,
    textAlign: "right",
  },
  totalsBlock: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 2,
    borderTopColor: CHERRY,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
  },
  totalLabel: {
    fontFamily: "Fira Sans",
    fontWeight: 700,
    fontSize: 13,
    color: MAROON,
  },
  totalAmount: {
    fontFamily: "Fira Sans",
    fontWeight: 700,
    fontSize: 13,
    color: CHERRY,
  },
  /* One-off payments: a real total, but never the one the page leads with. */
  subTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginTop: 8,
  },
  subTotalLabel: {
    fontFamily: "Fira Sans",
    fontWeight: 700,
    fontSize: 10.5,
    color: MAROON,
  },
  subTotalAmount: {
    fontFamily: "Fira Sans",
    fontWeight: 700,
    fontSize: 10.5,
    color: BLACK,
  },
  /* The whole-of-contract figure. Present, exact, and plainly secondary. */
  contractTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginTop: 10,
    paddingTop: 6,
    borderTopWidth: 0.5,
    borderTopColor: "#E0E0E0",
  },
  contractTotalLabel: {
    fontSize: 9.5,
    color: "#555555",
  },
  contractTotalAmount: {
    fontFamily: "Fira Sans",
    fontWeight: 700,
    fontSize: 9.5,
    color: "#555555",
  },
  totalsNote: {
    fontSize: 8,
    lineHeight: 1.5,
    color: "#666666",
    marginTop: 3,
  },
  termsText: {
    fontSize: 9,
    lineHeight: 1.6,
    color: "#444444",
    marginBottom: 6,
  },
  signatureBlock: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 30,
  },
  signatureBox: {
    width: "45%",
  },
  signatureLabel: {
    fontSize: 9,
    color: "#888888",
    marginBottom: 4,
  },
  /* The rule is always drawn, with the signature laid on it rather than in
     place of it: an image that fails to load then leaves a signature line
     under the name, never an unexplained gap where a signature should be. */
  signatureSlot: {
    borderBottomWidth: 1,
    borderBottomColor: BLACK,
    height: 44,
    justifyContent: "flex-end",
    marginBottom: 4,
  },
  signatureDate: {
    fontSize: 8,
    color: "#888888",
  },
  footer: {
    position: "absolute",
    bottom: 25,
    left: 50,
    right: 50,
    textAlign: "center",
    fontSize: 8,
    color: "#AAAAAA",
  },
  signatureImage: {
    height: 36,
    objectFit: "contain",
    alignSelf: "flex-start",
    marginBottom: 2,
  },
});

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface PdfLineItem {
  name: string;
  tierName: string | null;
  billing: "one_off" | "recurring_monthly" | "in_kind";
  priceCents: number;
  term: string | null;
  billingCycleMonths: number;
  /** What the client is buying, printed under the service name. */
  inclusions?: string[];
}

export interface PdfContractInput {
  /** The client record's own name — the person, once records are migrated. */
  clientName: string;
  /** The person signing; resolved by the caller from contact_name ?? name. */
  contactName?: string | null;
  venueName: string;
  lineItems: PdfLineItem[];
  totalCents: number;
  /** Clauses from Agreement Settings; falls back to none if unset. */
  termsClauses?: string[];
  countersignatureImage?: string | null;
  countersignatureName?: string;
  countersignatureTitle?: string;
  signerEmail: string;
  signedAt: string;
  signatureDataUrl?: string;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function formatCents(cents: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function billingLabel(billing: string): string {
  if (billing === "recurring_monthly") return "Monthly";
  if (billing === "one_off") return "One-off";
  return "Complimentary";
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * What the client is asked to pay, split the way the portal's summary splits
 * it, so the contract and the screen they signed from never disagree.
 *
 * Prices reach this file already normalised to a month — a service priced by
 * the week is converted at × 52 ÷ 12 by the caller — so a recurring line's
 * `priceCents` is always a monthly amount. One-off payments are kept apart
 * rather than folded into the monthly figure, and complimentary lines count
 * towards neither.
 */
function summariseTotals(items: PdfLineItem[]) {
  let monthlyCents = 0;
  let oneOffCents = 0;
  let oneOffCount = 0;
  const terms = new Set<number>();

  for (const item of items) {
    if (item.billing === "recurring_monthly") {
      monthlyCents += item.priceCents;
      terms.add(item.billingCycleMonths || 1);
    } else if (item.billing === "one_off") {
      oneOffCents += item.priceCents;
      oneOffCount += 1;
    }
  }

  return {
    monthlyCents,
    oneOffCents,
    oneOffCount,
    /** One number when every monthly service runs the same term, else null. */
    sharedTermMonths: terms.size === 1 ? [...terms][0] : null,
    /** True once any monthly service runs past its first month. */
    spansMonths: [...terms].some((months) => months > 1),
  };
}

/* ------------------------------------------------------------------ */
/*  Signature images                                                  */
/* ------------------------------------------------------------------ */

/** The two raster formats the PDF generator can actually decode. */
type SignatureImage = { data: Buffer; format: "png" | "jpg" };

/**
 * Identify an image by its bytes rather than by its name or its content type.
 *
 * The media library re-encodes uploads to WebP, which the PDF generator
 * cannot read: handed one, it warns to the server log and lays out a
 * zero-sized image, so the contract comes out with an empty space where the
 * counter-signature should be and nothing anywhere says why. Sniffing the
 * bytes here is what lets us fall back to a signature line instead.
 */
function sniffSignatureFormat(bytes: Buffer): SignatureImage["format"] | null {
  if (
    bytes.length > 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return "png";
  }
  if (
    bytes.length > 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return "jpg";
  }
  return null;
}

/**
 * Fetch a signature once, ourselves, so an unreadable one is known about
 * before the document is laid out. Never throws: signing a proposal must not
 * fail because a stored image moved, and a contract without an image is a
 * contract with a signature line, which is still a valid document.
 */
async function resolveSignatureImage(
  src: string | null | undefined,
): Promise<SignatureImage | null> {
  if (!src) return null;

  try {
    let bytes: Buffer;

    const dataUrl = /^data:image\/[a-z0-9.+-]+;base64,([\s\S]+)$/i.exec(src);
    if (dataUrl) {
      bytes = Buffer.from(dataUrl[1], "base64");
    } else if (/^https?:\/\//i.test(src)) {
      const response = await fetch(src, { signal: AbortSignal.timeout(8000) });
      if (!response.ok) return null;
      bytes = Buffer.from(await response.arrayBuffer());
    } else {
      return null;
    }

    const format = sniffSignatureFormat(bytes);
    if (!format) {
      console.warn(
        `Contract signature image is not a PNG or JPEG and was left off the document: ${src.slice(0, 120)}`,
      );
      return null;
    }

    return { data: bytes, format };
  } catch (error) {
    console.warn("Could not read a contract signature image:", error);
    return null;
  }
}

/* ------------------------------------------------------------------ */
/*  Public API                                                        */
/* ------------------------------------------------------------------ */

export async function generateContractPdf(
  input: PdfContractInput,
): Promise<Buffer> {
  // Both signatures are resolved before layout, so an image the generator
  // cannot decode becomes a signature line rather than an empty space.
  const [clientSignature, countersignature] = await Promise.all([
    resolveSignatureImage(input.signatureDataUrl),
    resolveSignatureImage(input.countersignatureImage),
  ]);

  const doc = createContractDocument(input, {
    clientSignature,
    countersignature,
  });
  const buffer = await renderToBuffer(doc);
  return Buffer.from(buffer);
}

function createContractDocument(
  input: PdfContractInput,
  signatures: {
    clientSignature: SignatureImage | null;
    countersignature: SignatureImage | null;
  },
) {
  const dateStr = formatDate(input.signedAt);
  const totals = summariseTotals(input.lineItems);

  /* The whole-of-contract figure is the caller's own — the same number stored
     against the proposal — so the document and the agency's reporting can
     never drift apart. It is only printed when it says something the two
     figures above it do not: with nothing running past its first month it
     would just repeat them. */
  const showContractTotal = totals.spansMonths;

  return React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: "A4" as const, style: s.page },

      /* Header bar */
      React.createElement(View, { style: s.headerBar }),

      /* Brand */
      React.createElement(Text, { style: s.brandName }, "LickYourPhone Media"),
      React.createElement(
        Text,
        { style: s.subtitle },
        // Venue first, then the person signing — and never the same name
        // twice, since older records repeat the person in both fields.
        `Service Agreement for ${
          [input.venueName, input.contactName]
            .filter(
              (part, i, parts): part is string =>
                !!part && parts.indexOf(part) === i,
            )
            .join(" — ") || input.clientName
        }`,
      ),

      /* Services table */
      React.createElement(Text, { style: s.sectionTitle }, "Selected Services"),

      /* Table header */
      React.createElement(
        View,
        {
          style: {
            ...s.row,
            borderBottomWidth: 1,
            borderBottomColor: MAROON,
          },
        },
        React.createElement(
          Text,
          {
            style: {
              ...s.rowName,
              fontFamily: "Fira Sans",
              fontWeight: 700,
              fontSize: 9,
            },
          },
          "Service",
        ),
        React.createElement(
          Text,
          {
            style: {
              ...s.rowBilling,
              fontFamily: "Fira Sans",
              fontWeight: 700,
              fontSize: 9,
            },
          },
          "Billing",
        ),
        React.createElement(
          Text,
          {
            style: {
              ...s.rowPrice,
              fontFamily: "Fira Sans",
              fontWeight: 700,
              fontSize: 9,
            },
          },
          "Price (ex GST)",
        ),
      ),

      /* Line items */
      ...input.lineItems.map((item, i) => {
        // Hitung total baris ini jika layanan bulanan
        const itemTotalCents =
          item.billing === "recurring_monthly"
            ? item.priceCents * (item.billingCycleMonths || 1)
            : item.priceCents;

        return React.createElement(
          View,
          { key: i, style: { ...s.row, ...(i % 2 === 1 ? s.rowAlt : {}) } },

          // Kolom 1: Nama Layanan + Deskripsi Term
          React.createElement(
            View,
            { style: s.rowName },
            React.createElement(
              Text,
              null,
              item.tierName ? `${item.name} (${item.tierName})` : item.name,
            ),
            item.term
              ? React.createElement(
                  Text,
                  { style: { fontSize: 8, color: "#666666", marginTop: 3 } },
                  item.term,
                )
              : null,

            // What they are actually hiring us for, so the contract stands
            // on its own without the proposal beside it.
            ...(item.inclusions ?? []).map((text, inc) =>
              React.createElement(
                Text,
                {
                  key: `inc-${inc}`,
                  style: {
                    fontSize: 7.5,
                    color: "#555555",
                    marginTop: inc === 0 ? 4 : 2,
                    paddingLeft: 8,
                  },
                },
                `• ${text}`,
              ),
            ),
          ),

          // Kolom 2: Tipe Billing
          React.createElement(
            Text,
            { style: s.rowBilling },
            billingLabel(item.billing),
          ),

          // Kolom 3: Harga (Bulanan + Total)
          React.createElement(
            View,
            { style: s.rowPrice },
            React.createElement(
              Text,
              null,
              item.billing === "in_kind"
                ? "—"
                : `${formatCents(item.priceCents)}${item.billing === "recurring_monthly" ? "/mo" : ""}`,
            ),
            /* How long it runs and what that comes to, said in that order:
               the term is the thing that makes the larger number make sense. */
            item.billing === "recurring_monthly" && item.billingCycleMonths > 1
              ? React.createElement(
                  Text,
                  { style: { fontSize: 7, color: "#666666", marginTop: 2 } },
                  `× ${item.billingCycleMonths} months`,
                )
              : null,
            item.billing === "recurring_monthly" && item.billingCycleMonths > 1
              ? React.createElement(
                  Text,
                  { style: { fontSize: 7, color: "#666666", marginTop: 1 } },
                  `${formatCents(itemTotalCents)} total`,
                )
              : null,
          ),
        );
      }),

      /* Totals.

         What the client pays each month leads, because that is the figure
         they actually have to find — the whole-of-contract number read as the
         headline made a perfectly ordinary monthly retainer look like a bill
         due on signing. One-off payments sit beside it rather than inside it,
         and the whole-of-contract total stays on the page, exact and
         explained, so nothing about what is owed or for how long is lost. */
      React.createElement(
        View,
        { style: s.totalsBlock },

        totals.monthlyCents > 0
          ? React.createElement(
              View,
              { style: s.totalRow },
              React.createElement(
                Text,
                { style: s.totalLabel },
                "Monthly Total (ex GST)",
              ),
              React.createElement(
                Text,
                { style: s.totalAmount },
                `${formatCents(totals.monthlyCents)} per month`,
              ),
            )
          : null,

        totals.monthlyCents > 0
          ? React.createElement(
              Text,
              { style: s.totalsNote },
              totals.sharedTermMonths == null
                ? "Payable each month, for the term shown against each service above."
                : totals.sharedTermMonths > 1
                  ? `Payable each month for ${totals.sharedTermMonths} months.`
                  : "Payable each month.",
            )
          : null,

        /* With nothing recurring, the one-off figure is the only total there
           is and takes the headline. Beside a monthly total it steps back, so
           the two are never read as one number. */
        totals.oneOffCents > 0
          ? React.createElement(
              View,
              {
                style:
                  totals.monthlyCents > 0 ? s.subTotalRow : s.totalRow,
              },
              React.createElement(
                Text,
                {
                  style:
                    totals.monthlyCents > 0 ? s.subTotalLabel : s.totalLabel,
                },
                totals.oneOffCount === 1
                  ? "One-off Payment (ex GST)"
                  : "One-off Payments (ex GST)",
              ),
              React.createElement(
                Text,
                {
                  style:
                    totals.monthlyCents > 0 ? s.subTotalAmount : s.totalAmount,
                },
                formatCents(totals.oneOffCents),
              ),
            )
          : null,

        totals.oneOffCents > 0
          ? React.createElement(
              Text,
              { style: s.totalsNote },
              totals.monthlyCents > 0
                ? "Payable once, not each month, and not included in the monthly total above."
                : "Payable once. Nothing in this agreement recurs monthly.",
            )
          : null,

        totals.monthlyCents === 0 && totals.oneOffCents === 0
          ? React.createElement(
              View,
              { style: s.totalRow },
              React.createElement(
                Text,
                { style: s.totalLabel },
                "Total Payable (ex GST)",
              ),
              React.createElement(Text, { style: s.totalAmount }, "Nil"),
            )
          : null,

        showContractTotal
          ? React.createElement(
              View,
              { style: s.contractTotalRow },
              React.createElement(
                Text,
                { style: s.contractTotalLabel },
                "Total value over the full contract term (ex GST)",
              ),
              React.createElement(
                Text,
                { style: s.contractTotalAmount },
                formatCents(input.totalCents),
              ),
            )
          : null,

        showContractTotal
          ? React.createElement(
              Text,
              { style: s.totalsNote },
              "Every monthly payment over the term set out above, plus any one-off payments. It is the value of this agreement across its whole term, not an amount due on signing: each monthly payment falls due in its own month.",
            )
          : null,

        React.createElement(
          Text,
          { style: s.totalsNote },
          "All amounts are exclusive of GST.",
        ),
      ),

      /* Contract terms */
      React.createElement(
        Text,
        { style: s.sectionTitle },
        "Terms & Conditions",
      ),
      // Clauses are authored in Agreement Settings and numbered here, so
      // adding a service's terms never means touching this file.
      ...(input.termsClauses ?? []).map((clause, i) =>
        React.createElement(
          Text,
          { key: `term-${i}`, style: s.termsText },
          `${i + 1}. ${clause}`,
        ),
      ),

      /* Signature blocks */
      React.createElement(Text, { style: s.sectionTitle }, "Signatures"),
      React.createElement(
        View,
        { style: s.signatureBlock },
        /* Client signature */
        React.createElement(
          View,
          { style: s.signatureBox },
          React.createElement(Text, { style: s.signatureLabel }, "Client"),
          React.createElement(
            View,
            { style: s.signatureSlot },
            signatures.clientSignature
              ? React.createElement(Image, {
                  style: s.signatureImage,
                  src: signatures.clientSignature,
                })
              : null,
          ),
          React.createElement(
            Text,
            { style: { fontSize: 9 } },
            input.signerEmail,
          ),
          React.createElement(
            Text,
            { style: s.signatureDate },
            `Signed: ${dateStr}`,
          ),
        ),
        /* Agency signature */
        React.createElement(
          View,
          { style: s.signatureBox },
          React.createElement(
            Text,
            { style: s.signatureLabel },
            "LickYourPhone Media",
          ),
          React.createElement(
            View,
            { style: s.signatureSlot },
            signatures.countersignature
              ? React.createElement(Image, {
                  style: s.signatureImage,
                  src: signatures.countersignature,
                })
              : null,
          ),
          React.createElement(
            Text,
            { style: { fontSize: 9 } },
            [input.countersignatureName, input.countersignatureTitle]
              .filter(Boolean)
              .join(" — ") || "Authorised Representative",
          ),
          React.createElement(
            Text,
            { style: s.signatureDate },
            `Signed: ${dateStr}`,
          ),
        ),
      ),

      /* Footer */
      React.createElement(
        Text,
        { style: s.footer },
        `LickYourPhone Media — Service Agreement — Generated ${dateStr}`,
      ),
    ),
  );
}

/* ------------------------------------------------------------------ */
/*  Terms & Conditions document                                       */
/* ------------------------------------------------------------------ */

const termsStyles = StyleSheet.create({
  intro: {
    fontSize: 9,
    lineHeight: 1.6,
    color: "#666666",
    marginBottom: 2,
  },
  clauseRow: {
    flexDirection: "row",
    marginBottom: 9,
  },
  clauseNumber: {
    fontFamily: "Fira Sans",
    fontWeight: 700,
    fontSize: 9.5,
    color: CHERRY,
    width: 20,
  },
  clauseText: {
    fontSize: 9.5,
    lineHeight: 1.6,
    color: "#333333",
    flex: 1,
  },
});

export interface PdfTermsInput {
  /** One clause per entry, exactly as Agreement Settings holds them. */
  clauses: string[];
  /** Printed on the cover line, so the client's copy is addressed to them. */
  venueName?: string | null;
  clientName?: string | null;
  /** ISO timestamp; the terms are dated so an old download is recognisable. */
  generatedAt: string;
}

/**
 * The workspace's terms on their own.
 *
 * Same generator, same fonts and the same furniture as the signed contract —
 * the client's copy of the terms should not look like it came from somewhere
 * else — but with no prices, no signature blocks and nothing about this
 * proposal beyond the name it was produced for. The clauses are whatever
 * Agreement Settings holds at the moment of the download, so there is no
 * second copy of the terms for the agency to keep in step.
 */
export async function generateTermsPdf(input: PdfTermsInput): Promise<Buffer> {
  const buffer = await renderToBuffer(createTermsDocument(input));
  return Buffer.from(buffer);
}

function createTermsDocument(input: PdfTermsInput) {
  const dateStr = formatDate(input.generatedAt);

  // Venue first, then the person — and never the same name twice, the way
  // the contract's own subtitle handles older records that repeat it.
  const forName = [input.venueName, input.clientName]
    .filter(
      (part, i, parts): part is string =>
        !!part && parts.indexOf(part) === i,
    )
    .join(" — ");

  return React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: "A4" as const, style: s.page },

      React.createElement(View, { style: s.headerBar }),
      React.createElement(Text, { style: s.brandName }, "LickYourPhone Media"),
      React.createElement(
        Text,
        { style: s.subtitle },
        forName
          ? `Terms & Conditions — prepared for ${forName}`
          : "Terms & Conditions",
      ),

      React.createElement(
        Text,
        { style: termsStyles.intro },
        `These terms form part of any service agreement signed with LickYourPhone Media. Current as at ${dateStr}.`,
      ),

      React.createElement(Text, { style: s.sectionTitle }, "The Terms"),

      ...input.clauses.map((clause, i) =>
        React.createElement(
          View,
          { key: `clause-${i}`, style: termsStyles.clauseRow },
          React.createElement(
            Text,
            { style: termsStyles.clauseNumber },
            `${i + 1}.`,
          ),
          React.createElement(Text, { style: termsStyles.clauseText }, clause),
        ),
      ),

      /* Fixed, so a long set of terms carries the footer onto every page. */
      React.createElement(Text, {
        style: s.footer,
        fixed: true,
        render: ({
          pageNumber,
          totalPages,
        }: {
          pageNumber: number;
          totalPages: number;
        }) =>
          `LickYourPhone Media — Terms & Conditions — ${dateStr} — Page ${pageNumber} of ${totalPages}`,
      }),
    ),
  );
}

/* ------------------------------------------------------------------ */
/*  Onboarding answers document                                       */
/* ------------------------------------------------------------------ */

const intakeStyles = StyleSheet.create({
  intro: {
    fontSize: 9,
    lineHeight: 1.6,
    color: "#666666",
    marginBottom: 2,
  },
  /* A section inside a page of the form — quieter than the page's own
     heading, which reuses the contract's `sectionTitle`. */
  sectionHeading: {
    fontFamily: "Fira Sans",
    fontWeight: 700,
    fontSize: 10,
    color: CHERRY,
    marginTop: 14,
    marginBottom: 6,
  },
  questionBlock: {
    marginBottom: 9,
  },
  questionLabel: {
    fontSize: 8,
    color: "#888888",
    marginBottom: 2,
  },
  answerText: {
    fontSize: 10,
    lineHeight: 1.5,
  },
  bulletRow: {
    flexDirection: "row",
    marginBottom: 1,
  },
  bulletMark: {
    fontSize: 10,
    color: CHERRY,
    width: 10,
  },
  bulletText: {
    fontSize: 10,
    lineHeight: 1.5,
    flex: 1,
  },
  pairRow: {
    flexDirection: "row",
    paddingVertical: 2,
    borderBottomWidth: 0.5,
    borderBottomColor: "#EFEFEF",
  },
  pairKey: {
    fontSize: 9,
    color: "#666666",
    width: 120,
  },
  pairValue: {
    fontSize: 9.5,
    flex: 1,
  },
  entryBlock: {
    marginBottom: 6,
    paddingLeft: 8,
    borderLeftWidth: 1,
    borderLeftColor: OFF_WHITE,
  },
  entryTitle: {
    fontFamily: "Fira Sans",
    fontWeight: 700,
    fontSize: 9,
    color: MAROON,
    marginBottom: 2,
  },
});

/** One label with a value beside it: a matrix row, a group's sub-field. */
export interface PdfIntakePair {
  label: string;
  value: string;
}

/**
 * An answer, already reduced to something printable.
 *
 * The onboarding form stores every field type as jsonb, so the shapes are the
 * field's own — a phone is `{countryCode, number}`, opening hours are
 * `{row: {column: value}}`, a repeating group is a list of rows. Turning those
 * into these four printable forms is the caller's job, because the caller is
 * the one holding each question's config; this file only knows how they look
 * on the page.
 */
export type PdfIntakeAnswer =
  | { kind: "text"; text: string }
  | { kind: "list"; items: string[] }
  | { kind: "pairs"; pairs: PdfIntakePair[] }
  | { kind: "entries"; entries: { title: string; pairs: PdfIntakePair[] }[] };

export interface PdfIntakeQuestion {
  label: string;
  answer: PdfIntakeAnswer;
}

export interface PdfIntakeSection {
  /** The form's own section name, or null for questions that carry none. */
  heading: string | null;
  questions: PdfIntakeQuestion[];
}

export interface PdfIntakePage {
  title: string;
  sections: PdfIntakeSection[];
}

export interface PdfIntakeInput {
  venueName?: string | null;
  clientName?: string | null;
  /** In the order the form asks them: page, then section, then question. */
  pages: PdfIntakePage[];
  /** ISO timestamp of the download itself. */
  generatedAt: string;
  /** ISO timestamp of the last answer saved, when one is known. */
  submittedAt?: string | null;
}

/**
 * The client's own onboarding answers, as a document they can keep.
 *
 * Same furniture as the signed agreement and the terms — the three things
 * they take away at the end should look like they came from one place. It
 * prints what they actually answered, in the order they were asked: a blank
 * question is left out rather than printed with a dash, since a record of
 * what was said should not be padded with what wasn't.
 */
export async function generateIntakePdf(
  input: PdfIntakeInput,
): Promise<Buffer> {
  const buffer = await renderToBuffer(createIntakeDocument(input));
  return Buffer.from(buffer);
}

function renderIntakeAnswer(answer: PdfIntakeAnswer, key: string) {
  switch (answer.kind) {
    case "list":
      return answer.items.map((item, i) =>
        React.createElement(
          View,
          { key: `${key}-i${i}`, style: intakeStyles.bulletRow },
          React.createElement(Text, { style: intakeStyles.bulletMark }, "•"),
          React.createElement(Text, { style: intakeStyles.bulletText }, item),
        ),
      );

    case "pairs":
      return answer.pairs.map((pair, i) =>
        React.createElement(
          View,
          { key: `${key}-p${i}`, style: intakeStyles.pairRow },
          React.createElement(
            Text,
            { style: intakeStyles.pairKey },
            pair.label,
          ),
          React.createElement(
            Text,
            { style: intakeStyles.pairValue },
            pair.value,
          ),
        ),
      );

    case "entries":
      return answer.entries.map((entry, i) =>
        React.createElement(
          View,
          { key: `${key}-e${i}`, style: intakeStyles.entryBlock, wrap: false },
          React.createElement(
            Text,
            { style: intakeStyles.entryTitle },
            entry.title,
          ),
          ...entry.pairs.map((pair, j) =>
            React.createElement(
              View,
              { key: `${key}-e${i}-p${j}`, style: intakeStyles.pairRow },
              React.createElement(
                Text,
                { style: intakeStyles.pairKey },
                pair.label,
              ),
              React.createElement(
                Text,
                { style: intakeStyles.pairValue },
                pair.value,
              ),
            ),
          ),
        ),
      );

    default:
      return [
        React.createElement(
          Text,
          { key: `${key}-t`, style: intakeStyles.answerText },
          answer.text,
        ),
      ];
  }
}

function createIntakeDocument(input: PdfIntakeInput) {
  const dateStr = formatDate(input.generatedAt);
  const submittedStr = input.submittedAt ? formatDate(input.submittedAt) : null;

  // Venue first, then the person — and never the same name twice, the way
  // the contract and the terms both handle records that repeat it.
  const forName = [input.venueName, input.clientName]
    .filter(
      (part, i, parts): part is string => !!part && parts.indexOf(part) === i,
    )
    .join(" — ");

  return React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: "A4" as const, style: s.page },

      React.createElement(View, { style: s.headerBar }),
      React.createElement(Text, { style: s.brandName }, "LickYourPhone Media"),
      React.createElement(
        Text,
        { style: s.subtitle },
        forName ? `Onboarding Form — ${forName}` : "Onboarding Form",
      ),

      React.createElement(
        Text,
        { style: intakeStyles.intro },
        submittedStr
          ? `The answers submitted to LickYourPhone Media on ${submittedStr}. Downloaded ${dateStr}.`
          : `The answers submitted to LickYourPhone Media. Downloaded ${dateStr}.`,
      ),

      ...input.pages.flatMap((page, pi) => [
        React.createElement(
          Text,
          { key: `page-${pi}`, style: s.sectionTitle },
          page.title,
        ),
        ...page.sections.flatMap((section, si) => [
          ...(section.heading
            ? [
                React.createElement(
                  Text,
                  {
                    key: `page-${pi}-s${si}`,
                    style: intakeStyles.sectionHeading,
                  },
                  section.heading,
                ),
              ]
            : []),
          /* `wrap: false` keeps a question with its answer: a label stranded
             at the foot of one page reads as an unanswered question. */
          ...section.questions.map((q, qi) =>
            React.createElement(
              View,
              {
                key: `page-${pi}-s${si}-q${qi}`,
                style: intakeStyles.questionBlock,
                wrap: false,
              },
              React.createElement(
                Text,
                { style: intakeStyles.questionLabel },
                q.label,
              ),
              ...renderIntakeAnswer(q.answer, `page-${pi}-s${si}-q${qi}`),
            ),
          ),
        ]),
      ]),

      /* Fixed, so a long form carries the footer onto every page. */
      React.createElement(Text, {
        style: s.footer,
        fixed: true,
        render: ({
          pageNumber,
          totalPages,
        }: {
          pageNumber: number;
          totalPages: number;
        }) =>
          `LickYourPhone Media — Onboarding Form — ${dateStr} — Page ${pageNumber} of ${totalPages}`,
      }),
    ),
  );
}
