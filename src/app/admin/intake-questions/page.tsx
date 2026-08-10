import Link from "next/link";
import { Plus } from "lucide-react";
import { getQuestions } from "@/server-actions/intake-questions";
import IntakeQuestionsList from "@/components/admin/IntakeQuestionsList";

export default async function IntakeQuestionsPage() {
  const { data: questions, error } = await getQuestions();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-heading font-bold text-lyp-black">
            Intake Questions
          </h1>
          <p className="font-body text-sm text-gray-500 mt-1">
            Manage the questionnaire clients fill out during onboarding.
          </p>
        </div>
        <Link
          href="/admin/intake-questions/new"
          className="inline-flex items-center gap-2 bg-lyp-cherry text-white px-4 py-2 rounded-md font-body text-sm hover:bg-lyp-maroon transition-colors"
        >
          <Plus className="h-4 w-4" /> Add Question
        </Link>
      </div>

      {error && (
        <p className="text-red-600 mb-4">Failed to load questions: {error}</p>
      )}

      <IntakeQuestionsList questions={questions ?? []} />
    </div>
  );
}
