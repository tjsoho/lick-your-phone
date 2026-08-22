"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addInternalNote } from "@/server-actions/proposals";
import { formatDate } from "@/lib/format";
import toast from "react-hot-toast";
import { Loader2, Plus } from "lucide-react";

const EASE = "ease-brand";

type Note = {
  id: string;
  content: string;
  created_at: string;
};

export default function ProposalInternalNotes({
  proposalId,
  initialNotes = [],
}: {
  proposalId: string;
  initialNotes?: Note[];
}) {
  const router = useRouter();
  const [notes, setNotes] = useState<Note[]>(initialNotes);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;

    setSubmitting(true);
    const { data, error } = await addInternalNote(proposalId, content);
    setSubmitting(false);

    if (error) {
      toast.error(error);
      return;
    }

    if (data) {
      setNotes((prev) => [...prev, data]);
      setContent("");
      toast.success("Note added");
      router.refresh();
    }
  }

  return (
    <div className="space-y-5">
      {notes.length > 0 ? (
        <ul className="space-y-3.5">
          {notes.map((note) => (
            <li
              key={note.id}
              className="border-l border-lyp-cherry/20 pl-4 font-body"
            >
              <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-lyp-black">
                {note.content}
              </p>
              <p className="mt-1.5 text-[11px] tabular-nums text-[#C3B5B5]">
                {formatDate(note.created_at)}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="font-body text-[13px] text-[#A89898]">
          No internal notes yet.
        </p>
      )}

      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-2.5 sm:flex-row sm:items-center"
      >
        <label htmlFor="internal-note" className="sr-only">
          Add an internal note
        </label>
        <input
          id="internal-note"
          type="text"
          placeholder="Add an internal note…"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className={`w-full flex-1 rounded-2xl border border-[#EFE6E6] bg-[#FBF8F8] px-4 py-2.5 font-body text-[13px] text-lyp-black outline-none transition-all duration-500 ${EASE} placeholder:text-[#C3B5B5] focus:border-lyp-cherry/30 focus:bg-lyp-white focus:shadow-[0_0_0_4px_rgba(178,38,38,0.07)] disabled:opacity-50`}
          disabled={submitting}
        />
        <button
          type="submit"
          disabled={submitting || !content.trim()}
          className={`group inline-flex flex-shrink-0 items-center justify-center gap-3 self-start rounded-full bg-lyp-cherry py-1.5 pl-5 pr-1.5 font-body text-[13px] font-semibold tracking-wide text-lyp-white shadow-[0_10px_30px_-10px_rgba(178,38,38,0.5)] transition-all duration-500 ${EASE} hover:bg-[#c22e2e] active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none sm:self-auto`}
        >
          {submitting ? "Adding" : "Add Note"}
          <span
            className={`flex h-8 w-8 items-center justify-center rounded-full bg-lyp-white/15 transition-transform duration-500 ${EASE} group-hover:scale-105`}
          >
            {submitting ? (
              <Loader2 strokeWidth={1.5} className="h-4 w-4 animate-spin" />
            ) : (
              <Plus strokeWidth={1.5} className="h-4 w-4" />
            )}
          </span>
        </button>
      </form>
    </div>
  );
}
