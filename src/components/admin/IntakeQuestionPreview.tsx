"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { FIELD_COMPONENTS, IntakeSectionHeading } from "@/components/intake";
import PortalBackground from "@/components/portal/PortalBackground";

const EASE = "ease-brand";

interface IntakeQuestionPreviewProps {
  /**
   * Exactly the payload the editor saves, so the preview and the record can
   * never disagree about what was typed. Built by the form's own
   * `buildPayload`, which is also what the autosave sends.
   */
  question: IntakeQuestionInput;
  /** The question's real id when editing, so a radio group has a stable name. */
  questionId?: string;
  /** Real providers, so a provider picker previews with real people in it. */
  providers?: Provider[];
}

/**
 * ONE QUESTION, DRAWN THE WAY THE CLIENT WILL SEE IT.
 *
 * "I struggled a bit to picture what these would look like just by the names
 * (section, section subtitle, field name, etc.)". So the names on the left
 * get a picture on the right, and it moves as they type.
 *
 * Everything inside the dark panel is the onboarding form's own code: the
 * client's section heading, and the client's control for whichever field
 * type is chosen. Nothing here decides how a question looks. That is the
 * point. A hand-drawn copy would have gone stale the first time a field
 * changed.
 *
 * It renders at full size rather than in a scaled-down frame, the way the
 * page editor's slide preview does. A slide is a whole screen and has to be
 * shrunk to fit beside its editor. One question is a column, and the reason
 * this panel exists is to be read.
 */
export default function IntakeQuestionPreview({
  question,
  questionId,
  providers = [],
}: IntakeQuestionPreviewProps) {
  // The answer typed against one control means nothing to the next one: a
  // string where an array is expected crashes the control it lands in.
  const [value, setValue] = useState<unknown>(null);
  useEffect(() => setValue(null), [question.field_type]);

  const Component = FIELD_COMPONENTS[question.field_type];

  const previewQuestion: IntakeQuestionWithConditions = {
    id: questionId ?? "preview",
    page_number: question.page_number,
    section: question.section,
    section_subtitle: question.section_subtitle,
    field_label: question.field_label,
    field_type: question.field_type,
    options: question.options,
    required: question.required,
    sequence: question.sequence,
    config: question.config,
    // Visibility rules decide WHETHER a client sees the question, not what it
    // looks like, so they have nothing to say in here.
    intake_conditions: [],
  };

  // A question with nothing in it yet would draw a blank label above an empty
  // box, which reads as something broken rather than something unstarted.
  const started =
    !!question.field_label.trim() ||
    !!question.section?.trim() ||
    !!(question.config as { content?: string } | null)?.content?.trim();

  return (
    <div
      className="animate-rise xl:sticky xl:top-8"
      style={{ animationDelay: "180ms" }}
    >
      <div className="mb-3 flex items-center gap-2.5">
        <span className="h-px w-5 bg-lyp-cherry/30" />
        <span className="font-body text-[10px] font-medium uppercase tracking-[0.28em] text-lyp-cherry/70">
          Live Preview
        </span>
      </div>

      {/* The portal's own backdrop, not a flat black stand-in: the same
          drifting red smoke the client has behind them, with the question
          centred on it the way every portal screen is centred in what it is
          given. The controls were already the client's own, so the panel now
          matches the real page down to the colours and the fonts. */}
      <div className="relative flex min-h-[26rem] items-center overflow-hidden rounded-2xl border border-[#EFE6E6] px-6 py-10 md:px-10">
        <PortalBackground contained />
        <div className="relative z-10 w-full">
          {!started ? (
            <p className="font-body text-sm text-lyp-white/40">
              Type a field label on the left and the question appears here.
            </p>
          ) : (
            <>
              {question.section && (
                <div className="mb-7">
                  <IntakeSectionHeading
                    section={question.section}
                    subtitle={question.section_subtitle}
                  />
                </div>
              )}
              {Component ? (
                <Component
                  question={previewQuestion}
                  value={value}
                  onChange={setValue}
                  providers={providers}
                />
              ) : (
                <p className="font-body text-sm text-lyp-white/40">
                  This field type has no control yet, so a client would see
                  nothing here.
                </p>
              )}
            </>
          )}
        </div>
      </div>

      <p className="mt-3 font-body text-[11px] leading-relaxed text-[#867474]">
        Exactly what the client sees, updating as you type. Nothing you touch
        in here is saved.
      </p>

      <Link
        href="/admin/intake-questions/preview"
        target="_blank"
        title="Open the whole onboarding form as a client sees it"
        className={`mt-3 inline-flex items-center gap-2 rounded-full border border-[#EFE6E6] bg-lyp-white px-4 py-2 font-body text-[12.5px] font-semibold text-lyp-black transition-all duration-500 ${EASE} hover:border-lyp-cherry/25 hover:text-lyp-cherry active:scale-[0.985]`}
      >
        Preview the whole form
        <ExternalLink strokeWidth={1.5} className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}
