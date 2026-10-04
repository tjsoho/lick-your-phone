/**
 * The people named in the onboarding form, read back out of it.
 *
 * The form asks for a primary contact and then for however many other team
 * members the client wants to add, and the agency expects all of them on the
 * client record. Nothing in here touches a database: it turns questions and
 * answers into contacts, and `completeIntake` does the writing.
 *
 * ---------------------------------------------------------------------------
 * How a contact field is recognised
 * ---------------------------------------------------------------------------
 * Every label on this form is the agency's to rewrite in the dashboard, so no
 * label is matched against a fixed string. Three signals are used instead, in
 * order, each one weaker than the last:
 *
 *   1. `config.contact` on the question — `{"contact": "first_name"}`. An
 *      explicit statement of what a question collects, set in the same place
 *      as `same_as` and `prefill` already are. Survives any rename, any
 *      reorder, any move to another section. This is the escape hatch if the
 *      form is ever restructured past recognition.
 *
 *   2. Structure — the field's TYPE and the shape of the repeating group.
 *      A group whose sub-fields include an email or a phone is a list of
 *      people; a group of two text boxes (the "Other Locations" one) is not.
 *      The section holding that group is the section holding the primary
 *      contact, whatever either of them is called, and inside it the one
 *      `email` field is the email and the one `phone` field is the phone.
 *      Sub-fields are read by their `key`, which is an identifier the agency
 *      sets once, not the label they edit.
 *
 *   3. A hint from the label, and then position — only for the two name
 *      boxes, which are both plain text and otherwise indistinguishable. A
 *      label containing "first" or "last" settles it; failing that the first
 *      text box in the section is the first name and the second is the last.
 *
 * So: renaming a question changes nothing (2 and 3 both hold). Renaming the
 * section changes nothing. Reordering the two name boxes without a telling
 * label swaps them. Dropping the repeating group falls back to the section
 * that holds a phone field. If the form is rebuilt so none of that holds, the
 * contacts stop being recognised — the submission still lands untouched, and
 * `config.contact` puts it right without a deploy.
 */

/** The parts of a contact the form can supply. */
export type ContactRole =
  | "first_name"
  | "last_name"
  | "email"
  | "phone"
  | "role";

export type IntakeContact = {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  role: string;
  is_primary: boolean;
};

/** A question, as much of it as this file needs. */
export type ContactSourceQuestion = {
  id: string;
  page_number: number;
  sequence: number;
  section: string | null;
  field_label: string | null;
  field_type: string | null;
  config: unknown;
};

type SubField = { key: string; label?: string; type?: string };

/** Sub-field keys, and label hints, that name each part of a contact. */
const KEY_ALIASES: Record<ContactRole | "name", string[]> = {
  first_name: ["firstname", "givenname", "first"],
  last_name: ["lastname", "surname", "familyname", "last"],
  name: ["name", "fullname", "contactname", "person"],
  email: ["email", "emailaddress"],
  phone: ["phone", "phonenumber", "mobile", "telephone", "tel", "contactnumber"],
  role: ["role", "position", "jobtitle", "title"],
};

/** Case, spacing and punctuation all vary by hand; none of them mean anything. */
function normalise(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function matchesAlias(text: string, role: ContactRole | "name"): boolean {
  const n = normalise(text);
  return KEY_ALIASES[role].some((alias) => n.includes(alias));
}

/**
 * An answer as a line of text.
 *
 * Most answers are already strings. A phone is `{countryCode, number}`, which
 * is the one shape worth spelling out — the rest are either text or not a
 * contact field at all.
 */
export function answerText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  if (typeof value === "object") {
    const v = value as { countryCode?: unknown; number?: unknown };
    if (typeof v.number === "string") {
      const code = typeof v.countryCode === "string" ? v.countryCode : "";
      return `${code} ${v.number}`.trim();
    }
  }
  return "";
}

/** "Sofia Martinez Lopez" → first "Sofia", last "Martinez Lopez". */
function splitName(full: string): { first: string; last: string } {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first: "", last: "" };
  if (parts.length === 1) return { first: parts[0], last: "" };
  return { first: parts[0], last: parts.slice(1).join(" ") };
}

function readConfig(config: unknown): Record<string, unknown> | null {
  return config && typeof config === "object"
    ? (config as Record<string, unknown>)
    : null;
}

/** `{"contact": "first_name"}` — the agency saying so outright. */
function declaredRole(q: ContactSourceQuestion): ContactRole | null {
  const declared = readConfig(q.config)?.contact;
  if (typeof declared !== "string") return null;
  const n = normalise(declared);
  const roles: ContactRole[] = [
    "first_name",
    "last_name",
    "email",
    "phone",
    "role",
  ];
  return roles.find((r) => normalise(r) === n) ?? null;
}

function subFields(q: ContactSourceQuestion): SubField[] {
  const raw = readConfig(q.config)?.subFields;
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (f): f is SubField =>
      !!f && typeof f === "object" && typeof (f as SubField).key === "string",
  );
}

/**
 * The repeating group that lists PEOPLE.
 *
 * Told apart by its sub-field types: a group that asks for an email or a
 * phone is asking about a person. "Other Locations" — two text boxes — is
 * not, and never will be however it is relabelled.
 */
function findPeopleGroup(
  questions: ContactSourceQuestion[],
): ContactSourceQuestion | null {
  return (
    questions.find(
      (q) =>
        q.field_type === "repeatable_group" &&
        (readConfig(q.config)?.contact === "team" ||
          subFields(q).some((f) => f.type === "email" || f.type === "phone")),
    ) ?? null
  );
}

/** Everything on the same page, under the same heading. */
function sameSection(
  questions: ContactSourceQuestion[],
  anchor: ContactSourceQuestion,
): ContactSourceQuestion[] {
  return questions
    .filter(
      (q) =>
        q.page_number === anchor.page_number && q.section === anchor.section,
    )
    .sort((a, b) => a.sequence - b.sequence);
}

/**
 * The primary contact, from whichever questions turn out to be asking for it.
 */
function resolvePrimary(
  questions: ContactSourceQuestion[],
  answers: Map<string, unknown>,
  peopleGroup: ContactSourceQuestion | null,
): IntakeContact | null {
  const found: Record<ContactRole, string> = {
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    role: "",
  };

  // 1. Anything the agency has declared outright, from anywhere on the form.
  const declaredIds = new Set<string>();
  for (const q of questions) {
    const role = declaredRole(q);
    if (!role || found[role]) continue;
    found[role] = answerText(answers.get(q.id));
    declaredIds.add(q.id);
  }

  // 2. The section that holds the contact. The people group names it; a form
  //    without one falls back to wherever the phone number is asked for,
  //    which is the only place on this form that asks for one.
  const anchor =
    peopleGroup ?? questions.find((q) => q.field_type === "phone") ?? null;

  if (anchor) {
    const section = sameSection(questions, anchor).filter(
      (q) => !declaredIds.has(q.id),
    );

    if (!found.email) {
      const q = section.find((s) => s.field_type === "email");
      if (q) found.email = answerText(answers.get(q.id));
    }
    if (!found.phone) {
      const q = section.find((s) => s.field_type === "phone");
      if (q) found.phone = answerText(answers.get(q.id));
    }

    // 3. Both names are plain text, so the label has to break the tie — and
    //    where it says nothing, the order they are asked in does.
    const texts = section.filter((s) => s.field_type === "text");
    const claimed = new Set<string>();

    for (const role of ["first_name", "last_name", "role"] as const) {
      if (found[role]) continue;
      const q = texts.find(
        (s) =>
          !claimed.has(s.id) &&
          matchesAlias(s.field_label ?? "", role) &&
          // "First Name" hints at a first name and nothing else; a bare
          // "Name" must not be read as a last name because of its tail.
          !(role === "last_name" && matchesAlias(s.field_label ?? "", "first_name")),
      );
      if (!q) continue;
      claimed.add(q.id);
      found[role] = answerText(answers.get(q.id));
    }

    const unclaimed = texts.filter((s) => !claimed.has(s.id));
    if (!found.first_name && unclaimed[0]) {
      found.first_name = answerText(answers.get(unclaimed[0].id));
      claimed.add(unclaimed[0].id);
    }
    if (!found.last_name) {
      const next = texts.find((s) => !claimed.has(s.id));
      if (next) found.last_name = answerText(answers.get(next.id));
    }
  }

  // A name the client typed into one box — "Sofia Martinez" in "Name".
  if (found.first_name && !found.last_name) {
    const { first, last } = splitName(found.first_name);
    found.first_name = first;
    found.last_name = last;
  }

  if (!found.first_name && !found.last_name && !found.email) return null;
  return { ...found, is_primary: true };
}

/** One row of the repeating group, read by its sub-field keys. */
function rowToContact(
  row: Record<string, unknown>,
  fields: SubField[],
): IntakeContact | null {
  const by = (role: ContactRole | "name"): string => {
    const f = fields.find((sf) => matchesAlias(sf.key, role));
    return f ? answerText(row[f.key]) : "";
  };
  // A key nobody recognises still has a type, and a sub-field typed as an
  // email is an email whatever it has been called.
  const byType = (type: string): string => {
    const f = fields.find((sf) => sf.type === type);
    return f ? answerText(row[f.key]) : "";
  };

  let first = by("first_name");
  let last = by("last_name");
  if (!first && !last) {
    ({ first, last } = splitName(by("name")));
  }

  const contact: IntakeContact = {
    first_name: first,
    last_name: last,
    email: by("email") || byType("email"),
    phone: by("phone") || byType("phone"),
    role: by("role"),
    is_primary: false,
  };

  if (!contact.first_name && !contact.last_name && !contact.email) return null;
  return contact;
}

/**
 * Two contacts are the same person when they share an email; without one,
 * when they share a name. Stable across a re-submission, which is what stops
 * a client who was already set up collecting a second row each time.
 */
export function contactKey(c: {
  email?: string | null;
  first_name?: string | null;
  last_name?: string | null;
}): string {
  const email = (c.email ?? "").trim().toLowerCase();
  if (email) return `email:${email}`;
  return `name:${normalise(`${c.first_name ?? ""} ${c.last_name ?? ""}`)}`;
}

/**
 * Everyone the onboarding form named, primary contact first, with duplicates
 * inside the one submission already folded together.
 */
export function intakeContacts(
  questions: ContactSourceQuestion[],
  responses: { question_id: string; value: unknown }[],
): IntakeContact[] {
  const answers = new Map(responses.map((r) => [r.question_id, r.value]));
  const peopleGroup = findPeopleGroup(questions);

  const found: IntakeContact[] = [];
  const primary = resolvePrimary(questions, answers, peopleGroup);
  if (primary) found.push(primary);

  if (peopleGroup) {
    const rows = answers.get(peopleGroup.id);
    const fields = subFields(peopleGroup);
    if (Array.isArray(rows)) {
      for (const row of rows) {
        if (!row || typeof row !== "object") continue;
        const c = rowToContact(row as Record<string, unknown>, fields);
        if (c) found.push(c);
      }
    }
  }

  // The primary contact is listed first, so if they also appear in the team
  // list it is their own row that is kept.
  const byKey = new Map<string, IntakeContact>();
  for (const c of found) {
    const key = contactKey(c);
    if (key === "name:" || byKey.has(key)) continue;
    byKey.set(key, c);
  }
  return [...byKey.values()];
}
