import React from "react"
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  Font,
  renderToBuffer,
} from "@react-pdf/renderer"

/* ------------------------------------------------------------------ */
/*  Brand tokens                                                      */
/* ------------------------------------------------------------------ */

const CHERRY = "#B22626"
const BLACK = "#000000"
const MAROON = "#6D080A"
const OFF_WHITE = "#EEE7E7"
// WHITE (#FFFFFF) used directly in stroke styles below

/* ------------------------------------------------------------------ */
/*  Fonts                                                             */
/* ------------------------------------------------------------------ */

Font.register({
  family: "Fira Sans",
  fonts: [
    {
      src: "https://fonts.gstatic.com/s/firasans/v17/va9E4kDNxMZdWfMOD5Vvl4jL.ttf",
      fontWeight: 700,
    },
    {
      src: "https://fonts.gstatic.com/s/firasans/v17/va9E4kDNxMZdWfMOD5Vvk4jL.ttf",
      fontWeight: 400,
    },
  ],
})

Font.register({
  family: "Montserrat",
  fonts: [
    {
      src: "https://fonts.gstatic.com/s/montserrat/v26/JTUHjIg1_i6t8kCHKm4532VJOt5-QNFgpCtr6Ew-.ttf",
      fontWeight: 400,
    },
  ],
})

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
})

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface PdfLineItem {
  name: string
  tierName: string | null
  billing: "one_off" | "recurring_monthly" | "in_kind"
  priceCents: number
}

export interface PdfContractInput {
  clientName: string
  venueName: string
  lineItems: PdfLineItem[]
  totalCents: number
  signerEmail: string
  signedAt: string
  signatureDataUrl?: string
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
  }).format(cents / 100)
}

function billingLabel(billing: string): string {
  if (billing === "recurring_monthly") return "Monthly"
  if (billing === "one_off") return "One-off"
  return "Complimentary"
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

/* ------------------------------------------------------------------ */
/*  Public API                                                        */
/* ------------------------------------------------------------------ */

export async function generateContractPdf(
  input: PdfContractInput,
): Promise<Buffer> {
  const doc = createContractDocument(input)
  const buffer = await renderToBuffer(doc)
  return Buffer.from(buffer)
}

function createContractDocument(input: PdfContractInput) {
  const dateStr = formatDate(input.signedAt)

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
        `Service Agreement for ${input.clientName} — ${input.venueName}`,
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
          { style: { ...s.rowName, fontFamily: "Fira Sans", fontWeight: 700, fontSize: 9 } },
          "Service",
        ),
        React.createElement(
          Text,
          { style: { ...s.rowBilling, fontFamily: "Fira Sans", fontWeight: 700, fontSize: 9 } },
          "Billing",
        ),
        React.createElement(
          Text,
          { style: { ...s.rowPrice, fontFamily: "Fira Sans", fontWeight: 700, fontSize: 9 } },
          "Price (ex GST)",
        ),
      ),

      /* Line items */
      ...input.lineItems.map((item, i) =>
        React.createElement(
          View,
          { key: i, style: { ...s.row, ...(i % 2 === 1 ? s.rowAlt : {}) } },
          React.createElement(
            Text,
            { style: s.rowName },
            item.tierName ? `${item.name} (${item.tierName})` : item.name,
          ),
          React.createElement(Text, { style: s.rowBilling }, billingLabel(item.billing)),
          React.createElement(
            Text,
            { style: s.rowPrice },
            item.billing === "in_kind" ? "—" : formatCents(item.priceCents),
          ),
        ),
      ),

      /* Total */
      React.createElement(
        View,
        { style: s.totalRow },
        React.createElement(Text, { style: s.totalLabel }, "Total (ex GST)"),
        React.createElement(Text, { style: s.totalAmount }, formatCents(input.totalCents)),
      ),

      /* Contract terms */
      React.createElement(Text, { style: s.sectionTitle }, "Terms & Conditions"),
      React.createElement(
        Text,
        { style: s.termsText },
        "1. Agreement Start: This agreement commences on the date of signature and continues for the term specified for each service.",
      ),
      React.createElement(
        Text,
        { style: s.termsText },
        "2. Billing: Monthly recurring charges are invoiced 7 days before the start of each billing period. One-off charges are invoiced upon execution of this agreement.",
      ),
      React.createElement(
        Text,
        { style: s.termsText },
        "3. Payment Terms: All invoices are due within 14 days of issue. A late payment fee of 2% per month applies to overdue balances.",
      ),
      React.createElement(
        Text,
        { style: s.termsText },
        "4. GST: All prices listed are exclusive of GST. GST will be added at the prevailing rate.",
      ),
      React.createElement(
        Text,
        { style: s.termsText },
        "5. Early Termination: Monthly services may be terminated with 30 days written notice. Early termination of fixed-term agreements is subject to a fee equal to the remaining term value, as outlined in our Terms & Conditions.",
      ),
      React.createElement(
        Text,
        { style: s.termsText },
        "6. Scope: Services are provided as described in the accompanying proposal. Changes to scope require written agreement from both parties.",
      ),
      React.createElement(
        Text,
        { style: s.termsText },
        "7. Intellectual Property: All content created by LickYourPhone Media remains the property of LickYourPhone Media until full payment is received, at which point a licence is granted for agreed usage.",
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
          React.createElement(Text, { style: { fontSize: 9 } }, input.signerEmail),
          React.createElement(Text, { style: s.signatureDate }, `Signed: ${dateStr}`),
        ),
        /* Agency signature */
        React.createElement(
          View,
          { style: s.signatureBox },
          React.createElement(Text, { style: s.signatureLabel }, "LickYourPhone Media"),
          React.createElement(View, { style: s.signatureLine }),
          React.createElement(Text, { style: { fontSize: 9 } }, "Authorised Representative"),
          React.createElement(Text, { style: s.signatureDate }, "Date: _______________"),
        ),
      ),

      /* Footer */
      React.createElement(
        Text,
        { style: s.footer },
        `LickYourPhone Media — Service Agreement — Generated ${dateStr}`,
      ),
    ),
  )
}
