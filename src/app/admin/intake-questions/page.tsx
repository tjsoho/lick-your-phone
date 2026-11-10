import Link from "next/link";
import { AlertCircle, Eye } from "lucide-react";
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
      <header className="animate-rise mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="h-px w-7 bg-lyp-cherry/30" />
            <span className="font-body text-[10px] font-medium uppercase tracking-[0.32em] text-lyp-cherry/70">
              Onboarding
            </span>
          </div>
          <h1 className="mt-3 font-heading text-[28px] font-bold leading-[1.05] tracking-[-0.03em] text-lyp-black">
            Onboarding Questions
          </h1>
        </div>

        {/* The whole form, without making a test proposal to see it: "in
            order to see my new question I had to test it." A new tab, so the
            list they were working down is still where they left it. */}
        <Link
          href="/admin/intake-questions/preview"
          target="_blank"
          title="See the whole form the way a client sees it"
          className="group inline-flex items-center gap-2.5 rounded-full border border-[#EFE6E6] bg-lyp-white px-5 py-2.5 font-body text-[12.5px] font-semibold tracking-wide text-lyp-black transition-all duration-500 ease-brand hover:border-lyp-cherry/25 hover:text-lyp-cherry active:scale-[0.985]"
        >
          Preview form
          <Eye strokeWidth={1.5} className="h-3.5 w-3.5" />
        </Link>
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
