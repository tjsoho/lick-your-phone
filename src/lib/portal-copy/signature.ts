import type { CopySlot } from "./types";

export const SIGNATURE_COPY: CopySlot[] = [
  { key: "heading", label: "Heading", default: "Sign Your Agreement" },
  { key: "intro", label: "Intro", default: "Review and sign to confirm your selected services.", multiline: true },
  { key: "noServicesTitle", label: "Nothing selected: title", default: "No services selected." },
  { key: "noServicesBody", label: "Nothing selected: message", default: "Go back and select at least one service before signing.", multiline: true },
  { key: "emailLabel", label: "Email label", default: "Your email address" },
  { key: "signatureLabel", label: "Signature label", default: "Draw your signature below" },
  { key: "clearButton", label: "Clear signature button", default: "Clear signature" },
  { key: "agreementText", label: "Agreement sentence", default: "By clicking “I Agree & Sign” you confirm that you have reviewed the selected services and pricing, and agree to the", multiline: true, hint: "The terms link follows this sentence." },
  { key: "termsLinkText", label: "Terms link text", default: "terms and conditions" },
  { key: "agreementTextAfter", label: "Text after the terms link", default: "." },
  { key: "termsTitle", label: "Terms window: title", default: "Terms & Conditions" },
  { key: "termsEmpty", label: "Terms window: no terms message", default: "No terms have been published yet.", multiline: true },
  { key: "termsCloseButton", label: "Terms window: close button", default: "Close" },
  { key: "signButton", label: "Sign button", default: "I Agree & Sign" },
  { key: "signingButton", label: "Sign button while signing", default: "Signing..." },
  { key: "signedTitle", label: "Signed: title", default: "Agreement Signed" },
  { key: "downloadButton", label: "Download button", default: "Download Contract PDF" },
  { key: "addPaymentButton", label: "Add payment button", default: "Add your payment details" },
];
