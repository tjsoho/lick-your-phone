import type { CopySlot } from "./types";

export const PAYMENT_COPY: CopySlot[] = [
  { key: "heading", label: "Heading", default: "Payment Details" },
  { key: "intro", label: "Intro", default: "Your card will be securely tokenised. No charges will be made today.", multiline: true },
  { key: "cardholderLabel", label: "Cardholder label", default: "Cardholder Name" },
  { key: "cardNumberLabel", label: "Card number label", default: "Card Number" },
  { key: "expiryLabel", label: "Expiry label", default: "Expiry" },
  { key: "cvcLabel", label: "CVC label", default: "CVC" },
  { key: "saveButton", label: "Save button", default: "Save Payment Details" },
  { key: "savingButton", label: "Saving button", default: "Saving..." },
  { key: "tryAgainButton", label: "Try again button", default: "Try Again" },
  { key: "securityNote", label: "Security note", default: "Your card details are securely tokenised and never touch our servers. Payments are processed by Pinch Payments, an Australian PCI-DSS compliant payment provider.", multiline: true },
  { key: "acceptedToast", label: "Saved: pop-up notice", default: "Payment accepted" },
  { key: "savedTitle", label: "Saved: title", default: "Payment Details Saved" },
  { key: "savedBody", label: "Saved: message", default: "Your card has been securely saved. Payments will be scheduled according to your agreement.", multiline: true },
  { key: "handoffNote", label: "Saved: moving on note", default: "Taking you to your onboarding form...", hint: "Shown for a moment after the card is saved, while the client is moved to onboarding." },
  { key: "onboardingButton", label: "Onboarding button", default: "Access Onboarding Form" },
  { key: "capturedTitle", label: "Already saved: title", default: "Payment Details Received" },
  { key: "capturedBody", label: "Already saved: message", default: "Your card is already saved and nothing is charged today. The last step is your onboarding form.", multiline: true, hint: "Shown if the client comes back to this step after their card is in." },
  { key: "noPaymentTitle", label: "No payment needed: title", default: "No Payment Required" },
  { key: "noPaymentBody", label: "No payment needed: message", default: "Your selected services are complimentary. No payment details are needed at this time.", multiline: true },
];
