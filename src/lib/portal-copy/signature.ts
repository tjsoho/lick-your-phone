import type { CopySlot } from "./types";

export const SIGNATURE_COPY: CopySlot[] = [
  { key: "heading", label: "Heading", default: "Sign Your Agreement" },
  { key: "intro", label: "Intro", default: "Review and sign to confirm your selected services.", multiline: true },
  { key: "noServicesTitle", label: "Nothing selected: title", default: "No services selected." },
  { key: "noServicesBody", label: "Nothing selected: message", default: "Go back and select at least one service before signing.", multiline: true },
  { key: "emailLabel", label: "Email label", default: "Your email address" },
  { key: "signatureLabel", label: "Signature label", default: "Draw your signature below" },
  { key: "clearButton", label: "Clear signature button", default: "Clear signature" },

  /* The terms in brief, above the signature pad. The points themselves are
     the first sentence of each clause in Settings — only the furniture around
     them is edited here. */
  { key: "termsSummaryTitle", label: "Terms summary: heading", default: "The Main Points", hint: "Above the short summary. The points themselves are the opening sentence of each clause in Settings → Agreement." },
  { key: "termsSummaryMore", label: "Terms summary: rest of the terms", default: "+{count} more in the full terms", hint: "{count} is replaced with the number of clauses not shown in the summary. Hidden when they all fit." },
  { key: "viewAllTermsButton", label: "See all terms button", default: "See all terms", hint: "Opens the clause list from Settings → Agreement in a window, without leaving the page." },

  /* One control, three possible destinations — whichever of them Settings →
     Agreement has set. The wording differs so the client knows, before they
     click, whether they are getting the agency's own document or the summary
     made into a PDF. */
  { key: "downloadTermsButton", label: "Full terms button: generated PDF", default: "Download T&Cs", hint: "Shown when no document or link is set in Settings → Agreement: the clauses, rendered as a PDF." },
  { key: "downloadTermsDocumentButton", label: "Full terms button: uploaded document", default: "Download full T&Cs", hint: "Shown when a document is uploaded in Settings → Agreement. It downloads." },
  { key: "viewTermsLinkButton", label: "Full terms button: live link", default: "Read the full T&Cs", hint: "Shown when a link is set in Settings → Agreement and no document is uploaded. It opens in a new tab." },
  { key: "fullTermsNote", label: "Full terms: note beside the summary", default: "Summary only — full terms apply.", hint: "Sits beside the buttons, in place of the clause count, when a document or link is set: the points on screen are then a summary of something longer. Keep it to a few words — the slide has no spare line." },
  { key: "fullTermsOnly", label: "Full terms: no summary written", default: "The full terms and conditions apply — open them before signing.", hint: "Shown in place of the summary when a document or link is set but no clauses have been written in Settings → Agreement." },

  { key: "agreementText", label: "Agreement sentence", default: "By clicking “I Agree & Sign” you confirm that you have reviewed the selected services and pricing, and agree to the", multiline: true, hint: "The terms link follows this sentence." },
  { key: "termsLinkText", label: "Terms link text", default: "terms and conditions" },
  { key: "agreementTextAfter", label: "Text after the terms link", default: "." },
  { key: "termsTitle", label: "Terms window: title", default: "Terms & Conditions" },
  { key: "termsEmpty", label: "Terms window: no terms message", default: "No terms have been published yet.", multiline: true },
  { key: "termsCloseButton", label: "Terms window: close button", default: "Close" },
  { key: "signButton", label: "Sign button", default: "I Agree & Sign" },
  { key: "signingButton", label: "Sign button while signing", default: "Signing..." },
  { key: "signedTitle", label: "Signed: title", default: "Agreement Signed" },
  { key: "downloadButton", label: "Download signed agreement button", default: "Download Contract PDF" },
  { key: "addPaymentButton", label: "Continue to payment button", default: "Continue to payment", hint: "The manual way on, for anyone still on the confirmation when it stops moving by itself." },
  { key: "redirectNotice", label: "Signed: taking you to payment", default: "Taking you to payment…", hint: "Shown for a moment on the confirmation while the portal moves the client on to payment by itself." },

  /* The selections card beside the signature pad. Same figures as the summary
     slide's Investment Summary, so the wording is offered in the same terms. */
  { key: "cardTitle", label: "Selections card: title", default: "What You're Signing For" },
  { key: "free", label: "Selections card: free label", default: "Free" },
  { key: "complimentary", label: "Selections card: nothing to pay", default: "Complimentary" },
  { key: "perMonthShort", label: "Selections card: per month (short)", default: "/mo" },
  { key: "forMonths", label: "Selections card: length of a monthly plan", default: "for {months} months", hint: "{months} is replaced with the number of months." },
  { key: "forOneMonth", label: "Selections card: length of a one-month plan", default: "for 1 month" },
  { key: "oneOffPayment", label: "Selections card: one-off line label", default: "one-off payment" },
  { key: "fullPrice", label: "Selections card: full price label", default: "Full price" },
  { key: "youSave", label: "Selections card: saving label", default: "You save" },
  { key: "monthlyTotal", label: "Selections card: monthly total label", default: "Monthly Total" },
  { key: "gstSuffixMonthly", label: "Selections card: monthly total suffix", default: "/mo + GST" },
  { key: "gstSuffix", label: "Selections card: one-off total suffix", default: "+ GST" },
  { key: "oneOffTotalSingle", label: "Selections card: one-off total (one item)", default: "One-off payment" },
  { key: "oneOffTotalPlural", label: "Selections card: one-off total (several items)", default: "One-off payments" },
];
