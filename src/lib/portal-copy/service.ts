import type { CopySlot } from "./types";

export const SERVICE_COPY: CopySlot[] = [
  { key: "eyebrow", label: "Small label above the service name", default: "Media Menu" },
  { key: "includedHeading", label: "Inclusions heading", default: "What's Included" },
  { key: "commitmentsHeading", label: "Commitments heading", default: "Your Commitments" },
  { key: "investmentHeading", label: "Price panel heading", default: "Investment" },
  { key: "discountBadge", label: "Offer badge", default: "{pct}% off · limited time", hint: "{pct} is replaced with the offer percentage. It sits on a filled badge beside the price and is set in capitals, so keep it short enough to stay on one line." },
  { key: "perWeek", label: "Weekly price label", default: "per week" },
  { key: "perMonth", label: "Monthly price label", default: "per month" },
  { key: "oneOffLabel", label: "Single payment label", default: "one-off payment", hint: "Replaces the per week / per month cadence on a service that is paid once. A single payment is neither weekly nor monthly and must never be labelled as either." },
  { key: "plusGst", label: "GST label", default: "+ GST" },
  { key: "saveAmount", label: "Saving on a term", default: "Save {amount}", hint: "{amount} is replaced with the saving." },
  { key: "complimentary", label: "Complimentary price text", default: "Complimentary" },
  { key: "wantThis", label: "Decision card: not yet added", default: "I want this", hint: "The card beside the price, with the switch off. It is as tall as the price panel, so keep the wording to two or three words — a longer phrase makes the card wide enough to crowd the price." },
  { key: "added", label: "Decision card: added", default: "Added", hint: "The same card with the switch on. Shown on the rose, filled-in state." },
  { key: "paidInKind", label: "Decision card: service is complimentary", default: "Paid in kind", hint: "Replaces both of the above on a service billed in kind. The switch still adds and removes it." },
  { key: "signedNote", label: "Note once signed", default: "This has already been signed. Services can no longer be changed.", multiline: true },
  { key: "requiresOtherNote", label: "Note when another service is needed first", default: "This service requires at least one other service to be selected first.", multiline: true },
];
