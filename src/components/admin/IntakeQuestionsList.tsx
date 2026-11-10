"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import toast from "react-hot-toast";
import {
  Edit,
  Trash2,
  Plus,
  HelpCircle,
  Eye,
  EyeOff,
  GripVertical,
  FilePlus,
} from "lucide-react";
import {
  createIntakePage,
  deleteIntakePage,
  deleteQuestion,
  reorderIntakePages,
  reorderQuestions,
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

/**
 * One set of columns, shared by the header and every row on every page.
 *
 * The page body was a single table until the agency asked to reorder sections
 * whole, rows inside them, and questions from one page to another. None of
 * that can be done in table markup: a `<tbody>` cannot contain another
 * `<tbody>`, and nothing may sit between a `<table>` and its `<tbody>`. So the
 * table is gone and each row is its own grid.
 *
 * They still line up because they all read this one template and all share a
 * width. Only the label track flexes, so it resolves to the same number of
 * pixels in every row, which is what a table's columns were doing for us.
 *
 * The grip leads, so the row grips, the section grips and the page grips all
 * stand in one line down the left.
 */
const GRID_COLUMNS =
  "grid grid-cols-[4.25rem_4rem_minmax(0,1fr)_10.5rem_7rem_8.5rem_7rem] items-center";

const thClasses =
  "whitespace-nowrap px-5 py-3 text-left font-body text-[9px] font-medium uppercase tracking-[0.2em] text-[#867474]";

const addLinkClasses = `inline-flex items-center gap-2 font-body text-[12px] font-semibold tracking-wide text-lyp-cherry transition-opacity duration-500 ${EASE} hover:opacity-70`;

const rowIconClasses = `text-[#867474] transition-colors duration-500 ${EASE} hover:text-lyp-cherry`;

const gripClasses = (disabled: boolean) =>
  cn(
    `flex h-7 w-7 flex-shrink-0 touch-none select-none items-center justify-center rounded-lg transition-colors duration-500 ${EASE} focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lyp-cherry/40`,
    disabled
      ? "cursor-not-allowed text-[#D4C6C6]"
      : "cursor-grab text-[#9C8C8C] hover:bg-[#F1E8E8] hover:text-[#6B5A5A] active:cursor-grabbing",
  );

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

/* ------------------------------------------------------------------ *
 * Identity
 *
 * Three kinds of thing can be picked up on this screen, and one drag
 * context holds all of them, so each kind carries its own prefix. The
 * prefix is how a drop is read: what was lifted, and what it is over.
 * ------------------------------------------------------------------ */

const pageId = (page: number) => `page:${page}`;
const sectionId = (page: number, key: string) => `sect:${page}:${key}`;
/** The empty space inside a page that has nothing on it at all. */
const pageBinId = (page: number) => `pagebin:${page}`;

type DragKind = "page" | "section" | "row";

function kindOf(id: string): DragKind {
  if (id.startsWith("page:")) return "page";
  if (id.startsWith("sect:")) return "section";
  return "row";
}

/**
 * The key a question's section is known by.
 *
 * Prefixed rather than used raw so the questions nobody put in a section can
 * have a key of their own that no typed section name could ever collide with.
 */
function sectionKey(section: string | null | undefined) {
  const name = section?.trim();
  return name ? `named:${name}` : "unsectioned";
}

/** One run of questions that share a section name, on one page. */
interface SectionBlock {
  key: string;
  /** The name as the agency typed it, or null where nobody gave one. */
  name: string | null;
  questions: ListedQuestion[];
}

/**
 * Split one page's questions into blocks, one per section NAME.
 *
 * Grouping by name rather than by a run of neighbours matters, because a
 * question can be dragged out of its run: page 3 read "About Your Restaurant",
 * "Brand Guidelines", then "About Your Restaurant" again. Going by name pulls
 * that stray row back in with its own kind, and the first time anything on the
 * page is reordered the merge is written down for good.
 *
 * `pageRows` arrives in display order, so a Map keeps the blocks in the order
 * they were first met. That is the order we want, so there is nothing to sort.
 */
function groupIntoSections(pageRows: ListedQuestion[]): SectionBlock[] {
  const blocks = new Map<string, SectionBlock>();

  for (const question of pageRows) {
    const key = sectionKey(question.section);
    const existing = blocks.get(key);
    if (existing) {
      existing.questions.push(question);
    } else {
      blocks.set(key, {
        key,
        name: question.section?.trim() || null,
        questions: [question],
      });
    }
  }

  return [...blocks.values()];
}

/**
 * Display order, which is the only order this screen keeps.
 *
 * `sequence` used to be shuffled about on every move. It is now worked out
 * once, at the point of saving, from where the rows actually sit. One list in
 * one order is far harder to get wrong than a set of numbers that have to
 * agree with it.
 */
function sortRows(list: ListedQuestion[]): ListedQuestion[] {
  return [...list].sort(
    (a, b) => a.page_number - b.page_number || a.sequence - b.sequence,
  );
}

/* ------------------------------------------------------------------ *
 * The pieces that can be picked up
 * ------------------------------------------------------------------ */

function SortableRow({
  question,
  busy,
  onToggleHidden,
  onDelete,
}: {
  question: ListedQuestion;
  busy: boolean;
  onToggleHidden: () => void;
  onDelete: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    setActivatorNodeRef,
  } = useSortable({ id: question.id, data: { kind: "row" } });

  const hasConditions =
    question.intake_conditions && question.intake_conditions.length > 0;

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        GRID_COLUMNS,
        `relative border-b border-[#F7F1F1] bg-lyp-white transition-colors duration-500 last:border-0 ${EASE} hover:bg-[#FBF8F8]`,
        // The row stays in the list as a gap while a copy of it follows the
        // pointer, so the space it will drop back into is always visible.
        isDragging && "opacity-0",
      )}
    >
      <div className="flex items-center justify-center py-3">
        {/* Only the grip starts a drag, or the buttons on this row would
            stop taking a click. It takes the keyboard too: space to lift,
            arrows to move, space again to drop. */}
        <button
          type="button"
          disabled={busy}
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          title="Drag to reorder, or to move this question to another page"
          aria-label={`Reorder ${question.field_label}`}
          className={gripClasses(busy)}
        >
          <GripVertical strokeWidth={1.5} className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="px-5 py-3 text-center tabular-nums text-[#867474]">
        {question.sequence}
      </div>
      <div className="min-w-0 px-5 py-3">
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
      </div>
      <div className="truncate px-5 py-3 text-[#6B5A5A]">
        {getFieldTypeLabel(question.field_type)}
      </div>
      <div className="whitespace-nowrap px-5 py-3 text-center">
        {question.required ? (
          <span className="inline-block rounded-full bg-lyp-cherry/[0.07] px-2.5 py-1 font-body text-[10px] font-medium uppercase tracking-[0.14em] text-lyp-cherry">
            Yes
          </span>
        ) : (
          <span className="inline-block rounded-full bg-[#F2EDED] px-2.5 py-1 font-body text-[10px] font-medium uppercase tracking-[0.14em] text-[#6B5A5A]">
            No
          </span>
        )}
      </div>
      <div className="whitespace-nowrap px-5 py-3">
        {hasConditions ? (
          <span className="inline-block rounded-full bg-[#FBF3E3] px-2.5 py-1 font-body text-[10px] font-medium uppercase tracking-[0.14em] tabular-nums text-[#9A7B2E]">
            {question.intake_conditions?.length || 0}{" "}
            {question.intake_conditions?.length === 1
              ? "condition"
              : "conditions"}
          </span>
        ) : (
          <span className="font-body text-[12px] text-[#9C8C8C]">None</span>
        )}
      </div>
      <div className="px-5 py-3 text-right">
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
      </div>
    </div>
  );
}

/**
 * One section, as a thing that can be picked up whole.
 *
 * A section is not a container in the database, only a name on each question,
 * so a block exists for as long as its questions share that name. Picking it
 * up carries all of them. Dropping a question into it renames that question to
 * match, which is how a question changes section.
 */
function SortableSection({
  page,
  block,
  busy,
  children,
}: {
  page: number;
  block: SectionBlock;
  busy: boolean;
  children: React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    setActivatorNodeRef,
  } = useSortable({
    id: sectionId(page, block.key),
    data: { kind: "section", page },
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn("relative bg-lyp-white", isDragging && "opacity-40")}
    >
      <div className="flex items-center gap-2 border-b border-t border-[#F1E8E8] bg-[#FBF8F8] px-5 py-2 first:border-t-0">
        <button
          type="button"
          disabled={busy}
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          title="Drag to move this whole section"
          aria-label={`Move the ${block.name ?? "unsectioned"} section`}
          className={cn(gripClasses(busy), "h-6 w-6 rounded-md")}
        >
          <GripVertical strokeWidth={1.5} className="h-3.5 w-3.5" />
        </button>
        {/* A section with a name gets that name as its heading. The questions
            nobody put in a section have no name to show, so they get a quiet
            label instead of an invented one: the grip has to live somewhere,
            and a block you cannot pick up would be worse. */}
        {block.name ? (
          <h3 className="truncate font-body text-[9px] font-medium uppercase tracking-[0.2em] text-[#6B5A5A]">
            {block.name}
          </h3>
        ) : (
          <span className="truncate font-body text-[9px] font-medium uppercase tracking-[0.2em] text-[#B5A4A4]">
            No section
          </span>
        )}
      </div>
      <div>
        <SortableContext
          items={block.questions.map((q) => q.id)}
          strategy={verticalListSortingStrategy}
        >
          {children}
        </SortableContext>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * The screen
 * ------------------------------------------------------------------ */

export default function IntakeQuestionsList({
  questions,
  pageTitles = {},
}: IntakeQuestionsListProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [renaming, setRenaming] = useState<number | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);

  // A dragged row has to follow the pointer at once, so the list on screen is
  // a local copy held in display order. Anything fresh from the server wins:
  // it lands after a router.refresh() and is the truth this copy stood in for.
  const [rows, setRows] = useState(() => sortRows(questions));
  const [fromServer, setFromServer] = useState(questions);
  if (questions !== fromServer) {
    setFromServer(questions);
    setRows(sortRows(questions));
  }

  /** The order pages are shown in while one is being carried. */
  const [pageOrder, setPageOrder] = useState<number[] | null>(null);

  const sensors = useSensors(
    // A few pixels of travel before a drag starts, so a click on the grip is
    // still a click and the keyboard can still focus it.
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // Every page that exists: the ones with questions on them, and the empty
  // ones, which exist only as a named row of their own.
  const pageNumbers = useMemo(() => {
    const seen = new Set<number>(rows.map((r) => r.page_number));
    for (const key of Object.keys(pageTitles)) seen.add(Number(key));
    return [...seen].sort((a, b) => a - b);
  }, [rows, pageTitles]);

  const shownPages = useMemo(() => {
    if (!pageOrder) return pageNumbers;
    return [
      ...pageOrder.filter((p) => pageNumbers.includes(p)),
      ...pageNumbers.filter((p) => !pageOrder.includes(p)),
    ];
  }, [pageOrder, pageNumbers]);

  const rowsByPage = useMemo(() => {
    const map = new Map<number, ListedQuestion[]>();
    for (const page of pageNumbers) map.set(page, []);
    for (const row of rows) {
      const list = map.get(row.page_number);
      if (list) list.push(row);
      else map.set(row.page_number, [row]);
    }
    return map;
  }, [rows, pageNumbers]);

  const activeRow = activeId ? rows.find((r) => r.id === activeId) : undefined;

  /* ---------------- saving ---------------- */

  /**
   * Write the pages that changed, renumbered 1 upwards from where rows sit.
   *
   * The whole page is renumbered rather than two rows trading places, because
   * a row dropped three places up has moved every row it passed. It also
   * quietly repairs a page where two questions somehow share a sequence.
   */
  const saveRows = useCallback(
    async (next: ListedQuestion[], pages: number[]) => {
      const updates = pages.flatMap((page) =>
        next
          .filter((r) => r.page_number === page)
          .map((r, index) => ({
            id: r.id,
            sequence: index + 1,
            page_number: page,
            section: r.section?.trim() || null,
          })),
      );
      if (updates.length === 0) return;

      setBusy(true);
      try {
        const { error } = await reorderQuestions(updates);
        if (error) throw new Error(error);

        // NO REFRESH ON THE WAY OUT, WHICH IS THE DOUBLE FLASH.
        //
        // The rows are already where they were dropped and the server now
        // holds exactly that, so asking for it back only returns the same
        // order in freshly built objects. New identities read as a change to
        // the layout, which played the move a second time a beat later. The
        // baseline moves instead, so a later refresh lands silently.
        const sequences = new Map(
          updates.map((u) => [u.id, { seq: u.sequence, page: u.page_number }]),
        );
        const settle = (list: ListedQuestion[]) =>
          list.map((r) => {
            const at = sequences.get(r.id);
            return at
              ? { ...r, sequence: at.seq, page_number: at.page, section: r.section }
              : r;
          });
        setRows((prev) => settle(prev));
        setFromServer((prev) => settle(prev));
        toast.success("Order updated");
      } catch (err) {
        setRows(sortRows(fromServer));
        router.refresh();
        toast.error((err as Error).message || "Failed to update order");
      } finally {
        setBusy(false);
      }
    },
    [fromServer, router],
  );

  const savePageOrder = useCallback(
    async (order: number[]) => {
      setBusy(true);
      const { error } = await reorderIntakePages(order);
      setBusy(false);

      if (error) {
        setPageOrder(null);
        router.refresh();
        toast.error(error || "Failed to reorder the pages");
        return;
      }

      // The server renumbers the pages 1 upwards, so the same renumbering is
      // applied here rather than waiting for a refresh to bring it back. The
      // cards are keyed by page number, so letting that number change a second
      // time would remount every one of them and replay the whole list.
      const renumbered = new Map(order.map((page, index) => [page, index + 1]));
      const settle = (list: ListedQuestion[]) =>
        list.map((r) =>
          renumbered.has(r.page_number)
            ? { ...r, page_number: renumbered.get(r.page_number)! }
            : r,
        );
      setRows((prev) => sortRows(settle(prev)));
      setFromServer((prev) => settle(prev));
      setPageOrder(null);
      router.refresh();
      toast.success("Page order updated");
    },
    [router],
  );

  /* ---------------- dragging ---------------- */

  /**
   * Only offer a drop target that makes sense for what is in the air.
   *
   * One context holds pages, sections and rows, so without this a page being
   * carried would happily snap to a question inside it. A section stays on its
   * own page, because moving a heading between pages is not something anyone
   * asked for and the questions under it would have to follow.
   */
  const collisionDetection = useCallback<CollisionDetection>((args) => {
    const kind = kindOf(String(args.active.id));
    const activePage = args.active.data.current?.page as number | undefined;

    const candidates = args.droppableContainers.filter((container) => {
      const id = String(container.id);
      if (kind === "page") return id.startsWith("page:");
      if (kind === "section") {
        return id.startsWith("sect:") && container.data.current?.page === activePage;
      }
      // A row can land on another row, in an emptied section, or on a page
      // that has nothing on it at all.
      return (
        !id.startsWith("page:") &&
        !id.startsWith("sect:")
      );
    });

    return closestCenter({ ...args, droppableContainers: candidates });
  }, []);

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  /**
   * A question carried into a different section, or onto a different page.
   *
   * The move is made here rather than on drop so the rest of the list opens up
   * under the pointer and the client can see where it is going to land. The
   * question takes the section of whatever it is being dropped among, which is
   * how a question changes section and how it keeps a sensible one when it
   * crosses to another page.
   */
  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;
    if (kindOf(String(active.id)) !== "row") return;

    const activeKey = String(active.id);
    const overKey = String(over.id);
    if (activeKey === overKey) return;

    setRows((prev) => {
      const from = prev.findIndex((r) => r.id === activeKey);
      if (from === -1) return prev;

      let targetPage: number;
      let targetSection: string | null;
      let to: number;

      if (overKey.startsWith("bin:") || overKey.startsWith("pagebin:")) {
        const data = over.data.current as
          | { page: number; sectionName?: string | null }
          | undefined;
        if (!data) return prev;
        targetPage = data.page;
        targetSection = data.sectionName ?? null;
        // The end of that page, which is where an empty run sits.
        const lastOnPage = prev.reduce(
          (last, r, i) => (r.page_number === targetPage ? i : last),
          -1,
        );
        to = lastOnPage === -1 ? prev.length : lastOnPage + 1;
      } else {
        const overIndex = prev.findIndex((r) => r.id === overKey);
        if (overIndex === -1) return prev;
        targetPage = prev[overIndex].page_number;
        targetSection = prev[overIndex].section ?? null;
        to = overIndex;
      }

      const moving = prev[from];
      const unchanged =
        moving.page_number === targetPage &&
        (moving.section ?? null) === targetSection &&
        from === to;
      if (unchanged) return prev;

      const next = [...prev];
      next.splice(from, 1);
      next.splice(to > from ? to - 1 : to, 0, {
        ...moving,
        page_number: targetPage,
        section: targetSection,
      });
      return next;
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    const activeKey = String(active.id);
    setActiveId(null);
    if (!over) return;

    const kind = kindOf(activeKey);

    if (kind === "page") {
      const from = shownPages.indexOf(Number(activeKey.slice("page:".length)));
      const to = shownPages.indexOf(Number(String(over.id).slice("page:".length)));
      if (from === -1 || to === -1 || from === to) return;

      const order = [...shownPages];
      const [moved] = order.splice(from, 1);
      order.splice(to, 0, moved);
      setPageOrder(order);
      void savePageOrder(order);
      return;
    }

    if (kind === "section") {
      const page = active.data.current?.page as number | undefined;
      if (page === undefined) return;
      const blocks = groupIntoSections(rowsByPage.get(page) ?? []);
      const keys = blocks.map((b) => sectionId(page, b.key));
      const from = keys.indexOf(activeKey);
      const to = keys.indexOf(String(over.id));
      if (from === -1 || to === -1 || from === to) return;

      const order = [...blocks];
      const [moved] = order.splice(from, 1);
      order.splice(to, 0, moved);

      // Everything on the page, with the blocks in their new order and each
      // block's rows untouched inside it.
      const reordered = order.flatMap((b) => b.questions);
      const next = [
        ...rows.filter((r) => r.page_number !== page),
        ...reordered,
      ];
      const settled = sortByPagesThen(next, shownPages);
      setRows(settled);
      void saveRows(settled, [page]);
      return;
    }

    // A row. handleDragOver has already put it where it is going, so all that
    // is left is to write down both the page it left and the page it is on.
    const landed = rows.find((r) => r.id === activeKey);
    const started = fromServer.find((r) => r.id === activeKey);
    if (!landed) return;

    const touched = new Set<number>([landed.page_number]);
    if (started && started.page_number !== landed.page_number) {
      touched.add(started.page_number);
    }
    void saveRows(rows, [...touched]);
  }

  function handleDragCancel() {
    setActiveId(null);
    setRows(sortRows(fromServer));
  }

  /* ---------------- everything else ---------------- */

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

  async function addPage() {
    setBusy(true);
    const { data, error } = await createIntakePage();
    setBusy(false);
    if (error || data === null) {
      toast.error(error || "Failed to add the page");
      return;
    }
    toast.success(`Page ${data} added`);
    router.refresh();
  }

  async function removePage(pageNumber: number) {
    if (!window.confirm(`Delete page ${pageNumber}? It has no questions on it.`)) {
      return;
    }
    setBusy(true);
    const { error } = await deleteIntakePage(pageNumber);
    setBusy(false);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success("Page deleted");
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

  if (pageNumbers.length === 0) {
    return (
      <div className="space-y-6">
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
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="space-y-6">
        <p className="font-body text-[12px] text-[#867474]">
          Drag a question by its grip to reorder it, or drop it on another page
          to move it there. Drag a section heading to move the whole section.
          Drag a page by the grip beside its name.
        </p>

        <SortableContext
          items={shownPages.map(pageId)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-6">
            {shownPages.map((pNum, pageIndex) => (
              <PageCard
                key={pNum}
                page={pNum}
                position={pageIndex + 1}
                total={shownPages.length}
                title={pageTitles[pNum] ?? ""}
                rows={rowsByPage.get(pNum) ?? []}
                busy={busy}
                renaming={renaming === pNum}
                draftTitle={draftTitle}
                onDraftTitle={setDraftTitle}
                onStartRename={() => {
                  setDraftTitle(pageTitles[pNum] ?? "");
                  setRenaming(pNum);
                }}
                onCancelRename={() => setRenaming(null)}
                onSaveTitle={() => saveTitle(pNum)}
                onDeletePage={() => removePage(pNum)}
                onToggleHidden={toggleHidden}
                onDeleteQuestion={handleDelete}
              />
            ))}
          </div>
        </SortableContext>

        {/* Add page, and the whole form beside it. The preview is up in the
            header as well, but the foot of the list is where someone ends up
            after writing a question, and it is the question they just wrote
            that they want to go and look at. */}
        <div className="flex flex-wrap items-center justify-center gap-5 rounded-2xl border border-dashed border-[#EFE6E6] px-5 py-4 text-center">
          <button
            type="button"
            onClick={addPage}
            disabled={busy}
            title="Start a new, empty page at the end of the form"
            className={cn(addLinkClasses, "disabled:opacity-40")}
          >
            <FilePlus strokeWidth={1.5} className="h-3.5 w-3.5" />
            Add page
          </button>

          <span aria-hidden className="h-4 w-px bg-[#EFE6E6]" />

          <Link
            href="/admin/intake-questions/preview"
            target="_blank"
            title="Click through the whole form the way a client sees it"
            className={addLinkClasses}
          >
            <Eye strokeWidth={1.5} className="h-3.5 w-3.5" />
            Preview form
          </Link>
        </div>
      </div>

      {/* What follows the pointer. The row itself stays put as a gap, so the
          space it is going to drop into stays visible the whole way. */}
      <DragOverlay>
        {activeRow ? (
          <div className="rounded-lg border border-lyp-cherry/25 bg-lyp-white px-4 py-2.5 shadow-[0_18px_40px_-20px_rgba(61,11,17,0.45)]">
            <span className="font-body text-[12.5px] font-medium text-lyp-black">
              {activeRow.field_label}
            </span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

/**
 * Put a rebuilt list back into page order without disturbing rows inside a page.
 *
 * Splicing a whole section out and back in leaves the array grouped correctly
 * but with the pages out of order, and `sortRows` cannot be used because the
 * sequences have not been rewritten yet.
 */
function sortByPagesThen(
  list: ListedQuestion[],
  pages: number[],
): ListedQuestion[] {
  const rank = new Map(pages.map((p, i) => [p, i]));
  const out: ListedQuestion[] = [];
  const seen = [...new Set(list.map((r) => r.page_number))].sort(
    (a, b) => (rank.get(a) ?? a) - (rank.get(b) ?? b),
  );
  for (const page of seen) {
    out.push(...list.filter((r) => r.page_number === page));
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * One page
 * ------------------------------------------------------------------ */

function PageCard({
  page,
  position,
  total,
  title,
  rows,
  busy,
  renaming,
  draftTitle,
  onDraftTitle,
  onStartRename,
  onCancelRename,
  onSaveTitle,
  onDeletePage,
  onToggleHidden,
  onDeleteQuestion,
}: {
  page: number;
  position: number;
  total: number;
  title: string;
  rows: ListedQuestion[];
  busy: boolean;
  renaming: boolean;
  draftTitle: string;
  onDraftTitle: (value: string) => void;
  onStartRename: () => void;
  onCancelRename: () => void;
  onSaveTitle: () => void;
  onDeletePage: () => void;
  onToggleHidden: (id: string, label: string, hidden: boolean) => void;
  onDeleteQuestion: (id: string, label: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    setActivatorNodeRef,
  } = useSortable({ id: pageId(page), data: { kind: "page", page } });

  // An entirely empty page still has to be able to receive a question.
  const { setNodeRef: setBinRef } = useDroppable({
    id: pageBinId(page),
    data: { kind: "bin", page, sectionName: null },
  });

  const blocks = groupIntoSections(rows);

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        "overflow-hidden rounded-2xl border border-[#EFE6E6] bg-lyp-white",
        isDragging && "opacity-40",
      )}
    >
      <div className="flex items-center justify-between gap-4 border-b border-[#F1E8E8] px-5 py-4">
        <button
          type="button"
          disabled={busy || total < 2}
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          title="Drag to move this page"
          aria-label={`Move ${title || `page ${position}`}, page ${position} of ${total}`}
          className={gripClasses(busy || total < 2)}
        >
          <GripVertical strokeWidth={1.5} className="h-4 w-4" />
        </button>
        {/* The heading is the field: click it to rename the page, and empty it
            to go back to "Page N". The client sees this name at the top of
            that step of the form. */}
        {renaming ? (
          <input
            autoFocus
            value={draftTitle}
            onChange={(e) => onDraftTitle(e.target.value)}
            onBlur={onSaveTitle}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
              if (e.key === "Escape") onCancelRename();
            }}
            placeholder={`Page ${position}`}
            aria-label={`Name for page ${position}`}
            className={`min-w-0 flex-1 rounded-lg border border-lyp-cherry/30 bg-lyp-white px-2.5 py-1 font-heading text-[16px] font-bold tracking-[-0.02em] text-lyp-black outline-none transition-colors duration-500 ${EASE} focus:border-lyp-cherry`}
          />
        ) : (
          <button
            type="button"
            onClick={onStartRename}
            title="Rename this page"
            className={`group flex min-w-0 flex-1 items-center gap-2 rounded-lg px-1 py-0.5 text-left transition-colors duration-500 ${EASE} hover:bg-[#F7F1F1]`}
          >
            <h2 className="truncate font-heading text-[16px] font-bold tracking-[-0.02em] text-lyp-black">
              {title || `Page ${position}`}
            </h2>
            <Edit
              strokeWidth={1.5}
              className="h-3.5 w-3.5 flex-shrink-0 text-[#867474] opacity-0 transition-opacity duration-500 group-hover:opacity-100"
            />
            {title && (
              <span className="flex-shrink-0 font-body text-[11px] tabular-nums text-[#867474]">
                Page {position}
              </span>
            )}
          </button>
        )}
        <span className="rounded-full bg-[#F7F1F1] px-2.5 py-1 font-body text-[10px] font-medium uppercase tracking-[0.14em] tabular-nums text-[#6B5A5A]">
          {rows.length} {rows.length === 1 ? "Question" : "Questions"}
        </span>
        {/* Only an empty page offers this. A page with questions on it would
            take them with it, which is not something a stray click should be
            able to do. */}
        {rows.length === 0 && (
          <button
            type="button"
            onClick={onDeletePage}
            disabled={busy}
            className={rowIconClasses}
            title="Delete this empty page"
            aria-label={`Delete empty page ${position}`}
          >
            <Trash2 strokeWidth={1.5} className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        {/* The six fixed columns come to 41.25rem, so this leaves the label
            column room to breathe before the card is allowed to scroll
            sideways, as the table used to. */}
        <div className="min-w-[55rem] text-left font-body text-[12.5px]">
          <div className={cn(GRID_COLUMNS, "border-b border-[#F1E8E8]")}>
            <div className={thClasses} aria-hidden />
            <div className={cn(thClasses, "text-center")}>Seq</div>
            <div className={thClasses}>Field Label</div>
            <div className={thClasses}>Type</div>
            <div className={cn(thClasses, "text-center")}>Required</div>
            <div className={thClasses}>Conditions</div>
            <div className={cn(thClasses, "text-right")}>Actions</div>
          </div>

          {rows.length === 0 ? (
            <div
              ref={setBinRef}
              className="px-5 py-10 text-center font-body text-[12.5px] text-[#9C8C8C]"
            >
              Nothing on this page yet. Add a question, or drag one here from
              another page.
            </div>
          ) : (
            <SortableContext
              items={blocks.map((b) => sectionId(page, b.key))}
              strategy={verticalListSortingStrategy}
            >
              {blocks.map((block) => (
                <SortableSection
                  key={block.key}
                  page={page}
                  block={block}
                  busy={busy}
                >
                  {block.questions.map((q) => (
                    <SortableRow
                      key={q.id}
                      question={q}
                      busy={busy}
                      onToggleHidden={() =>
                        onToggleHidden(q.id, q.field_label, !q.hidden)
                      }
                      onDelete={() => onDeleteQuestion(q.id, q.field_label)}
                    />
                  ))}
                </SortableSection>
              ))}
            </SortableContext>
          )}
        </div>
      </div>

      {/* The agency asked for the button here rather than up in the header:
          "an add question button at the bottom of each page list". It takes
          its own page number with it, so the form opens on page 4 when it was
          clicked under Page 4. */}
      <div className="border-t border-[#F1E8E8] px-5 py-3.5">
        <Link
          href={`/admin/intake-questions/new?page=${page}`}
          title={`Add a question to ${title || `page ${position}`}`}
          className={addLinkClasses}
        >
          <Plus strokeWidth={1.5} className="h-3.5 w-3.5" />
          Add question
        </Link>
      </div>
    </div>
  );
}
