import type { CopySlot } from "./types";

export const COVER_COPY: CopySlot[] = [
  { key: "logo", label: "Logo", default: "/images/Website logo.PNG", image: true, hint: "Shown above the client's name." },
  { key: "preparedFor", label: "Prepared for label", default: "Prepared for" },
  { key: "signedBadge", label: "Signed badge", default: "Signed" },
  { key: "viewSummaryButton", label: "View summary button", default: "View Summary" },
];
