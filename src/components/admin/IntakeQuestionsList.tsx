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
  questions: (IntakeQuestion & {
    intake_conditions?: IntakeCondition[];
  })[];
}

const EASE = "ease-brand";

const thClasses =
  "whitespace-nowrap px-5 py-3 text-left font-body text-[9px] font-medium uppercase tracking-[0.2em] text-[#A89898]";

export default function IntakeQuestionsList({
  questions,
}: IntakeQuestionsListProps) {
  const router = useRouter();
  const [reordering, setReordering] = useState(false);

  // Group questions by page number
  const pages: Record<
    number,
    (IntakeQuestion & {
      intake_conditions?: IntakeCondition[];
    })[]
  > = {};
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
    <div className="space-y-6">
      {sortedPageNumbers.length === 0 ? (
        <div className="rounded-2xl border border-[#EFE6E6] bg-lyp-white px-8 py-14 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-lyp-cherry/[0.05] ring-1 ring-lyp-cherry/10">
            <HelpCircle strokeWidth={1} className="h-6 w-6 text-lyp-cherry/60" />
          </span>
          <h3 className="mt-5 font-heading text-[16px] font-bold tracking-[-0.02em] text-lyp-black">
            No questions yet
          </h3>
          <p className="mx-auto mt-2 max-w-sm font-body text-[13px] text-[#8A7A7A]">
            Create your first onboarding question to guide clients through
            registration.
          </p>
          <Link
            href="/admin/intake-questions/new"
            className={`mt-4 inline-flex items-center gap-2 font-body text-[13px] font-semibold text-lyp-cherry transition-opacity duration-500 ${EASE} hover:opacity-70`}
          >
            Add Question
            <Plus strokeWidth={1.5} className="h-3.5 w-3.5" />
          </Link>
        </div>
      ) : (
        sortedPageNumbers.map((pNum) => {
          const pageQuestions = pages[pNum];
          return (
            <div
              key={pNum}
              className="overflow-hidden rounded-2xl border border-[#EFE6E6] bg-lyp-white"
            >
              <div className="flex items-center justify-between gap-4 border-b border-[#F1E8E8] px-5 py-4">
                <h2 className="font-heading text-[16px] font-bold tracking-[-0.02em] text-lyp-black">
                  Page {pNum}
                </h2>
                <span className="rounded-full bg-[#F7F1F1] px-2.5 py-1 font-body text-[10px] font-medium uppercase tracking-[0.14em] tabular-nums text-[#8A7A7A]">
                  {pageQuestions.length}{" "}
                  {pageQuestions.length === 1 ? "Question" : "Questions"}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left font-body text-[12.5px]">
                  <thead>
                    <tr className="border-b border-[#F1E8E8]">
                      <th className={cn(thClasses, "w-16 text-center")}>Seq</th>
                      <th className={thClasses}>Field Label</th>
                      <th className={thClasses}>Type</th>
                      <th className={cn(thClasses, "text-center")}>Required</th>
                      <th className={thClasses}>Conditions</th>
                      <th className={cn(thClasses, "w-36 text-center")}>
                        Reorder
                      </th>
                      <th className={cn(thClasses, "w-24 text-right")}>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageQuestions.map((q, idx) => {
                      const hasConditions =
                        q.intake_conditions && q.intake_conditions.length > 0;
                      return (
                        <tr
                          key={q.id}
                          className={`border-b border-[#F7F1F1] transition-colors duration-500 last:border-0 ${EASE} hover:bg-[#FBF8F8]`}
                        >
                          <td className="px-5 py-3 text-center tabular-nums text-[#A89898]">
                            {q.sequence}
                          </td>
                          <td className="px-5 py-3">
                            <div className="font-medium text-lyp-black">
                              {q.field_label}
                            </div>
                            {q.section && (
                              <div className="mt-0.5 font-body text-[11px] text-[#A89898]">
                                Section: {q.section}
                              </div>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-5 py-3 text-[#8A7A7A]">
                            {getFieldTypeLabel(q.field_type)}
                          </td>
                          <td className="whitespace-nowrap px-5 py-3 text-center">
                            {q.required ? (
                              <span className="inline-block rounded-full bg-lyp-cherry/[0.07] px-2.5 py-1 font-body text-[10px] font-medium uppercase tracking-[0.14em] text-lyp-cherry">
                                Yes
                              </span>
                            ) : (
                              <span className="inline-block rounded-full bg-[#F2EDED] px-2.5 py-1 font-body text-[10px] font-medium uppercase tracking-[0.14em] text-[#8A7A7A]">
                                No
                              </span>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-5 py-3">
                            {hasConditions ? (
                              <span className="inline-block rounded-full bg-[#FBF3E3] px-2.5 py-1 font-body text-[10px] font-medium uppercase tracking-[0.14em] tabular-nums text-[#9A7B2E]">
                                {q.intake_conditions?.length || 0}{" "}
                                {q.intake_conditions?.length === 1
                                  ? "condition"
                                  : "conditions"}
                              </span>
                            ) : (
                              <span className="font-body text-[12px] text-[#C3B5B5]">
                                —
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleMove(q.id, "up", pNum)}
                                disabled={idx === 0 || reordering}
                                className={cn(
                                  `flex h-7 w-7 items-center justify-center rounded-full border transition-all duration-500 ${EASE}`,
                                  idx === 0
                                    ? "cursor-not-allowed border-[#F1E8E8] bg-[#FBF8F8] text-[#D8CACA]"
                                    : "border-[#EFE6E6] bg-lyp-white text-[#8A7A7A] hover:border-lyp-cherry/25 hover:text-lyp-cherry",
                                )}
                                title="Move up"
                                aria-label={`Move ${q.field_label} up`}
                              >
                                <ArrowUp
                                  strokeWidth={1.5}
                                  className="h-3.5 w-3.5"
                                />
                              </button>
                              <button
                                onClick={() => handleMove(q.id, "down", pNum)}
                                disabled={
                                  idx === pageQuestions.length - 1 || reordering
                                }
                                className={cn(
                                  `flex h-7 w-7 items-center justify-center rounded-full border transition-all duration-500 ${EASE}`,
                                  idx === pageQuestions.length - 1
                                    ? "cursor-not-allowed border-[#F1E8E8] bg-[#FBF8F8] text-[#D8CACA]"
                                    : "border-[#EFE6E6] bg-lyp-white text-[#8A7A7A] hover:border-lyp-cherry/25 hover:text-lyp-cherry",
                                )}
                                title="Move down"
                                aria-label={`Move ${q.field_label} down`}
                              >
                                <ArrowDown
                                  strokeWidth={1.5}
                                  className="h-3.5 w-3.5"
                                />
                              </button>
                            </div>
                          </td>
                          <td className="px-5 py-3 text-right">
                            <div className="flex items-center justify-end gap-2.5">
                              <Link
                                href={`/admin/intake-questions/${q.id}`}
                                className={`text-[#A89898] transition-colors duration-500 ${EASE} hover:text-lyp-cherry`}
                                title="Edit question"
                                aria-label={`Edit ${q.field_label}`}
                              >
                                <Edit strokeWidth={1.5} className="h-4 w-4" />
                              </Link>
                              <button
                                onClick={() =>
                                  handleDelete(q.id, q.field_label)
                                }
                                className={`text-[#A89898] transition-colors duration-500 ${EASE} hover:text-lyp-cherry`}
                                title="Delete question"
                                aria-label={`Delete ${q.field_label}`}
                              >
                                <Trash2 strokeWidth={1.5} className="h-4 w-4" />
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
