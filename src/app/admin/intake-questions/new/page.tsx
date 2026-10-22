import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getServices } from "@/server-actions/services";
import { getStates } from "@/server-actions/states";
import { getQuestions } from "@/server-actions/intake-questions";
import IntakeQuestionForm from "@/components/admin/IntakeQuestionForm";

const EASE = "ease-brand";

export default async function NewIntakeQuestionPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page } = await searchParams;
  const [servicesRes, statesRes, questionsRes] = await Promise.all([
    getServices(),
    getStates(),
    getQuestions(),
  ]);

  // Every "Add question" button sits at the foot of one page's list, so the
  // page it was clicked under rides along in the URL and the form opens on it.
  // Nothing in the URL means page 1, which is where the form always used to
  // start.
  const asked = Number(page);
  const initialPageNumber = Number.isInteger(asked) && asked > 0 ? asked : 1;

  // Clicked at the foot of the list, the question should land at the foot of
  // the list, not on top of whatever is already sequence 1.
  const initialSequence =
    (questionsRes.data ?? [])
      .filter((q) => q.page_number === initialPageNumber)
      .reduce((highest, q) => Math.max(highest, q.sequence), 0) + 1;

  return (
    <div className="mx-auto max-w-[92rem]">
      <header className="animate-rise mb-6">
        <Link
          href="/admin/intake-questions"
          title="Back to all onboarding questions"
          className={`group inline-flex items-center gap-2.5 font-body text-[12px] font-semibold tracking-wide text-[#6B5A5A] transition-colors duration-500 ${EASE} hover:text-lyp-cherry`}
        >
          <span
            className={`flex h-7 w-7 items-center justify-center rounded-full bg-[#F7F1F1] transition-transform duration-500 ${EASE} group-hover:-translate-x-0.5`}
          >
            <ArrowLeft strokeWidth={1.5} className="h-3.5 w-3.5" />
          </span>
          Back to questions
        </Link>

        <div className="mt-5 flex items-center gap-3">
          <span className="h-px w-7 bg-lyp-cherry/30" />
          <span className="font-body text-[10px] font-medium uppercase tracking-[0.32em] text-lyp-cherry/70">
            New Question
          </span>
        </div>
        <h1 className="mt-3 font-heading text-[28px] font-bold leading-[1.05] tracking-[-0.03em] text-lyp-black">
          Add Onboarding Question
        </h1>
      </header>

      <div className="animate-rise" style={{ animationDelay: "80ms" }}>
        <IntakeQuestionForm
          services={servicesRes.data ?? []}
          states={statesRes.data ?? []}
          questions={questionsRes.data ?? []}
          initialPageNumber={initialPageNumber}
          initialSequence={initialSequence}
        />
      </div>
    </div>
  );
}
