import Link from "next/link";
import { AlertCircle, Plus } from "lucide-react";
import { getQuestions } from "@/server-actions/intake-questions";
import IntakeQuestionsList from "@/components/admin/IntakeQuestionsList";

const EASE = "ease-brand";

export default async function IntakeQuestionsPage() {
  const { data: questions, error } = await getQuestions();

  return (
    <div className="mx-auto max-w-[92rem]">
      <header className="animate-rise mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="h-px w-7 bg-lyp-cherry/30" />
            <span className="font-body text-[10px] font-medium uppercase tracking-[0.32em] text-lyp-cherry/70">
              Onboarding
            </span>
          </div>
          <h1 className="mt-3 font-heading text-[28px] font-bold leading-[1.05] tracking-[-0.03em] text-lyp-black">
            Intake Questions
          </h1>
          <p className="mt-2 font-body text-[13px] text-[#8A7A7A]">
            Manage the questionnaire clients fill out during onboarding.
          </p>
        </div>

        <Link
          href="/admin/intake-questions/new"
          className={`group inline-flex items-center gap-3 rounded-full bg-lyp-cherry py-1.5 pl-6 pr-1.5 font-body text-[13px] font-semibold tracking-wide text-lyp-white shadow-[0_10px_30px_-10px_rgba(178,38,38,0.5)] transition-all duration-500 ${EASE} hover:bg-[#c22e2e] active:scale-[0.985]`}
        >
          Add Question
          <span
            className={`flex h-8 w-8 items-center justify-center rounded-full bg-lyp-white/15 transition-transform duration-500 ${EASE} group-hover:scale-105`}
          >
            <Plus strokeWidth={1.5} className="h-4 w-4" />
          </span>
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
        <IntakeQuestionsList questions={questions ?? []} />
      </div>
    </div>
  );
}
