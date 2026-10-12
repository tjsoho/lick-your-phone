import type { CopySlot } from "./types";

export const PAYMENT_COPY: CopySlot[] = [
  { key: "heading", label: "Heading", default: "Bank Details" },
  { key: "intro", label: "Intro", default: "The account your monthly payments will be debited from. Nothing is charged today.", multiline: true },
  { key: "accountNameLabel", label: "Account name label", default: "Account Name" },
  { key: "bsbLabel", label: "BSB label", default: "BSB" },
  { key: "accountNumberLabel", label: "Account number label", default: "Account Number" },
  { key: "authorityText", label: "Direct debit authority", default: "I authorise LickYourPhone Media to debit the account above for the amounts set out in my agreement, and confirm I am authorised to operate it.", multiline: true, hint: "The client has to tick this before they can submit. Shown above the button, and the tick is recorded with the account." },
  { key: "saveButton", label: "Save button", default: "Save Bank Details" },
  { key: "savingButton", label: "Saving button", default: "Saving..." },
  { key: "tryAgainButton", label: "Try again button", default: "Try Again" },
  { key: "securityNote", label: "Security note", default: "Your account details are encrypted before they are stored and are only ever seen by our accounts team. Nothing is debited today.", multiline: true },
  { key: "acceptedToast", label: "Saved: pop-up notice", default: "Bank details saved" },
  { key: "savedTitle", label: "Saved: title", default: "Bank Details Saved" },
  { key: "savedBody", label: "Saved: message", default: "Your account is on file. Payments will be debited according to your agreement.", multiline: true },
  { key: "handoffNote", label: "Saved: moving on note", default: "Taking you to your onboarding form...", hint: "Shown for a moment after the card is saved, while the client is moved to onboarding." },
  { key: "onboardingButton", label: "Onboarding button", default: "Access Onboarding Form" },
  { key: "capturedTitle", label: "Already saved: title", default: "Bank Details Received" },
  { key: "capturedBody", label: "Already saved: message", default: "Your account is already on file and nothing is charged today. The last step is your onboarding form.", multiline: true, hint: "Shown if the client comes back to this step after their details are in." },
  { key: "noPaymentTitle", label: "No payment needed: title", default: "No Payment Required" },
  { key: "noPaymentBody", label: "No payment needed: message", default: "Your selected services are complimentary. No bank details are needed at this time.", multiline: true },
];
