import type { CopySlot } from "./types";

export const SERVICE_COPY: CopySlot[] = [
  { key: "eyebrow", label: "Small label above the service name", default: "Media Menu" },
  { key: "includedHeading", label: "Inclusions heading", default: "What's Included" },
  { key: "commitmentsHeading", label: "Commitments heading", default: "Your Commitments" },
  { key: "investmentHeading", label: "Price panel heading", default: "Investment" },
  { key: "discountBadge", label: "Discount badge", default: "{pct}% off — limited time", hint: "{pct} is replaced with the discount percentage." },
  { key: "perWeek", label: "Weekly price label", default: "per week" },
  { key: "perMonth", label: "Monthly price label", default: "per month" },
  { key: "plusGst", label: "GST label", default: "+ GST" },
  { key: "saveAmount", label: "Saving on a term", default: "Save {amount}", hint: "{amount} is replaced with the saving." },
  { key: "savingLine", label: "Saving on a single price", default: "Saving {amount} + GST {period}", hint: "{amount} is the saving, {period} the price label." },
  { key: "complimentary", label: "Complimentary price text", default: "Complimentary" },
  { key: "wantThis", label: "Add button", default: "I want this" },
  { key: "added", label: "Added button", default: "Added" },
  { key: "paidInKind", label: "Paid in kind label", default: "Paid in kind" },
  { key: "signedNote", label: "Note once signed", default: "This has already been signed. Services can no longer be changed.", multiline: true },
  { key: "requiresOtherNote", label: "Note when another service is needed first", default: "This service requires at least one other service to be selected first.", multiline: true },
];
