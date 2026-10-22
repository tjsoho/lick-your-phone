"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Reorder, useDragControls } from "framer-motion";
import toast from "react-hot-toast";
import {
  Edit,
  Trash2,
  Plus,
  HelpCircle,
  Eye,
  EyeOff,
  GripVertical,
} from "lucide-react";
import {
  reorderQuestions,
  deleteQuestion,
  setIntakePageTitle,
  setQuestionHidden,
} from "@/server-actions/intake-questions";
import { cn } from "@/lib/utils";

type ListedQuestion = IntakeQuestion & {
  intake_conditions?: IntakeCondition[];
};

interface IntakeQuestionsListProps {
  questions: ListedQuestion[];
  /** Page number to the name the agency has given it, where they have. */
  pageTitles?: Record<number, string>;
}

const EASE = "ease-brand";

const thClasses =
  "whitespace-nowrap px-5 py-3 text-left font-body text-[9px] font-medium uppercase tracking-[0.2em] text-[#867474]";

const addLinkClasses = `inline-flex items-center gap-2 font-body text-[12px] font-semibold tracking-wide text-lyp-cherry transition-opacity duration-500 ${EASE} hover:opacity-70`;

const rowIconClasses = `text-[#867474] transition-colors duration-500 ${EASE} hover:text-lyp-cherry`;

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

/**
 * Hand one page's questions the sequence numbers a new order implies.
 *
 * Order is read off `sequence` everywhere, on this screen and in the client's
 * form, so moving a row is a matter of rewriting numbers rather than shuffling
 * an array about.
 */
function applyOrder(
  all: ListedQuestion[],
  pageNumber: number,
  ids: string[],
): ListedQuestion[] {
  const sequences = new Map(ids.map((id, index) => [id, index + 1]));
  return all.map((q) => {
    if (q.page_number !== pageNumber) return q;
    const next = sequences.get(q.id);
    return next === undefined ? q : { ...q, sequence: next };
  });
}

interface QuestionRowProps {
  question: ListedQuestion;
  /** Where this row sits in its own page, and how long that page is. */
  index: number;
  count: number;
  busy: boolean;
  onDragBegin: () => void;
  onDragFinish: () => void;
  onMove: (to: number) => void;
  onToggleHidden: () => void;
  onDelete: () => void;
}

function QuestionRow({
  question,
  index,
  count,
  busy,
  onDragBegin,
  onDragFinish,
  onMove,
  onToggleHidden,
  onDelete,
}: QuestionRowProps) {
  // The whole row is not the drag target, or there would be no way to click
  // the buttons in it. Only the handle starts a drag, which is what the
  // controls are for.
  const dragControls = useDragControls();

  const hasConditions =
    question.intake_conditions && question.intake_conditions.length > 0;
  const alone = count === 1;

  return (
    <Reorder.Item
      as="tr"
      value={question.id}
      dragListener={false}
      dragControls={dragControls}
      // Position only. Rows are not all the same height, since one with a
      // section under its label is taller, and animating a table row's size
      // pulls its cells about.
      layout="position"
      onDragStart={() => onDragBegin()}
      onDragEnd={() => onDragFinish()}
      whileDrag={{ backgroundColor: "#F7F1F1" }}
      className={`border-b border-[#F7F1F1] transition-colors duration-500 last:border-0 ${EASE} hover:bg-[#FBF8F8]`}
    >
      <td className="px-5 py-3 text-center tabular-nums text-[#867474]">
        {question.sequence}
      </td>
      <td className="px-5 py-3">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "font-medium",
              question.hidden ? "text-[#867474]" : "text-lyp-black",
            )}
          >
            {question.field_label}
          </span>
          {/* Hidden questions are dropped before the client's form is built,
              so their conditions never get a say. Saying so here is the
              difference between "switched off" and "broken condition". */}
          {question.hidden && (
            <span className="inline-block flex-shrink-0 rounded-full bg-[#F2EDED] px-2.5 py-1 font-body text-[10px] font-medium uppercase tracking-[0.14em] text-[#6B5A5A]">
              Hidden
            </span>
          )}
        </div>
        {question.section && (
          <div className="mt-0.5 font-body text-[11px] text-[#867474]">
            Section: {question.section}
          </div>
        )}
      </td>
      <td className="whitespace-nowrap px-5 py-3 text-[#6B5A5A]">
        {getFieldTypeLabel(question.field_type)}
      </td>
      <td className="whitespace-nowrap px-5 py-3 text-center">
        {question.required ? (
          <span className="inline-block rounded-full bg-lyp-cherry/[0.07] px-2.5 py-1 font-body text-[10px] font-medium uppercase tracking-[0.14em] text-lyp-cherry">
            Yes
          </span>
        ) : (
          <span className="inline-block rounded-full bg-[#F2EDED] px-2.5 py-1 font-body text-[10px] font-medium uppercase tracking-[0.14em] text-[#6B5A5A]">
            No
          </span>
        )}
      </td>
      <td className="whitespace-nowrap px-5 py-3">
        {hasConditions ? (
          <span className="inline-block rounded-full bg-[#FBF3E3] px-2.5 py-1 font-body text-[10px] font-medium uppercase tracking-[0.14em] tabular-nums text-[#9A7B2E]">
            {question.intake_conditions?.length || 0}{" "}
            {question.intake_conditions?.length === 1
              ? "condition"
              : "conditions"}
          </span>
        ) : (
          <span className="font-body text-[12px] text-[#9C8C8C]">
            —
          </span>
        )}
      </td>
      <td className="px-5 py-3">
        <div className="flex items-center justify-center">
          {/* A handle you can only point at would strand anyone on a keyboard,
              so the same handle takes the arrow keys and moves the row a place
              at a time. */}
          <button
            type="button"
            disabled={alone || busy}
            onPointerDown={(event) => dragControls.start(event)}
            onKeyDown={(event) => {
              if (event.key === "ArrowUp") {
                event.preventDefault();
                onMove(index - 1);
              }
              if (event.key === "ArrowDown") {
                event.preventDefault();
                onMove(index + 1);
              }
            }}
            title="Drag to reorder, or use the up and down arrow keys"
            aria-label={`Reorder ${question.field_label}, ${index + 1} of ${count} on this page. Drag it, or press the up and down arrow keys.`}
            className={cn(
              `flex h-7 w-10 touch-none select-none items-center justify-center rounded-full border transition-all duration-500 ${EASE}`,
              alone || busy
                ? "cursor-not-allowed border-[#F1E8E8] bg-[#FBF8F8] text-[#BFADAD]"
                : "cursor-grab border-[#EFE6E6] bg-lyp-white text-[#6B5A5A] hover:border-lyp-cherry/25 hover:text-lyp-cherry active:cursor-grabbing",
            )}
          >
            <GripVertical strokeWidth={1.5} className="h-3.5 w-3.5" />
          </button>
        </div>
      </td>
      <td className="px-5 py-3 text-right">
        <div className="flex items-center justify-end gap-2.5">
          <button
            onClick={onToggleHidden}
            className={rowIconClasses}
            title={question.hidden ? "Show to clients" : "Hide from clients"}
            aria-label={
              question.hidden
                ? `Show ${question.field_label} to clients`
                : `Hide ${question.field_label} from clients`
            }
          >
            {question.hidden ? (
              <EyeOff strokeWidth={1.5} className="h-4 w-4" />
            ) : (
              <Eye strokeWidth={1.5} className="h-4 w-4" />
            )}
          </button>
          <Link
            href={`/admin/intake-questions/${question.id}`}
            className={rowIconClasses}
            title="Edit question"
            aria-label={`Edit ${question.field_label}`}
          >
            <Edit strokeWidth={1.5} className="h-4 w-4" />
          </Link>
          <button
            onClick={onDelete}
            className={rowIconClasses}
            title="Delete question"
            aria-label={`Delete ${question.field_label}`}
          >
            <Trash2 strokeWidth={1.5} className="h-4 w-4" />
          </button>
        </div>
      </td>
    </Reorder.Item>
  );
}

export default function IntakeQuestionsList({
  questions,
  pageTitles = {},
}: IntakeQuestionsListProps) {
  const router = useRouter();
  const [reordering, setReordering] = useState(false);
  /** The page whose heading is being typed into, and the text so far. */
  const [renaming, setRenaming] = useState<number | null>(null);
  const [draftTitle, setDraftTitle] = useState("");

  // A dragged row has to follow the pointer at once, so the list on screen is
  // a local copy. Anything fresh from the server wins: it lands after a
  // router.refresh() and is the truth the optimistic copy was standing in for.
  const [items, setItems] = useState(questions);
  const [fromServer, setFromServer] = useState(questions);
  if (questions !== fromServer) {
    setFromServer(questions);
    setItems(questions);
  }

  // Dragging reports a new order every time two rows swap under the pointer,
  // which is far too often to be writing to the database. The last order a
  // drag left behind waits here until the row is dropped.
  const pendingOrder = useRef<{ pageNumber: number; ids: string[] } | null>(
    null,
  );

  // Group questions by page number
  const pages: Record<number, ListedQuestion[]> = {};
  items.forEach((q) => {
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

  const nextPageNumber =
    sortedPageNumbers.length > 0
      ? sortedPageNumbers[sortedPageNumbers.length - 1] + 1
      : 1;

  async function saveOrder(pageNumber: number, ids: string[]) {
    setReordering(true);
    try {
      // The whole page is renumbered 1 upwards rather than two rows trading
      // sequences, because a row dropped three places up has moved every row
      // it passed. It also quietly repairs a page where two questions somehow
      // ended up sharing a sequence.
      const updates = ids.map((id, index) => ({
        id,
        sequence: index + 1,
        page_number: pageNumber,
      }));

      const { error } = await reorderQuestions(updates);
      if (error) throw new Error(error);

      toast.success("Order updated");
      router.refresh();
    } catch (err) {
      // Put the list back to the order the server last gave us, then ask it
      // again in case it has moved on without us.
      setItems(fromServer);
      router.refresh();
      toast.error((err as Error).message || "Failed to update order");
    } finally {
      setReordering(false);
    }
  }

  function dragBegin() {
    pendingOrder.current = null;
  }

  function dragReorder(pageNumber: number, ids: string[]) {
    setItems((prev) => applyOrder(prev, pageNumber, ids));
    pendingOrder.current = { pageNumber, ids };
  }

  function dragFinish() {
    const dropped = pendingOrder.current;
    pendingOrder.current = null;
    // A row picked up and put back where it started has nothing to save.
    if (!dropped) return;
    void saveOrder(dropped.pageNumber, dropped.ids);
  }

  function moveWithKeys(pageNumber: number, from: number, to: number) {
    if (reordering) return;

    const ids = pages[pageNumber].map((q) => q.id);
    if (to < 0 || to >= ids.length) return;

    const [moved] = ids.splice(from, 1);
    ids.splice(to, 0, moved);

    setItems((prev) => applyOrder(prev, pageNumber, ids));
    void saveOrder(pageNumber, ids);
  }

  async function toggleHidden(id: string, label: string, hidden: boolean) {
    const { error } = await setQuestionHidden(id, hidden);
    if (error) {
      toast.error(error || "Failed to update the question");
      return;
    }
    toast.success(hidden ? `"${label}" hidden from clients` : `"${label}" is live`);
    router.refresh();
  }

  async function saveTitle(pageNum: number) {
    const next = draftTitle.trim();
    setRenaming(null);
    if (next === (pageTitles[pageNum] ?? "")) return;

    const { error } = await setIntakePageTitle(pageNum, next);
    if (error) {
      toast.error(error || "Failed to rename the page");
      return;
    }
    toast.success(next ? "Page renamed" : "Page name removed");
    router.refresh();
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
          <p className="mx-auto mt-2 max-w-sm font-body text-[13px] text-[#6B5A5A]">
            Create your first onboarding question to guide clients through
            registration.
          </p>
          <Link
            href="/admin/intake-questions/new?page=1"
            title="Write the first onboarding question"
            className={cn(addLinkClasses, "mt-4 text-[13px]")}
          >
            <Plus strokeWidth={1.5} className="h-3.5 w-3.5" />
            Add question
          </Link>
        </div>
      ) : (
        <>
          {sortedPageNumbers.map((pNum) => {
            const pageQuestions = pages[pNum];
            return (
              <div
                key={pNum}
                className="overflow-hidden rounded-2xl border border-[#EFE6E6] bg-lyp-white"
              >
                <div className="flex items-center justify-between gap-4 border-b border-[#F1E8E8] px-5 py-4">
                  {/* The heading is the field: click it to rename the page, and
                      empty it to go back to "Page N". The client sees this name
                      at the top of that step of the form. */}
                  {renaming === pNum ? (
                    <input
                      autoFocus
                      value={draftTitle}
                      onChange={(e) => setDraftTitle(e.target.value)}
                      onBlur={() => saveTitle(pNum)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") e.currentTarget.blur();
                        if (e.key === "Escape") setRenaming(null);
                      }}
                      placeholder={`Page ${pNum}`}
                      aria-label={`Name for page ${pNum}`}
                      className={`min-w-0 flex-1 rounded-lg border border-lyp-cherry/30 bg-lyp-white px-2.5 py-1 font-heading text-[16px] font-bold tracking-[-0.02em] text-lyp-black outline-none transition-colors duration-500 ${EASE} focus:border-lyp-cherry`}
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setDraftTitle(pageTitles[pNum] ?? "");
                        setRenaming(pNum);
                      }}
                      title="Rename this page"
                      className={`group flex min-w-0 items-center gap-2 rounded-lg px-1 py-0.5 text-left transition-colors duration-500 ${EASE} hover:bg-[#F7F1F1]`}
                    >
                      <h2 className="truncate font-heading text-[16px] font-bold tracking-[-0.02em] text-lyp-black">
                        {pageTitles[pNum] || `Page ${pNum}`}
                      </h2>
                      <Edit
                        strokeWidth={1.5}
                        className="h-3.5 w-3.5 flex-shrink-0 text-[#867474] opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                      />
                      {pageTitles[pNum] && (
                        <span className="flex-shrink-0 font-body text-[11px] tabular-nums text-[#867474]">
                          Page {pNum}
                        </span>
                      )}
                    </button>
                  )}
                  <span className="rounded-full bg-[#F7F1F1] px-2.5 py-1 font-body text-[10px] font-medium uppercase tracking-[0.14em] tabular-nums text-[#6B5A5A]">
                    {pageQuestions.length}{" "}
                    {pageQuestions.length === 1 ? "Question" : "Questions"}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left font-body text-[12.5px]">
                    <thead>
                      <tr className="border-b border-[#F1E8E8]">
                        <th className={cn(thClasses, "w-16 text-center")}>
                          Seq
                        </th>
                        <th className={thClasses}>Field Label</th>
                        <th className={thClasses}>Type</th>
                        <th className={cn(thClasses, "text-center")}>
                          Required
                        </th>
                        <th className={thClasses}>Conditions</th>
                        <th className={cn(thClasses, "w-24 text-center")}>
                          Reorder
                        </th>
                        <th className={cn(thClasses, "w-28 text-right")}>
                          Actions
                        </th>
                      </tr>
                    </thead>
                    {/* Reordering is penned inside one page: the agency asked to
                        change the order of a page's questions, not to sling a
                        question onto another page, so each page's rows are
                        their own group. */}
                    <Reorder.Group
                      as="tbody"
                      axis="y"
                      values={pageQuestions.map((q) => q.id)}
                      onReorder={(ids: string[]) => dragReorder(pNum, ids)}
                    >
                      {pageQuestions.map((q, idx) => (
                        <QuestionRow
                          key={q.id}
                          question={q}
                          index={idx}
                          count={pageQuestions.length}
                          busy={reordering}
                          onDragBegin={dragBegin}
                          onDragFinish={dragFinish}
                          onMove={(to) => moveWithKeys(pNum, idx, to)}
                          onToggleHidden={() =>
                            toggleHidden(q.id, q.field_label, !q.hidden)
                          }
                          onDelete={() => handleDelete(q.id, q.field_label)}
                        />
                      ))}
                    </Reorder.Group>
                  </table>
                </div>

                {/* The agency asked for the button here rather than up in the
                    header: "an add question button at the bottom of each page
                    list". It takes its own page number with it, so the form
                    opens on page 4 when it was clicked under Page 4. */}
                <div className="border-t border-[#F1E8E8] px-5 py-3.5">
                  <Link
                    href={`/admin/intake-questions/new?page=${pNum}`}
                    title={`Add a question to ${pageTitles[pNum] || `page ${pNum}`}`}
                    className={addLinkClasses}
                  >
                    <Plus strokeWidth={1.5} className="h-3.5 w-3.5" />
                    Add question
                  </Link>
                </div>
              </div>
            );
          })}

          {/* The header button that went was also the only way to start a page
              that does not exist yet, since the per-page buttons can only add
              to a page that already has questions on it. This keeps that
              route open. */}
          <div className="rounded-2xl border border-dashed border-[#EFE6E6] px-5 py-4 text-center">
            <Link
              href={`/admin/intake-questions/new?page=${nextPageNumber}`}
              title={`Start page ${nextPageNumber} with a new question`}
              className={addLinkClasses}
            >
              <Plus strokeWidth={1.5} className="h-3.5 w-3.5" />
              Add question on a new page
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
