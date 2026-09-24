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
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 2,
    borderTopColor: CHERRY,
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
  signatureLine: {
    borderBottomWidth: 1,
    borderBottomColor: BLACK,
    height: 40,
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
    marginBottom: 4,
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

/* ------------------------------------------------------------------ */
/*  Public API                                                        */
/* ------------------------------------------------------------------ */

export async function generateContractPdf(
  input: PdfContractInput,
): Promise<Buffer> {
  const doc = createContractDocument(input);
  const buffer = await renderToBuffer(doc);
  return Buffer.from(buffer);
}

function createContractDocument(input: PdfContractInput) {
  const dateStr = formatDate(input.signedAt);

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
            item.billing === "recurring_monthly" && item.billingCycleMonths > 1
              ? React.createElement(
                  Text,
                  { style: { fontSize: 7, color: "#666666", marginTop: 2 } },
                  `Total: ${formatCents(itemTotalCents)}`,
                )
              : null,
          ),
        );
      }),

      /* Total */
      React.createElement(
        View,
        { style: s.totalRow },
        React.createElement(
          Text,
          { style: s.totalLabel },
          "Total Contract Value (ex GST)",
        ), // <-- UBAH TEKS INI
        React.createElement(
          Text,
          { style: s.totalAmount },
          formatCents(input.totalCents),
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
          input.signatureDataUrl
            ? React.createElement(Image, {
                style: s.signatureImage,
                src: input.signatureDataUrl,
              })
            : React.createElement(View, { style: s.signatureLine }),
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
          input.countersignatureImage
            ? React.createElement(Image, {
                style: s.signatureImage,
                src: input.countersignatureImage,
              })
            : React.createElement(View, { style: s.signatureLine }),
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
