"use client";

import { useState, useCallback, useMemo } from "react";
import { ChevronLeft, ChevronRight, Check, Loader2 } from "lucide-react";
import { useProposal } from "../ProposalContext";
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
import type { IntakeQuestion, Provider } from "@/server-actions/intake";
import { saveIntakeResponses, completeIntake } from "@/server-actions/intake";

interface IntakePageProps {
  questions: IntakeQuestion[];
  providers: Provider[];
  existingResponses: Record<string, unknown>;
}

const FIELD_COMPONENTS: Record<
  string,
  React.ComponentType<{
    question: IntakeQuestion;
    value: unknown;
    onChange: (value: unknown) => void;
    providers?: Provider[];
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
}: IntakePageProps) {
  const { proposal, selections } = useProposal();
  const [responses, setResponses] = useState<Record<string, unknown>>(
    existingResponses ?? {},
  );
  const [currentIntakePage, setCurrentIntakePage] = useState(1);
  const [saving, setSaving] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState("");

  console.log("selections", selections);

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
    (q: IntakeQuestion): boolean => {
      if (q.conditions.length === 0) return true;

      // All conditions must pass (AND logic)
      return q.conditions.every((c) => {
        switch (c.conditionType) {
          case "service_signed":
            if (!c.conditionServiceId) return true;
            return signedServiceIds.has(c.conditionServiceId);

          case "venue_state":
            // If no state filtering is possible at client level, show the question
            // The provider picker will filter by state server-side
            return true;

          case "answer_equals":
            if (!c.conditionQuestionId || c.conditionValue == null) return true;
            return responses[c.conditionQuestionId] === c.conditionValue;

          default:
            return true;
        }
      });
    },
    [signedServiceIds, responses],
  );

  // Get all unique page numbers
  const allPageNumbers = useMemo(
    () =>
      [...new Set(questions.map((q) => q.pageNumber))].sort((a, b) => a - b),
    [questions],
  );

  // Filter visible questions for the current intake page
  const visibleQuestionsForPage = useMemo(
    () =>
      questions
        .filter(
          (q) => q.pageNumber === currentIntakePage && isQuestionVisible(q),
        )
        .sort((a, b) => a.sequence - b.sequence),
    [questions, currentIntakePage, isQuestionVisible],
  );

  // Group visible questions by section
  const sections = useMemo(() => {
    const grouped: { section: string | null; questions: IntakeQuestion[] }[] =
      [];
    let currentSection: string | null | undefined = undefined;

    for (const q of visibleQuestionsForPage) {
      if (q.section !== currentSection) {
        currentSection = q.section;
        grouped.push({ section: currentSection, questions: [] });
      }
      grouped[grouped.length - 1].questions.push(q);
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
          (q) => q.pageNumber === pageNum && isQuestionVisible(q),
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
      if (q.fieldType === "static_content") continue;

      const val = responses[q.id];
      if (
        val == null ||
        val === "" ||
        (Array.isArray(val) && val.length === 0)
      ) {
        setError(`Please fill in "${q.fieldLabel}"`);
        return false;
      }
    }
    setError("");
    return true;
  }

  async function handleSaveAndNavigate(targetPage: number | null) {
    if (!validateCurrentPage()) return;

    setSaving(true);
    setError("");

    // Save current page responses
    const pageResponses = visibleQuestionsForPage
      .filter(
        (q) => q.fieldType !== "static_content" && responses[q.id] != null,
      )
      .map((q) => ({
        questionId: q.id,
        value: responses[q.id],
      }));

    if (pageResponses.length > 0) {
      const result = await saveIntakeResponses(proposal.id, pageResponses);
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
      if (result.error) {
        setError(`Failed to complete intake: ${result.error}`);
      } else {
        setCompleted(true);
        setIsEditing(false);
      }
    }

    setSaving(false);
  }

  function handleChange(questionId: string, val: unknown) {
    setResponses((prev) => ({ ...prev, [questionId]: val }));
    if (error) setError("");
  }

  // Completed state
  const isCompletedScreen =
    (completed || proposal.status === "intake_complete") && !isEditing;

  if (isCompletedScreen) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6 text-center">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-lyp-cherry/20">
          <Check className="h-8 w-8 text-lyp-cherry" />
        </div>
        <h1 className="font-heading text-3xl md:text-5xl text-lyp-white mb-4">
          All Done!
        </h1>
        <p className="font-body text-lyp-white/60 max-w-md mb-8">
          Thank you for completing the intake form. Your dedicated marketer will
          be in touch to schedule your onboarding call.
        </p>
        <button
          type="button"
          onClick={() => {
            setIsEditing(true);
            setCurrentIntakePage(1);
          }}
          className="font-body text-sm text-lyp-cherry hover:text-lyp-cherry/80 transition-colors"
        >
          Want to edit your responses?
        </button>
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
      (q) => q.pageNumber === pn && isQuestionVisible(q),
    );
    return pageQuestions.length > 0;
  });
  const currentVisibleIndex = visiblePageNumbers.indexOf(currentIntakePage);
  const totalVisiblePages = visiblePageNumbers.length;

  return (
    <div className="flex h-full flex-col">
      {/* Progress bar */}
      <div className="flex-shrink-0 px-6 pt-6">
        <div className="flex items-center justify-between mb-2">
          <span className="font-body text-xs text-lyp-white/40">
            Step {currentVisibleIndex + 1} of {totalVisiblePages}
          </span>
        </div>
        <div className="h-1 w-full rounded-full bg-lyp-white/10">
          <div
            className="h-1 rounded-full bg-lyp-cherry transition-all duration-300"
            style={{
              width: `${((currentVisibleIndex + 1) / totalVisiblePages) * 100}%`,
            }}
          />
        </div>
      </div>

      {/* Form content */}
      <div className="flex-1 overflow-y-auto px-6 py-8 md:px-16 lg:px-24">
        <div className="mx-auto max-w-2xl space-y-8">
          {sections.map((section, si) => (
            <div key={si}>
              {section.section && (
                <h2 className="font-heading text-xl text-lyp-white mb-6 border-b border-lyp-white/10 pb-3">
                  {section.section}
                </h2>
              )}
              <div className="space-y-6">
                {section.questions.map((q) => {
                  const Component = FIELD_COMPONENTS[q.fieldType];
                  if (!Component) return null;

                  return (
                    <Component
                      key={q.id}
                      question={q}
                      value={responses[q.id] ?? null}
                      onChange={(val) => handleChange(q.id, val)}
                      providers={providers}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="flex-shrink-0 px-6">
          <div className="mx-auto max-w-2xl rounded-lg bg-lyp-cherry/10 border border-lyp-cherry/30 px-4 py-3">
            <p className="font-body text-sm text-lyp-cherry">{error}</p>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex-shrink-0 border-t border-lyp-white/10 px-6 py-4">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <button
            type="button"
            onClick={() => {
              if (prevPage !== null) setCurrentIntakePage(prevPage);
            }}
            disabled={isFirstPage || saving}
            className="flex items-center gap-1 font-body text-sm text-lyp-white/60 transition-colors hover:text-lyp-white disabled:opacity-20"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </button>

          <button
            type="button"
            onClick={() => handleSaveAndNavigate(isLastPage ? null : nextPage)}
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-lyp-cherry px-6 py-2.5 font-body text-sm font-semibold text-lyp-white transition-colors hover:bg-lyp-cherry/90 disabled:opacity-50"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {isLastPage ? "Submit" : "Continue"}
            {!isLastPage && <ChevronRight className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
