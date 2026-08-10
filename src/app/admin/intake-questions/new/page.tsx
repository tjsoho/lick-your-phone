import Link from "next/link";
import { getServices } from "@/server-actions/services";
import { getStates } from "@/server-actions/states";
import { getQuestions } from "@/server-actions/intake-questions";
import IntakeQuestionForm from "@/components/admin/IntakeQuestionForm";

export default async function NewIntakeQuestionPage() {
  const [servicesRes, statesRes, questionsRes] = await Promise.all([
    getServices(),
    getStates(),
    getQuestions(),
  ]);

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/admin/intake-questions"
          className="text-sm font-body text-gray-500 hover:text-lyp-cherry transition-colors"
        >
          &larr; Back to questions
        </Link>
        <h1 className="text-2xl font-heading font-bold text-lyp-black">
          Add Intake Question
        </h1>
      </div>

      <IntakeQuestionForm
        services={servicesRes.data ?? []}
        states={statesRes.data ?? []}
        questions={questionsRes.data ?? []}
      />
    </div>
  );
}
