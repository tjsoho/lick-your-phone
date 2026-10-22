import { AlertCircle } from "lucide-react";
import {
  getQuestions,
  getIntakePageTitles,
} from "@/server-actions/intake-questions";
import IntakeQuestionsList from "@/components/admin/IntakeQuestionsList";

export default async function IntakeQuestionsPage() {
  const { data: questions, error } = await getQuestions();
  const { data: pageTitles } = await getIntakePageTitles();

  return (
    <div className="mx-auto max-w-[92rem]">
      {/* No "Add Question" button up here any more. The agency asked for one at
          the foot of each page's list instead, so the button that adds a
          question sits next to the questions it will join, and carries that
          page number with it. IntakeQuestionsList owns them all now. */}
      <header className="animate-rise mb-6">
        <div className="flex items-center gap-3">
          <span className="h-px w-7 bg-lyp-cherry/30" />
          <span className="font-body text-[10px] font-medium uppercase tracking-[0.32em] text-lyp-cherry/70">
            Onboarding
          </span>
        </div>
        <h1 className="mt-3 font-heading text-[28px] font-bold leading-[1.05] tracking-[-0.03em] text-lyp-black">
          Onboarding Questions
        </h1>
      </header>

      {error && (
        <div
          role="alert"
          className="animate-rise mb-5 flex items-start gap-3 rounded-2xl border border-lyp-cherry/15 bg-lyp-cherry/[0.04] px-4 py-3.5"
          style={{ animationDelay: "80ms" }}
        >
          <AlertCircle
            strokeWidth={1.25}
            className="mt-px h-4 w-4 flex-shrink-0 text-lyp-cherry"
          />
          <p className="font-body text-[13px] text-lyp-cherry">
            Failed to load questions: {error}
          </p>
        </div>
      )}

      <div className="animate-rise" style={{ animationDelay: "140ms" }}>
        <IntakeQuestionsList
          questions={questions ?? []}
          pageTitles={pageTitles}
        />
      </div>
    </div>
  );
}
