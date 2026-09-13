import type { CopySlot } from "./types";

/** Wording that appears on every slide rather than belonging to one page. */
export const GLOBAL_COPY: CopySlot[] = [
  { key: "backButton", label: "Back button", default: "Back" },
  { key: "nextButton", label: "Next button", default: "Next" },
  { key: "pageCounter", label: "Page counter", default: "{current} / {total}", hint: "{current} and {total} are replaced with numbers." },
  { key: "servicesSelectedOne", label: "Price bar: one service", default: "service selected" },
  { key: "servicesSelectedMany", label: "Price bar: several services", default: "services selected" },
  { key: "perMonthGst", label: "Price bar: per month", default: "+ GST per month" },
  { key: "discountEndsIn", label: "Countdown label", default: "Your discount ends in" },
  { key: "discountEndsInShort", label: "Countdown label (short)", default: "Discount ends in" },
  { key: "linkNotFoundTitle", label: "Broken link: title", default: "Link Not Found" },
  { key: "linkNotFoundBody", label: "Broken link: message", default: "This link is invalid or has expired. Please contact your account manager for an updated link.", multiline: true },
  { key: "linkReplacedTitle", label: "Replaced link: title", default: "Link Replaced" },
  { key: "linkReplacedBody", label: "Replaced link: message", default: "A newer version has been sent to you. Please check your email for the latest link, or contact your account manager.", multiline: true },
];
