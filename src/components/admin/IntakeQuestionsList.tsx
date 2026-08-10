"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  ArrowUp,
  ArrowDown,
  Edit,
  Trash2,
  Plus,
  HelpCircle,
} from "lucide-react";
import {
  reorderQuestions,
  deleteQuestion,
} from "@/server-actions/intake-questions";
import { cn } from "@/lib/utils";

interface IntakeQuestionsListProps {
  questions: any[];
}

export default function IntakeQuestionsList({
  questions,
}: IntakeQuestionsListProps) {
  const router = useRouter();
  const [reordering, setReordering] = useState(false);

  // Group questions by page number
  const pages: Record<number, any[]> = {};
  questions.forEach((q) => {
    const page = q.page_number;
    if (!pages[page]) {
      pages[page] = [];
    }
    pages[page].push(q);
  });

  // Sort pages and questions inside them
  const sortedPageNumbers = Object.keys(pages)
    .map(Number)
    .sort((a, b) => a - b);

  sortedPageNumbers.forEach((pNum) => {
    pages[pNum].sort((a, b) => a.sequence - b.sequence);
  });

  async function handleMove(
    questionId: string,
    direction: "up" | "down",
    pageNum: number,
  ) {
    const list = pages[pageNum];
    const index = list.findIndex((q) => q.id === questionId);
    if (index === -1) return;

    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= list.length) return;

    setReordering(true);
    try {
      const itemA = list[index];
      const itemB = list[newIndex];

      const updates = [
        { id: itemA.id, sequence: itemB.sequence, page_number: pageNum },
        { id: itemB.id, sequence: itemA.sequence, page_number: pageNum },
      ];

      const { error } = await reorderQuestions(updates);
      if (error) throw new Error(error);

      toast.success("Order updated");
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message || "Failed to update order");
    } finally {
      setReordering(false);
    }
  }

  async function handleDelete(id: string, label: string) {
    if (!window.confirm(`Are you sure you want to delete "${label}"?`)) return;

    try {
      const { error } = await deleteQuestion(id);
      if (error) throw new Error(error);
      toast.success("Question deleted");
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message || "Failed to delete");
    }
  }

  function getFieldTypeLabel(type: string) {
    switch (type) {
      case "text":
        return "Text Input";
      case "textarea":
        return "Text Area";
      case "email":
        return "Email";
      case "phone":
        return "Phone";
      case "abn":
        return "ABN";
      case "address":
        return "Address";
      case "radio":
        return "Radio Options";
      case "checkbox":
        return "Checkbox Options";
      case "multiselect":
        return "Multiselect";
      case "file":
        return "File Upload";
      case "matrix":
        return "Matrix Grid";
      case "repeatable_group":
        return "Repeatable Group";
      case "provider_picker":
        return "Provider Picker";
      case "static_content":
        return "Static Content";
      default:
        return type;
    }
  }

  return (
    <div className="space-y-8">
      {sortedPageNumbers.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
          <HelpCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <h3 className="font-heading text-lg font-bold text-lyp-black mb-1">
            No questions yet
          </h3>
          <p className="font-body text-sm text-gray-500 mb-4">
            Create your first onboarding question to guide clients through
            registration.
          </p>
          <Link
            href="/admin/intake-questions/new"
            className="inline-flex items-center gap-2 bg-lyp-cherry text-white px-4 py-2 rounded-md font-body text-sm hover:bg-lyp-maroon transition-colors"
          >
            <Plus className="h-4 w-4" /> Add Question
          </Link>
        </div>
      ) : (
        sortedPageNumbers.map((pNum) => {
          const pageQuestions = pages[pNum];
          return (
            <div
              key={pNum}
              className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm"
            >
              <div className="bg-gray-50 border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h2 className="font-heading text-lg font-bold text-lyp-black">
                  Page {pNum}
                </h2>
                <span className="font-body text-xs bg-gray-200 text-gray-700 px-2.5 py-1 rounded-full font-semibold">
                  {pageQuestions.length}{" "}
                  {pageQuestions.length === 1 ? "Question" : "Questions"}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50/50">
                      <th className="px-6 py-3 font-heading text-xs font-semibold text-gray-500 uppercase tracking-wider w-16 text-center">
                        Seq
                      </th>
                      <th className="px-6 py-3 font-heading text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Field Label
                      </th>
                      <th className="px-6 py-3 font-heading text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 font-heading text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">
                        Required
                      </th>
                      <th className="px-6 py-3 font-heading text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Conditions
                      </th>
                      <th className="px-6 py-3 font-heading text-xs font-semibold text-gray-500 uppercase tracking-wider w-36 text-center">
                        Reorder
                      </th>
                      <th className="px-6 py-3 font-heading text-xs font-semibold text-gray-500 uppercase tracking-wider w-24 text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {pageQuestions.map((q, idx) => {
                      const hasConditions =
                        q.intake_conditions && q.intake_conditions.length > 0;
                      return (
                        <tr
                          key={q.id}
                          className="hover:bg-gray-50/50 transition-colors"
                        >
                          <td className="px-6 py-4 font-body text-sm text-gray-500 text-center font-mono">
                            {q.sequence}
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-body text-sm font-semibold text-lyp-black">
                              {q.field_label}
                            </div>
                            {q.section && (
                              <div className="font-body text-xs text-gray-400 mt-0.5">
                                Section: {q.section}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 font-body text-sm text-gray-600">
                            {getFieldTypeLabel(q.field_type)}
                          </td>
                          <td className="px-6 py-4 text-center">
                            {q.required ? (
                              <span className="font-body text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded font-semibold">
                                Yes
                              </span>
                            ) : (
                              <span className="font-body text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">
                                No
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            {hasConditions ? (
                              <span className="font-body text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-full font-semibold">
                                {q.intake_conditions.length}{" "}
                                {q.intake_conditions.length === 1
                                  ? "condition"
                                  : "conditions"}
                              </span>
                            ) : (
                              <span className="font-body text-xs text-gray-400">
                                —
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => handleMove(q.id, "up", pNum)}
                                disabled={idx === 0 || reordering}
                                className={cn(
                                  "p-1.5 rounded border transition-colors",
                                  idx === 0
                                    ? "border-gray-100 text-gray-300 cursor-not-allowed bg-gray-50/50"
                                    : "border-gray-200 text-gray-600 hover:text-lyp-cherry hover:border-lyp-cherry/30 bg-white",
                                )}
                                title="Move up"
                              >
                                <ArrowUp className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleMove(q.id, "down", pNum)}
                                disabled={
                                  idx === pageQuestions.length - 1 || reordering
                                }
                                className={cn(
                                  "p-1.5 rounded border transition-colors",
                                  idx === pageQuestions.length - 1
                                    ? "border-gray-100 text-gray-300 cursor-not-allowed bg-gray-50/50"
                                    : "border-gray-200 text-gray-600 hover:text-lyp-cherry hover:border-lyp-cherry/30 bg-white",
                                )}
                                title="Move down"
                              >
                                <ArrowDown className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Link
                                href={`/admin/intake-questions/${q.id}`}
                                className="p-1.5 text-gray-500 hover:text-lyp-cherry transition-colors"
                                title="Edit question"
                              >
                                <Edit className="h-4 w-4" />
                              </Link>
                              <button
                                onClick={() =>
                                  handleDelete(q.id, q.field_label)
                                }
                                className="p-1.5 text-gray-500 hover:text-red-600 transition-colors"
                                title="Delete question"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
