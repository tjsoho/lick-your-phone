import type { CopySlot } from "./types";

export const SIGNATURE_COPY: CopySlot[] = [
  { key: "heading", label: "Heading", default: "Sign Your Agreement" },
  { key: "intro", label: "Intro", default: "Review and sign to confirm your selected services.", multiline: true },
  { key: "noServicesTitle", label: "Nothing selected: title", default: "No services selected." },
  { key: "noServicesBody", label: "Nothing selected: message", default: "Go back and select at least one service before signing.", multiline: true },
  { key: "emailLabel", label: "Email label", default: "Your email address" },
  { key: "signatureLabel", label: "Signature label", default: "Draw your signature below" },
  { key: "clearButton", label: "Clear signature button", default: "Clear signature" },

  /* One control, three possible destinations — whichever of them Settings →
     Agreement has set. The wording differs so the client knows, before they
     click, whether they are getting the agency's own document or the summary
     made into a PDF. */
  { key: "downloadTermsButton", label: "Full terms button: generated PDF", default: "Download T&Cs", hint: "Shown when no document or link is set in Settings → Agreement: the clauses, rendered as a PDF." },
  { key: "downloadTermsDocumentButton", label: "Full terms button: uploaded document", default: "Download full T&Cs", hint: "Shown when a document is uploaded in Settings → Agreement. It downloads." },
  { key: "viewTermsLinkButton", label: "Full terms button: live link", default: "Read the full T&Cs", hint: "Shown when a link is set in Settings → Agreement and no document is uploaded. It opens in a new tab." },
  /* The consent sentence is the ONLY place the signing slide mentions the
     terms — the summary panel that used to sit above the pad said the same
     thing a second time and has gone. The link in the middle of it opens the
     clause window, or the agency's own document when there are no clauses. */
  { key: "agreementText", label: "Agreement sentence", default: "By clicking “I Agree & Sign” you confirm that you have reviewed the selected services and pricing, and agree to the", multiline: true, hint: "The terms link follows this sentence. This is the only mention of the terms on the signing slide, so say what signing commits them to." },
  { key: "termsLinkText", label: "Terms link text", default: "terms and conditions", hint: "The clickable phrase inside the agreement sentence — the one route to the full terms on this slide." },
  { key: "agreementTextAfter", label: "Text after the terms link", default: "." },
  { key: "termsTitle", label: "Terms window: title", default: "Terms & Conditions" },
  { key: "termsEmpty", label: "Nothing published yet: note under the sentence", default: "No terms have been published yet.", multiline: true, hint: "Only appears while Settings → Agreement has no clauses, no document and no link — so the gap is noticed before a client signs into it." },
  { key: "termsCloseButton", label: "Terms window: close button", default: "Close" },
  { key: "signButton", label: "Sign button", default: "I Agree & Sign" },
  { key: "signingButton", label: "Sign button while signing", default: "Signing..." },
  { key: "signedTitle", label: "Signed: title", default: "Agreement Signed" },
  /* No download here: the contract is offered on the last screen of the
     journey instead, where the client is finished rather than mid-flow. */
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
