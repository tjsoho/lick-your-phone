import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getServices } from "@/server-actions/services";
import { getStates } from "@/server-actions/states";
import { getQuestions } from "@/server-actions/intake-questions";
import IntakeQuestionForm from "@/components/admin/IntakeQuestionForm";

const EASE = "ease-brand";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditIntakeQuestionPage({ params }: PageProps) {
  const { id } = await params;

  const [servicesRes, statesRes, questionsRes] = await Promise.all([
    getServices(),
    getStates(),
    getQuestions(),
  ]);

  const question = questionsRes.data?.find((q) => q.id === id);

  if (!question) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-[92rem]">
      <header className="animate-rise mb-6">
        <Link
          href="/admin/intake-questions"
          className={`group inline-flex items-center gap-2.5 font-body text-[12px] font-semibold tracking-wide text-[#8A7A7A] transition-colors duration-500 ${EASE} hover:text-lyp-cherry`}
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
            Edit Question
          </span>
        </div>
        <h1 className="mt-3 font-heading text-[28px] font-bold leading-[1.05] tracking-[-0.03em] text-lyp-black">
          Edit Intake Question
        </h1>
      </header>

      <div className="animate-rise" style={{ animationDelay: "80ms" }}>
        <IntakeQuestionForm
          question={question}
          services={servicesRes.data ?? []}
          states={statesRes.data ?? []}
          questions={questionsRes.data ?? []}
        />
      </div>
    </div>
  );
}
