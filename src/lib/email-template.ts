/**
 * THE EMAILS, OWNED BY THE AGENCY RATHER THAN BURIED IN MAKE.
 *
 * Every one of these used to be a block of HTML inside a Make module, so
 * changing a sentence meant opening a scenario, finding the right module and
 * editing raw markup with the merge variables written as `{{1.contact.email}}`.
 *
 * They are rows now. Make asks this app for the finished article at send
 * time, so what the agency types is what the client reads.
 */

/** What the agency may type in double braces. Anything else is left alone. */
export const PLACEHOLDER_LABELS: Record<string, string> = {
  first_name: "The client's first name",
  last_name: "The client's last name",
  client_email: "The client's email address",
  business_name: "The venue or business name",
  venue_address: "The venue's address",
  portal_url: "Their own link to the proposal",
  intake_url: "Their onboarding form",
  contract_url: "The signed contract PDF",
  sign_off_url: "Where the team signs the client off. Never send to a client.",
  signed_at: "When they signed",
  total: "The contract total",
  currency: "The currency, normally AUD",
};

/**
 * Put the real values into the text.
 *
 * A placeholder with nothing behind it becomes an empty string rather than
 * being left on screen. A client reading "Hi {{first_name}}," is worse than
 * a client reading "Hi ,", and both are worse than the team noticing, which
 * is what the preview in the editor is for.
 */
export function renderTemplate(
  text: string,
  values: Record<string, unknown>,
): string {
  return text.replace(/\{\{\s*([a-z_][a-z0-9_]*)\s*\}\}/gi, (whole, name) => {
    const key = String(name).toLowerCase();
    if (!(key in values)) return whole;
    const v = values[key];
    return v === null || v === undefined ? "" : String(v);
  });
}

/**
 * STRIP ANYTHING THAT IS NOT EMAIL CONTENT.
 *
 * The editor is behind a login, so this is not guarding against the agency.
 * It guards against what gets pasted in: copying from a web page or a Google
 * Doc drags in scripts, event handlers, comments and `style` blocks, and an
 * email client will either choke on them or quietly strip them in a way that
 * mangles the layout. Better to take them out here, where it is visible.
 *
 * An allowlist rather than a blocklist, because a blocklist is a list of the
 * attacks somebody has already thought of.
 */
const ALLOWED_TAGS = new Set([
  "p", "br", "div", "span", "strong", "b", "em", "i", "u", "s",
  "ul", "ol", "li", "a", "h1", "h2", "h3", "h4", "h5", "h6",
  "blockquote", "table", "thead", "tbody", "tr", "td", "th",
  "img", "hr",
]);

const ALLOWED_ATTRS = new Set([
  "href", "src", "alt", "title", "style", "width", "height",
  "align", "valign", "colspan", "rowspan", "cellpadding", "cellspacing",
  "border", "target", "rel",
]);

export function sanitiseEmailHtml(html: string): string {
  let out = html;

  // Whole elements whose content is never email content.
  out = out.replace(
    /<\s*(script|style|iframe|object|embed|form|input|button|link|meta|base)\b[\s\S]*?<\s*\/\s*\1\s*>/gi,
    "",
  );
  out = out.replace(
    /<\s*(script|style|iframe|object|embed|form|input|button|link|meta|base)\b[^>]*\/?>/gi,
    "",
  );
  out = out.replace(/<!--[\s\S]*?-->/g, "");

  // Then every remaining tag, attribute by attribute.
  out = out.replace(
    /<\s*(\/?)\s*([a-zA-Z][a-zA-Z0-9]*)((?:\s+[^<>]*?)?)\s*(\/?)>/g,
    (whole, closing: string, rawTag: string, rawAttrs: string, selfClose: string) => {
      const tag = rawTag.toLowerCase();
      if (!ALLOWED_TAGS.has(tag)) return "";
      if (closing) return `</${tag}>`;

      const kept: string[] = [];
      const attrRe = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+))/g;
      let m: RegExpExecArray | null;
      while ((m = attrRe.exec(rawAttrs)) !== null) {
        const name = m[1].toLowerCase();
        const value = m[3] ?? m[4] ?? m[5] ?? "";
        // `on*` is every inline handler in one rule.
        if (name.startsWith("on")) continue;
        if (!ALLOWED_ATTRS.has(name)) continue;
        // A link that runs code is not a link.
        if (
          (name === "href" || name === "src") &&
          /^\s*(javascript|data|vbscript):/i.test(value)
        ) {
          continue;
        }
        if (name === "style" && /expression\s*\(|javascript:/i.test(value)) continue;
        kept.push(`${name}="${value.replace(/"/g, "&quot;")}"`);
      }
      const attrs = kept.length ? " " + kept.join(" ") : "";
      return `<${tag}${attrs}${selfClose ? " /" : ""}>`;
    },
  );

  return out;
}
