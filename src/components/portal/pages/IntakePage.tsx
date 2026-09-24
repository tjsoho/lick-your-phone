"use client";

import { useState, useCallback, useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  ClipboardList,
  Download,
  ExternalLink,
  FileSignature,
  Loader2,
  Lock,
  ScrollText,
} from "lucide-react";
import { useCopy, useProposal } from "../ProposalContext";
import {
  TextField,
  TextareaField,
  EmailField,
  PhoneField,
  AbnField,
  AddressField,
  RadioField,
  CheckboxField,
  MultiselectField,
  FileField,
  MatrixField,
  RepeatableGroupField,
  ProviderPickerField,
  StaticContentField,
} from "@/components/intake";
import { saveIntakeResponses, completeIntake } from "@/server-actions/intake";
import Reveal, { revealDelay } from "../Reveal";

/**
 * A "same as above" shortcut, declared on the first question of a section.
 *
 * `pairs` are [target label, source label] within the same page, so the same
 * mechanism works for any section without naming question ids in code:
 *   { "same_as": { "label": "Same as director",
 *                  "pairs": [["First Name", "Director First Name"]] } }
 *
 * An empty `label` falls back to the editable "Same as above" wording.
 */
type SameAsConfig = {
  label: string;
  pairs: [string, string][];
};

function readSameAs(config: unknown): SameAsConfig | null {
  const raw = (config as { same_as?: unknown } | null)?.same_as;
  if (!raw || typeof raw !== "object") return null;
  const { label, pairs } = raw as { label?: unknown; pairs?: unknown };
  if (!Array.isArray(pairs) || pairs.length === 0) return null;
  return {
    label: typeof label === "string" ? label : "",
    pairs: pairs.filter(
      (p): p is [string, string] =>
        Array.isArray(p) && p.length === 2 && p.every((x) => typeof x === "string"),
    ),
  };
}

interface IntakePageProps {
  questions: IntakeQuestionWithConditions[];
  providers: Provider[];
  existingResponses: Record<string, unknown>;
  /**
   * Whether a signed agreement exists to download. Resolved server-side from
   * the documents table: a proposal that reached this form has been signed,
   * but the document behind it can still be missing, and a button that 404s
   * is worse than no button.
   */
  hasContract: boolean;
  /** Page number to the name the agency gave it, where they gave one. */
  pageTitles?: Record<number, string>;
}

/**
 * Whether a question opens with the proposal's own email already in it.
 *
 * Keyed off `field_type` alone — the one thing about a question that stays
 * true when the lead rewords its label or renumbers the page. Every email
 * question is asking for a way to reach this client, so every one of them
 * starts from the address we already hold. A question that shouldn't (an
 * accountant's, say) opts out in its own data with `{"prefill": false}`.
 */
function prefillsClientEmail(q: IntakeQuestionWithConditions): boolean {
  if (q.field_type !== "email") return false;
  return (q.config as { prefill?: unknown } | null)?.prefill !== false;
}

/**
 * The saved answers, with the client's email filled into the email questions
 * they have never answered.
 *
 * It fills blanks only: a question with a row of its own — including one the
 * client deliberately emptied — is left exactly as they left it. The value is
 * a real, editable answer from the first render, so whatever they type over
 * it is what gets saved.
 */
function withClientEmail(
  saved: Record<string, unknown>,
  questions: IntakeQuestionWithConditions[],
  email: string | null | undefined,
): Record<string, unknown> {
  if (!email) return saved;

  const next = { ...saved };
  for (const q of questions) {
    if (!prefillsClientEmail(q)) continue;
    if (Object.prototype.hasOwnProperty.call(saved, q.id)) continue;
    next[q.id] = email;
  }
  return next;
}

/**
 * Field types whose answer is CHOSEN from a set rather than typed. If such a
 * question has an empty set, there is literally nothing the client can do with
 * it — so a required one must not be allowed to block the form.
 */
const OPTION_FIELD_TYPES = new Set([
  "radio",
  "checkbox",
  "multiselect",
  "provider_picker",
]);

/**
 * How many options a question can actually offer right now.
 *
 * `null` means the question is not option-based (free text, a file, an
 * address) and the count does not apply. `0` means it IS option-based and has
 * nothing to offer — a photographer picker in a region with no photographers
 * on the books, for instance.
 *
 * Deliberately generic: it keys off the question's own option set, not off a
 * hardcoded id, slug or field type, so any future question that ends up with
 * an empty set behaves the same way without another patch here.
 */
function availableOptionCount(
  q: IntakeQuestionWithConditions,
  providers: Provider[],
): number | null {
  if (!OPTION_FIELD_TYPES.has(q.field_type)) return null;

  if (q.field_type === "provider_picker") {
    // Mirrors ProviderPickerField's own filter, so what validation counts is
    // exactly what the client is shown.
    const providerType = (q.config as Record<string, string> | null)
      ?.providerType;
    return (providers ?? []).filter(
      (p) => !providerType || p.type === providerType,
    ).length;
  }

  return Array.isArray(q.options) ? q.options.length : 0;
}

const FIELD_COMPONENTS: Record<
  string,
  React.ComponentType<{
    question: IntakeQuestionWithConditions;
    value: unknown;
    onChange: (value: unknown) => void;
    providers?: Provider[];
    disabled?: boolean;
  }>
> = {
  text: TextField,
  textarea: TextareaField,
  email: EmailField,
  phone: PhoneField,
  abn: AbnField,
  address: AddressField,
  radio: RadioField,
  checkbox: CheckboxField,
  multiselect: MultiselectField,
  file: FileField,
  matrix: MatrixField,
  repeatable_group: RepeatableGroupField,
  provider_picker: ProviderPickerField,
  static_content: StaticContentField,
};

export default function IntakePage({
  questions,
  providers,
  existingResponses,
  hasContract,
  pageTitles = {},
}: IntakePageProps) {
  const { proposal, selections, agreement } = useProposal();
  const t = useCopy("intake");
  const [sameAsOn, setSameAsOn] = useState<Record<string, boolean>>({});
  // Prefilled once, at mount: from here on the answers are the client's own.
  const [responses, setResponses] = useState<Record<string, unknown>>(() =>
    withClientEmail(existingResponses ?? {}, questions, proposal.clientEmail),
  );
  const [currentIntakePage, setCurrentIntakePage] = useState(1);
  const [saving, setSaving] = useState(false);
  const [completed, setCompleted] = useState(false);
  /** Reading the submitted answers back, rather than filling the form in. */
  const [reviewing, setReviewing] = useState(false);
  const [error, setError] = useState("");

  /**
   * Submitted answers are final. The client can read them; changing them goes
   * through the team. `intake_complete` is the only thing that locks the form,
   * and only a finished submission ever writes it — a part-filled form is
   * still `signed`, so nobody is locked out of work they haven't handed in.
   */
  const locked = completed || proposal.status === "intake_complete";

  // Build a set of signed service slugs for condition evaluation
  const signedServiceIds = useMemo(
    () => new Set(selections.map((s) => s.serviceId)),
    [selections],
  );

  // We don't have venue state directly in ProposalContext,
  // so we pass all providers and let the picker filter by type
  // Conditions based on venue_state will show the question when no venue state is known

  // Evaluate whether a question should be visible
  const isQuestionVisible = useCallback(
    (q: IntakeQuestionWithConditions): boolean => {
      if (q.intake_conditions.length === 0) return true;

      // Conditions of the SAME kind are alternatives; different kinds all have
      // to hold. Two "service signed" rows on one question mean "either of
      // these services", which is how the agency writes them — the
      // videographer picker is tied to both videography services and is meant
      // to appear for a client who bought one of them. ANDing those hid it
      // from everyone who had not bought both.
      const met = (c: IntakeQuestionWithConditions["intake_conditions"][number]) => {
        switch (c.condition_type) {
          case "service_signed":
            if (!c.condition_service_id) return true;
            return signedServiceIds.has(c.condition_service_id);

          case "venue_state":
            // If no state filtering is possible at client level, show the question
            // The provider picker will filter by state server-side
            return true;

          case "answer_equals":
            if (!c.condition_question_id || c.condition_value == null)
              return true;
            return responses[c.condition_question_id] === c.condition_value;

          default:
            return true;
        }
      };

      const byKind = new Map<
        string,
        IntakeQuestionWithConditions["intake_conditions"]
      >();
      for (const c of q.intake_conditions) {
        const list = byKind.get(c.condition_type) ?? [];
        list.push(c);
        byKind.set(c.condition_type, list);
      }

      return [...byKind.values()].every((group) => group.some(met));
    },
    [signedServiceIds, responses],
  );

  // Get all unique page numbers
  const allPageNumbers = useMemo(
    () =>
      [...new Set(questions.map((q) => q.page_number))].sort((a, b) => a - b),
    [questions],
  );

  // Filter visible questions for the current intake page
  const visibleQuestionsForPage = useMemo(
    () =>
      questions
        .filter(
          (q) => q.page_number === currentIntakePage && isQuestionVisible(q),
        )
        .sort((a, b) => a.sequence - b.sequence),
    [questions, currentIntakePage, isQuestionVisible],
  );

  // Group visible questions by section
  const sections = useMemo(() => {
    const grouped: {
      section: string | null;
      subtitle: string | null;
      sameAs: SameAsConfig | null;
      questions: IntakeQuestionWithConditions[];
    }[] = [];
    let currentSection: string | null | undefined = undefined;

    for (const q of visibleQuestionsForPage) {
      if (q.section !== currentSection) {
        currentSection = q.section;
        grouped.push({
          section: currentSection,
          subtitle: null,
          // The first question of a section carries its "same as" shortcut.
          sameAs: readSameAs(q.config),
          questions: [],
        });
      }
      const group = grouped[grouped.length - 1];
      // The subtitle describes the SECTION, not the question it is stored on,
      // so the first question that carries one wins. Taking it from the first
      // question only would lose the strapline whenever that question is
      // conditioned away.
      if (!group.subtitle && q.section_subtitle) {
        group.subtitle = q.section_subtitle;
      }
      group.questions.push(q);
    }
    return grouped;
  }, [visibleQuestionsForPage]);

  // Check if current page has any visible questions
  // Skip pages with no visible questions
  const hasVisibleContent = visibleQuestionsForPage.length > 0;

  // Find next/prev page with visible content
  const findNextPage = useCallback(
    (dir: 1 | -1): number | null => {
      const currentIdx = allPageNumbers.indexOf(currentIntakePage);
      let nextIdx = currentIdx + dir;
      while (nextIdx >= 0 && nextIdx < allPageNumbers.length) {
        const pageNum = allPageNumbers[nextIdx];
        const pageQuestions = questions.filter(
          (q) => q.page_number === pageNum && isQuestionVisible(q),
        );
        if (pageQuestions.length > 0) return pageNum;
        nextIdx += dir;
      }
      return null;
    },
    [allPageNumbers, currentIntakePage, questions, isQuestionVisible],
  );

  const nextPage = findNextPage(1);
  const prevPage = findNextPage(-1);
  const isFirstPage = prevPage === null;
  const isLastPage = nextPage === null;

  // Validate required fields on current page
  function validateCurrentPage(): boolean {
    for (const q of visibleQuestionsForPage) {
      if (!q.required) continue;
      if (q.field_type === "static_content") continue;

      // A required question with an EMPTY option set is a dead end: there is
      // nothing to select, so demanding a selection strands the client on the
      // step forever. Skipped questions submit exactly as an unanswered
      // optional one would — nothing is written, nothing is fabricated.
      // A required question that DOES have options still blocks, unchanged.
      if (availableOptionCount(q, providers) === 0) continue;

      const val = responses[q.id];
      if (
        val == null ||
        val === "" ||
        (Array.isArray(val) && val.length === 0)
      ) {
        setError(`Please fill in "${q.field_label}"`);
        return false;
      }
    }
    setError("");
    return true;
  }

  /**
   * The server has told us the answers are already in — a second tab got
   * there first, or a double click outran the button. Show the client the
   * finished screen rather than an error they can do nothing about.
   */
  function fallIntoLockedState() {
    setCompleted(true);
    setReviewing(false);
    setSaving(false);
    setError("");
  }

  async function handleSaveAndNavigate(targetPage: number | null) {
    // Nothing writes once the form is locked. The buttons are gone by then;
    // this is the guard behind them.
    if (locked) return;
    if (!validateCurrentPage()) return;

    setSaving(true);
    setError("");

    // Save current page responses
    const pageResponses = visibleQuestionsForPage
      .filter(
        (q) => q.field_type !== "static_content" && responses[q.id] != null,
      )
      .map((q) => ({
        questionId: q.id,
        value: responses[q.id],
      }));

    if (pageResponses.length > 0) {
      const result = await saveIntakeResponses(proposal.id, pageResponses);
      if (result.locked) return fallIntoLockedState();
      if (result.error) {
        setError(`Failed to save: ${result.error}`);
        setSaving(false);
        return;
      }
    }

    if (targetPage !== null) {
      setCurrentIntakePage(targetPage);
    } else {
      // Final page — complete intake
      const result = await completeIntake(proposal.id);
      if (result.locked) return fallIntoLockedState();
      if (result.error) {
        setError(`Failed to complete intake: ${result.error}`);
      } else {
        setCompleted(true);
        setReviewing(false);
      }
    }

    setSaving(false);
  }

  function handleChange(questionId: string, val: unknown) {
    setResponses((prev) => ({ ...prev, [questionId]: val }));
    if (error) setError("");
  }

  /**
   * Copies the source answers onto the target fields, or clears them again
   * when unticked, so the shortcut is always reversible.
   */
  function applySameAs(cfg: SameAsConfig, on: boolean) {
    const byLabel = new Map(
      visibleQuestionsForPage.map((q) => [q.field_label, q.id]),
    );

    setResponses((prev) => {
      const next = { ...prev };
      for (const [targetLabel, sourceLabel] of cfg.pairs) {
        const targetId = byLabel.get(targetLabel);
        const sourceId = byLabel.get(sourceLabel);
        if (!targetId || !sourceId) continue;
        next[targetId] = on ? (prev[sourceId] ?? "") : "";
      }
      return next;
    });
    if (error) setError("");
  }

  // Completed state. No edit affordance: the only way back in is to read.
  if (locked && !reviewing) {
    /* The end of the journey, and the three things it leaves them with. The
       agreement is dropped rather than shown broken when no document exists;
       the terms and the form answer for themselves, so they always stand. */
    const takeaways = [
      ...(hasContract
        ? [
            {
              href: `/api/contract/by-token/${proposal.token}`,
              Icon: FileSignature,
              label: t("downloadAgreement"),
              note: t("downloadAgreementNote"),
            },
          ]
        : []),
      {
        href: `/api/terms/${proposal.token}`,
        Icon: ScrollText,
        label: t("downloadTerms"),
        note: t("downloadTermsNote"),
        // The agency may have pointed the terms at a page they host, in which
        // case this opens a website rather than saving a file, and the card
        // should say so.
        external: agreement.termsKind === "link",
      },
      {
        href: `/api/intake/${proposal.token}`,
        Icon: ClipboardList,
        label: t("downloadIntake"),
        note: t("downloadIntakeNote"),
      },
    ];

    return (
      <div className="flex h-full flex-col items-center justify-center px-6 py-8 text-center">
        <Reveal
          variant="pop"
          index={0}
          className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-lyp-cherry/20"
        >
          <Check className="h-8 w-8 text-lyp-cherry" />
        </Reveal>
        <Reveal as="h1" index={1} className="font-heading text-3xl md:text-5xl text-lyp-white">
          {t("doneTitle")}
        </Reveal>
        <Reveal as="p" index={2} className="mt-3 max-w-md font-body text-lyp-white/60">
          {t("doneBody")}
        </Reveal>

        {/* A rule with the heading sitting in it: a break between what has
            happened and what they can take away with them. */}
        <Reveal index={3} className="mt-8 flex w-full max-w-3xl items-center gap-4">
          <span className="h-px flex-1 bg-lyp-white/10" />
          <span className="font-body text-[10px] uppercase tracking-[0.3em] text-lyp-white/40">
            {t("downloadsTitle")}
          </span>
          <span className="h-px flex-1 bg-lyp-white/10" />
        </Reveal>

        <div className="mt-5 grid w-full max-w-3xl gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {takeaways.map((doc, i) => (
            <Reveal key={doc.href} index={4 + i} className="h-full">
              {/* Plain links, so the browser downloads them the way it
                  downloads anything else — no fetch, no spinner, no state. */}
              <a
                href={doc.href}
                {...(doc.external
                  ? { target: "_blank", rel: "noopener noreferrer" }
                  : {})}
                className="group flex h-full flex-col items-center gap-2 rounded-xl border border-lyp-white/10 bg-lyp-white/[0.04] px-5 py-5 transition-[background-color,border-color,transform] duration-300 ease-brand hover:-translate-y-0.5 hover:border-lyp-cherry/40 hover:bg-lyp-cherry/[0.08] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-lyp-cherry/15 text-lyp-cherry transition-colors duration-300 ease-brand group-hover:bg-lyp-cherry/25 motion-reduce:transition-none">
                  <doc.Icon className="h-4 w-4" />
                </span>
                <span className="font-heading text-base text-lyp-white">
                  {doc.label}
                </span>
                <span className="font-body text-xs leading-relaxed text-lyp-white/40">
                  {doc.note}
                </span>
                <span className="mt-auto inline-flex items-center gap-1.5 pt-2 font-body text-[11px] text-lyp-cherry">
                  {doc.external ? (
                    <ExternalLink className="h-3 w-3 transition-transform duration-300 ease-brand group-hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-y-0" />
                  ) : (
                    <Download className="h-3 w-3 transition-transform duration-300 ease-brand group-hover:translate-y-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-y-0" />
                  )}
                  {doc.external ? t("openAction") : t("downloadAction")}
                </span>
              </a>
            </Reveal>
          ))}
        </div>

        {/* Said plainly, once: the answers are in, and a person handles any
            change. No warning colour — nothing has gone wrong. */}
        <Reveal
          as="p"
          index={4 + takeaways.length}
          className="mt-8 flex max-w-md items-start gap-2 font-body text-sm leading-relaxed text-lyp-white/40"
        >
          <Lock className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
          <span>{t("lockedNote")}</span>
        </Reveal>
        <Reveal index={5 + takeaways.length} className="mt-5">
          <button
            type="button"
            onClick={() => {
              setReviewing(true);
              setCurrentIntakePage(1);
            }}
            className="font-body text-sm text-lyp-cherry transition-colors duration-300 ease-brand hover:text-lyp-cherry/80"
          >
            {t("reviewResponses")}
          </button>
        </Reveal>
      </div>
    );
  }

  // Skip empty pages automatically on first render
  if (!hasVisibleContent && allPageNumbers.length > 0) {
    const next = findNextPage(1);
    if (next !== null) {
      // Use a timeout to avoid state update during render
      setTimeout(() => setCurrentIntakePage(next), 0);
    }
    return null;
  }

  // Page progress
  const visiblePageNumbers = allPageNumbers.filter((pn) => {
    const pageQuestions = questions.filter(
      (q) => q.page_number === pn && isQuestionVisible(q),
    );
    return pageQuestions.length > 0;
  });
  const currentVisibleIndex = visiblePageNumbers.indexOf(currentIntakePage);
  const totalVisiblePages = visiblePageNumbers.length;

  return (
    <div className="flex h-full flex-col">
      {/* Progress bar */}
      <div className="flex-shrink-0 px-6 pt-6">
        <div className="mb-2 flex items-baseline justify-between gap-4">
          <span className="font-body text-xs text-lyp-white/40">
            {t("stepProgress", {
              current: currentVisibleIndex + 1,
              total: totalVisiblePages,
            })}
          </span>
          {/* The agency's own name for this step, set beside the counter
              rather than above the questions, where the first section's
              heading already sits. Unnamed pages say nothing extra. */}
          {pageTitles[currentIntakePage] && (
            <span className="truncate font-heading text-xs uppercase tracking-[0.18em] text-lyp-white/70">
              {pageTitles[currentIntakePage]}
            </span>
          )}
        </div>
        <div className="h-1 w-full overflow-hidden rounded-full bg-lyp-white/10">
          {/* scaleX rather than width — a transform, so the bar advances on
              the compositor and never triggers layout. */}
          <div
            className="h-1 w-full origin-left rounded-full bg-lyp-cherry transition-transform duration-700 ease-brand motion-reduce:transition-none"
            style={{
              transform: `scaleX(${
                (currentVisibleIndex + 1) / Math.max(totalVisiblePages, 1)
              })`,
            }}
          />
        </div>
      </div>

      {/* Form content */}
      <div className="flex-1 overflow-y-auto px-6 py-8 md:px-16 lg:px-24">
        {/* Read-only from here down once the answers are in. A disabled
            fieldset inerts every control inside it in one move, so no field
            component has to remember to check. */}
        {locked && (
          <div className="mx-auto mb-8 max-w-2xl rounded-lg border border-lyp-white/10 bg-lyp-white/5 px-4 py-3">
            <p className="flex items-center gap-2 font-body text-sm text-lyp-white/50">
              <Lock className="h-3.5 w-3.5 flex-shrink-0" />
              {t("reviewBanner")}
            </p>
          </div>
        )}
        {/* `min-w-0` undoes the fieldset's own `min-inline-size: min-content`,
            which would otherwise stop the form narrowing on a phone. */}
        <fieldset disabled={locked} className="m-0 min-w-0 border-0 p-0">
          {/* Keyed on the step number: moving between intake pages remounts
              the stack, so the cascade replays on every step rather than only
              on first load. The running counter `qi` carries the delay ACROSS
              sections, so the form reads as one list, not several. */}
          <div key={currentIntakePage} className="mx-auto max-w-2xl">
            {(() => {
              let qi = 0;
              return sections.map((section, si) => {
                /* A real break between blocks of questions: a rule and a wide
                   gap ABOVE the heading. A rule under the heading only ever
                   underlined it — from the client's side "Meta Digital Ads"
                   read as one more question in the Facebook list. The first
                   section on a step opens the page and needs neither. */
                const breakClass =
                  si === 0
                    ? ""
                    : section.section
                      ? "mt-14 border-t border-lyp-white/10 pt-12"
                      : "mt-8";

                return (
                  <div key={si} className={breakClass}>
                    {section.section && (
                      <Reveal delay={revealDelay(qi++)} className="mb-7">
                        <h2 className="font-heading text-2xl text-lyp-white md:text-3xl">
                          {section.section}
                        </h2>
                        {/* Says what the section is for, so "Access Audit" is not
                            a mystery to the person filling it in. */}
                        {section.subtitle && (
                          <p className="mt-2 max-w-xl font-body text-sm leading-relaxed text-lyp-white/50">
                            {section.subtitle}
                          </p>
                        )}
                      </Reveal>
                    )}
                    {/* Saves retyping details already given just above. */}
                    {section.sameAs && (
                      <Reveal delay={revealDelay(qi++)} className="mb-5">
                        <label className="inline-flex cursor-pointer items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={!!sameAsOn[section.section ?? ""]}
                            onChange={(e) => {
                              const on = e.target.checked;
                              setSameAsOn((prev) => ({
                                ...prev,
                                [section.section ?? ""]: on,
                              }));
                              applySameAs(section.sameAs!, on);
                            }}
                            className="h-4 w-4 cursor-pointer accent-lyp-cherry"
                          />
                          <span className="font-body text-sm text-lyp-white/70">
                            {section.sameAs.label || t("sameAsLabel")}
                          </span>
                        </label>
                      </Reveal>
                    )}

                    <div className="space-y-6">
                      {section.questions.map((q) => {
                        const Component = FIELD_COMPONENTS[q.field_type];
                        if (!Component) return null;

                        return (
                          <Reveal key={q.id} delay={revealDelay(qi++)}>
                            <Component
                              question={q}
                              value={responses[q.id] ?? null}
                              onChange={(val) => handleChange(q.id, val)}
                              providers={providers}
                              disabled={locked}
                            />
                          </Reveal>
                        );
                      })}
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </fieldset>
      </div>

      {/* Error message */}
      {error && (
        <div className="flex-shrink-0 px-6">
          <div className="portal-reveal portal-reveal-fall mx-auto max-w-2xl rounded-lg bg-lyp-cherry/10 border border-lyp-cherry/30 px-4 py-3">
            <p className="font-body text-sm text-lyp-cherry">{error}</p>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex-shrink-0 border-t border-lyp-white/10 px-6 py-4">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          {/* No Back on the final step — nothing should compete with
              Submit once the last question is answered. Reading the answers
              back there is no Submit, so Back stays. */}
          {isLastPage && !locked ? (
            <span aria-hidden />
          ) : (
            <button
              type="button"
              onClick={() => {
                if (prevPage !== null) setCurrentIntakePage(prevPage);
              }}
              disabled={isFirstPage || saving}
              className="group flex items-center gap-1 font-body text-sm text-lyp-white/60 transition-colors duration-300 ease-brand hover:text-lyp-white disabled:opacity-20"
            >
              <ChevronLeft className="h-4 w-4 transition-transform duration-300 ease-brand group-hover:-translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0" />
              {t("backButton")}
            </button>
          )}

          {/* Locked, this button only turns pages and then closes the read —
              it never saves, and there is no second Submit to press. */}
          <button
            type="button"
            onClick={() => {
              if (!locked) {
                handleSaveAndNavigate(isLastPage ? null : nextPage);
                return;
              }
              if (isLastPage) setReviewing(false);
              else if (nextPage !== null) setCurrentIntakePage(nextPage);
            }}
            disabled={saving}
            className="group flex items-center gap-2 rounded-lg bg-lyp-cherry px-6 py-2.5 font-body text-sm font-semibold text-lyp-white transition-[background-color,transform] duration-300 ease-brand hover:bg-lyp-cherry/90 active:scale-[0.97] disabled:opacity-50 motion-reduce:transition-none motion-reduce:active:scale-100"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {isLastPage
              ? t(locked ? "reviewDone" : "submitButton")
              : t("continueButton")}
            {!isLastPage && (
              <ChevronRight className="h-4 w-4 transition-transform duration-300 ease-brand group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
